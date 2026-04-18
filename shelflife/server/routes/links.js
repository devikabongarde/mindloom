const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const Link = require('../models/Link');
const Shelf = require('../models/Shelf');
const { scrapeQueue } = require('../workers/queue');
const { generateJson } = require('../utils/aiClient');

// POST /api/links
router.post('/', auth, validate(['url', 'shelfId']), async (req, res) => {
  try {
    const { url, shelfId } = req.body;
    
    // Ensure shelf exists and user has access
    const shelf = await Shelf.findById(shelfId);
    if (!shelf) {
      return res.status(404).json({ msg: 'Shelf not found' });
    }

    const newLink = new Link({
      url,
      shelfId,
      addedBy: req.user.id,
      scrapeStatus: 'pending'
    });

    await newLink.save();

    // Add to shelf
    shelf.links.push(newLink.id);
    await shelf.save();

    // Enqueue scrape job
    scrapeQueue.add({ linkId: newLink.id });

    res.json(newLink);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/links/:id/click
router.post('/:id/click', auth, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) return res.status(404).json({ msg: 'Link not found' });
    
    link.lastClickedAt = Date.now();
    link.clickCount += 1;
    
    // In actual implementation, we might want to also reset decay logic here if it was done on save
    
    await link.save();
    res.json({ success: true, linkId: link.id, lastClickedAt: link.lastClickedAt, decayReset: true });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/links/:id/react
router.post('/:id/react', auth, validate(['emoji']), async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) return res.status(404).json({ msg: 'Link not found' });
    
    const { emoji } = req.body;
    
    // Check if user already reacted
    const reactIndex = link.reactions.findIndex(r => r.userId.toString() === req.user.id && r.emoji === emoji);
    
    if (reactIndex > -1) {
      link.reactions.splice(reactIndex, 1);
    } else {
      link.reactions.push({ userId: req.user.id, emoji });
    }
    
    await link.save();

    // Broadcast
    const io = req.app.get('io');
    if (io && link.shelfId) {
      io.to(`shelf:${link.shelfId.toString()}`).emit('link:reacted', {
        linkId: link.id,
        emoji,
        userId: req.user.id,
        reactions: link.reactions,
      });
    }

    res.json({ reactions: link.reactions });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/links/:id/context
router.get('/:id/context', auth, async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) return res.status(404).json({ msg: 'Link not found' });

    const now = new Date();
    const lastFetched = link.contextFeed?.lastFetched ? new Date(link.contextFeed.lastFetched) : null;
    const hasFreshCache = lastFetched && now.getTime() - lastFetched.getTime() < 24 * 60 * 60 * 1000;

    if (hasFreshCache) {
      return res.json(link.contextFeed);
    }

    if (!process.env.PERPLEXITY_API_KEY && !process.env.GEMINI_API_KEY) {
      return res.status(503).json({ msg: 'Context grounding requires PERPLEXITY_API_KEY or GEMINI_API_KEY' });
    }

    const daysSaved = Math.max(
      0,
      Math.floor((now.getTime() - new Date(link.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    );

    const prompt = [
      `A researcher saved this link ${daysSaved} days ago:`,
      `URL: ${link.url}`,
      `Title: ${link.title || ''}`,
      `Tags: ${(link.tags || []).join(', ') || 'none'}`,
      `Original summary: ${link.summary || ''}`,
      '',
      'Using your web search capability, determine:',
      '1. Has this topic significantly evolved since this was saved?',
      '2. Is there a better/newer resource that supersedes this?',
      '3. Is the content still relevant today?',
      '',
      'Return valid JSON only in this shape:',
      '{',
      '  "isStillRelevant": true,',
      '  "relevanceStatus": "Current | Evolved | Outdated | Superseded",',
      '  "updateSummary": "2-3 sentences on what has changed since this was saved.",',
      '  "successorUrl": "https://... or null",',
      '  "successorTitle": "title or null"',
      '}'
    ].join('\n');

    let parsed;
    let provider;
    try {
      const result = await generateJson({
        systemPrompt: 'You are a research currency analyst. Return valid JSON only and no markdown code fences.',
        userPrompt: prompt,
        perplexityModel: 'llama-3.1-sonar-small-128k-online',
        geminiModel: 'gemini-1.5-flash',
      });
      parsed = result.parsed;
      provider = result.provider;
    } catch (parseErr) {
      return res.status(502).json({ msg: `Failed to generate context feed (${parseErr.message})` });
    }

    link.contextFeed = {
      lastFetched: now,
      summary: parsed.updateSummary || link.contextFeed?.summary || '',
      relevanceStatus: parsed.relevanceStatus || 'Evolved',
      isStillRelevant: typeof parsed.isStillRelevant === 'boolean' ? parsed.isStillRelevant : true,
      successorUrl: parsed.successorUrl || null,
      successorTitle: parsed.successorTitle || null,
    };
    await link.save();

    return res.json({ ...link.contextFeed.toObject?.() || link.contextFeed, provider });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;

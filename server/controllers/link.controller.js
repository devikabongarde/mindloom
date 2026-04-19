import Link from '../models/Link.js';
import Shelf from '../models/Shelf.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { enrichUrlWithAI, classifyVibes } from '../services/ai.service.js';

// Helper: compute decay status from lastClickedAt
function computeStatus(lastClickedAt) {
  const minutesIdle = (Date.now() - new Date(lastClickedAt)) / 1000 / 60;
  if (minutesIdle < 10) return { status: 'fresh', minutesIdle: Math.floor(minutesIdle) };
  if (minutesIdle < 30) return { status: 'aging', minutesIdle: Math.floor(minutesIdle) };
  return { status: 'dead', minutesIdle: Math.floor(minutesIdle) };
}

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/https?:\/\//g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemToken(token) {
  if (token.length > 5 && token.endsWith('ing')) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith('ed')) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1);
  return token;
}

function tokenize(value = '') {
  return normalizeText(value)
    .split(' ')
    .map((t) => stemToken(t.trim()))
    .filter((t) => t.length > 1);
}

const SYNONYM_MAP = {
  ai: ['artificial', 'intelligence', 'llm', 'machine', 'learning'],
  coding: ['programming', 'development', 'software', 'code'],
  code: ['programming', 'development', 'software', 'coding'],
  design: ['ux', 'ui', 'interface', 'visual', 'creative'],
  productivity: ['workflow', 'focus', 'efficiency', 'habit'],
  startup: ['business', 'product', 'growth', 'founder'],
  research: ['study', 'paper', 'analysis', 'insight'],
  tutorial: ['guide', 'howto', 'walkthrough', 'learn'],
};

function expandQueryTokens(tokens) {
  const out = new Set(tokens);
  tokens.forEach((token) => {
    const related = SYNONYM_MAP[token] || [];
    related.forEach((r) => out.add(stemToken(r)));
  });
  return [...out];
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const [term, weightA] of vecA.entries()) {
    const weightB = vecB.get(term) || 0;
    dot += weightA * weightB;
    magA += weightA * weightA;
  }

  for (const weightB of vecB.values()) {
    magB += weightB * weightB;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function weightedTermVector(linkObj) {
  const vec = new Map();
  const add = (tokens, weight) => {
    tokens.forEach((token) => {
      vec.set(token, (vec.get(token) || 0) + weight);
    });
  };

  add(tokenize(linkObj.title || ''), 3);
  add(tokenize(linkObj.summary || ''), 2);
  add(tokenize((linkObj.vibes || []).join(' ')), 2);
  add(tokenize(linkObj.url || ''), 1);
  return vec;
}

function applyIdf(termVec, idfMap) {
  const out = new Map();
  for (const [term, tf] of termVec.entries()) {
    out.set(term, tf * (idfMap.get(term) || 1));
  }
  return out;
}

export const searchShelfLinks = async (req, res) => {
  try {
    const { shelfId, q } = req.query;
    const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit || '8', 10)));

    if (!shelfId || !q) {
      return res.status(400).json({ message: 'shelfId and q are required' });
    }

    const queryText = String(q).trim();
    if (!queryText) return res.json([]);

    const links = await Link.find({ shelfId }).sort({ createdAt: -1 }).limit(300).populate('addedBy', 'name');
    if (links.length === 0) return res.json([]);

    const queryTokens = tokenize(queryText);
    const expandedQueryTokens = expandQueryTokens(queryTokens);
    if (expandedQueryTokens.length === 0) return res.json([]);

    const rawLinkVectors = links.map((link) => weightedTermVector(link.toObject()));

    // Build document frequencies for IDF.
    const df = new Map();
    rawLinkVectors.forEach((vec) => {
      for (const term of vec.keys()) {
        df.set(term, (df.get(term) || 0) + 1);
      }
    });

    const docCount = rawLinkVectors.length;
    const idfMap = new Map();
    for (const [term, freq] of df.entries()) {
      idfMap.set(term, Math.log((docCount + 1) / (freq + 1)) + 1);
    }

    const queryVec = new Map();
    expandedQueryTokens.forEach((token) => {
      queryVec.set(token, (queryVec.get(token) || 0) + 1.5);
    });
    const weightedQueryVec = applyIdf(queryVec, idfMap);

    const phrase = normalizeText(queryText);

    const scored = links.map((link, index) => {
      const obj = link.toObject();
      const vector = applyIdf(rawLinkVectors[index], idfMap);
      const cosine = cosineSimilarity(weightedQueryVec, vector);

      const titleText = normalizeText(obj.title || '');
      const summaryText = normalizeText(obj.summary || '');
      const urlText = normalizeText(obj.url || '');

      let bonus = 0;
      if (phrase && titleText.includes(phrase)) bonus += 0.28;
      if (phrase && summaryText.includes(phrase)) bonus += 0.2;
      if (phrase && urlText.includes(phrase)) bonus += 0.1;

      expandedQueryTokens.forEach((token) => {
        if (titleText.includes(token)) bonus += 0.03;
        if (summaryText.includes(token)) bonus += 0.02;
      });

      const minutesIdle = computeStatus(obj.lastClickedAt).minutesIdle;
      const recencyBoost = Math.max(0, 0.08 - Math.min(minutesIdle, 240) / 4000);

      const score = cosine + bonus + recencyBoost;
      return {
        ...obj,
        ...computeStatus(obj.lastClickedAt),
        _score: score,
      };
    });

    const result = scored
      .filter((item) => item._score > 0.06)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    res.json(result);
  } catch (err) {
    console.error('searchShelfLinks error:', err.message);
    res.status(500).json({ message: 'Server error searching links' });
  }
};

export const createLink = async (req, res) => {
  try {
    const { shelfId, url, mode = 'url' } = req.body;
    if (!shelfId || !url)
      return res.status(400).json({ message: 'shelfId and url are required' });

    const io = req.app.get('io');

    if (mode === 'url') {
      const tempLink = await Link.create({
        shelfId, addedBy: req.user.id, url, title: url,
        summary: '', vibes: [], status: 'fresh', lastClickedAt: new Date(),
      });

      if (io) io.to(shelfId).emit('link-created', tempLink);
      res.status(201).json(tempLink);

      try {
        const ai = await enrichUrlWithAI(url, tempLink._id.toString());
        tempLink.title      = ai.title;
        tempLink.summary    = ai.summary;
        tempLink.vibes      = ai.vibes;
        tempLink.screenshot = ai.screenshotUrl;
        await tempLink.save();

        const statsUpdate = {};
        ai.vibes.forEach((v) => { 
          const vibeKey = v.replace(/[^a-zA-Z]/g, ''); // Remove all non-letters
          if (vibeKey) {
            statsUpdate[`vibeStats.${vibeKey}`] = 1;
          }
        });
        
        if (Object.keys(statsUpdate).length > 0) {
          await User.findByIdAndUpdate(req.user.id, { $inc: statsUpdate });
        }

        if (io) io.to(shelfId).emit('link-enriched', tempLink.toObject());
      } catch (enrichErr) {
        console.error('Async enrichment error:', enrichErr.message);
        console.error('Stack:', enrichErr.stack);
      }
      return;
    }

    const link = await Link.create({
      shelfId, addedBy: req.user.id, url,
      title: req.body.title || url, summary: '', vibes: [],
      status: 'fresh', lastClickedAt: new Date(),
    });
    if (io) io.to(shelfId).emit('link-created', link);
    res.status(201).json(link);
  } catch (err) {
    console.error('createLink error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Server error creating link', error: err.message });
  }
};

export const getShelfLinks = async (req, res) => {
  try {
    const links = await Link.find({ shelfId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('addedBy', 'name')
      .populate('suggestions.userId', 'name');
    const enriched = links.map((link) => {
      const l = link.toObject();
      Object.assign(l, computeStatus(l.lastClickedAt));
      return l;
    });
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching links' });
  }
};

export const getCompostLinks = async (req, res) => {
  try {
    const links = await Link.find({ shelfId: req.params.shelfId })
      .sort({ lastClickedAt: 1 }).populate('addedBy', 'name');
    const dead = links
      .map((link) => { const l = link.toObject(); Object.assign(l, computeStatus(l.lastClickedAt)); return l; })
      .filter((l) => l.status === 'dead');
    res.json(dead);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching compost' });
  }
};

export const clickLink = async (req, res) => {
  try {
    const link = await Link.findByIdAndUpdate(
      req.params.id, { lastClickedAt: new Date() }, { new: true }
    );
    if (!link) return res.status(404).json({ message: 'Link not found' });
    res.json({ ...link.toObject(), status: 'fresh', minutesIdle: 0 });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/links/:id/react — toggle emoji reaction
export const reactToLink = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'emoji is required' });

    const link = await Link.findById(req.params.id);
    if (!link) return res.status(404).json({ message: 'Link not found' });

    const userId = req.user.id;
    const existingIdx = link.reactions.findIndex(
      (r) => r.userId.toString() === userId && r.emoji === emoji
    );

    if (existingIdx !== -1) {
      // Toggle off — remove reaction
      link.reactions.splice(existingIdx, 1);
    } else {
      link.reactions.push({ userId, emoji });

      if (String(link.addedBy) !== String(userId)) {
        const actor = await User.findById(req.user.id).select('name').lean();
        await Notification.create({
          userId: link.addedBy,
          actorId: req.user.id,
          type: 'link_reacted',
          title: 'Link got a reaction',
          message: `${actor?.name || 'Someone'} reacted ${emoji} to "${link.title || 'a link'}"`,
          meta: { linkId: link._id, shelfId: link.shelfId, emoji },
          isRead: false,
        });
      }
    }

    await link.save();

    const io = req.app.get('io');
    if (io) {
      io.to(link.shelfId.toString()).emit('reaction-update', {
        linkId: link._id,
        reactions: link.reactions,
      });
    }

    res.json({ reactions: link.reactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error reacting to link' });
  }
};

// DELETE /api/links/:id
export const deleteLink = async (req, res) => {
  try {
    const link = await Link.findById(req.params.id);
    if (!link) return res.status(404).json({ message: 'Link not found' });

    const shelf = await Shelf.findById(link.shelfId).select('ownerId');
    const isShelfOwner = String(shelf?.ownerId || '') === String(req.user.id);
    const isLinkCreator = String(link.addedBy) === String(req.user.id);

    if (!isShelfOwner && !isLinkCreator) {
      return res.status(403).json({ message: 'Only the shelf owner or link creator can delete this link' });
    }

    await Link.deleteOne({ _id: link._id });
    res.json({ _id: link._id, deleted: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting link' });
  }
};

// GET /api/links/:id/suggestions
export const getLinkSuggestions = async (req, res) => {
  try {
    const link = await Link.findById(req.params.id)
      .select('suggestions')
      .populate('suggestions.userId', 'name');
    if (!link) return res.status(404).json({ message: 'Link not found' });

    const suggestions = (link.suggestions || []).map((item) => ({
      _id: item._id,
      type: item.type || 'comment',
      text: item.text,
      url: item.url || null,
      createdAt: item.createdAt,
      user: {
        _id: item.userId?._id || null,
        name: item.userId?.name || 'Unknown',
      },
    }));

    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching link suggestions' });
  }
};

// POST /api/links/:id/suggestions
export const addLinkSuggestion = async (req, res) => {
  try {
    const type = req.body?.type === 'link' ? 'link' : 'comment';
    const text = String(req.body?.text || '').trim();
    const rawUrl = String(req.body?.url || '').trim();

    let finalUrl = null;
    let finalText = text;

    if (type === 'link') {
      if (!rawUrl) {
        return res.status(400).json({ message: 'Link URL is required' });
      }
      finalUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
      try {
        // Validate URL shape
        // eslint-disable-next-line no-new
        new URL(finalUrl);
      } catch {
        return res.status(400).json({ message: 'Please provide a valid URL' });
      }

      finalText = text || finalUrl;
    } else {
      if (!text) return res.status(400).json({ message: 'Suggestion text is required' });
    }

    if (finalText.length > 300) return res.status(400).json({ message: 'Suggestion must be 300 characters or fewer' });

    const link = await Link.findById(req.params.id).select('shelfId suggestions');
    if (!link) return res.status(404).json({ message: 'Link not found' });

    link.suggestions.push({ userId: req.user.id, type, text: finalText, url: finalUrl, createdAt: new Date() });
    await link.save();

    const fresh = await Link.findById(req.params.id)
      .select('shelfId suggestions')
      .populate('suggestions.userId', 'name');

    const latest = fresh.suggestions[fresh.suggestions.length - 1];
    const payload = {
      _id: latest._id,
      type: latest.type || 'comment',
      text: latest.text,
      url: latest.url || null,
      createdAt: latest.createdAt,
      user: {
        _id: latest.userId?._id || null,
        name: latest.userId?.name || 'Unknown',
      },
    };

    if (String(fresh.addedBy) !== String(req.user.id)) {
      const actor = await User.findById(req.user.id).select('name').lean();
      await Notification.create({
        userId: fresh.addedBy,
        actorId: req.user.id,
        type: latest.type === 'link' ? 'link_reference' : 'link_comment',
        title: latest.type === 'link' ? 'New linked reference' : 'New link comment',
        message: latest.type === 'link'
          ? `${actor?.name || 'Someone'} linked a reference to "${fresh.title || 'your link'}"`
          : `${actor?.name || 'Someone'} commented on "${fresh.title || 'your link'}"`,
        meta: { linkId: fresh._id, shelfId: fresh.shelfId, suggestionId: latest._id },
        isRead: false,
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(String(fresh.shelfId)).emit('suggestion-update', {
        linkId: req.params.id,
        suggestion: payload,
      });
    }

    res.status(201).json(payload);
  } catch (err) {
    res.status(500).json({ message: 'Server error adding suggestion' });
  }
};

// DELETE /api/links/:id/suggestions/:suggestionId
export const deleteLinkSuggestion = async (req, res) => {
  try {
    const { id, suggestionId } = req.params;

    const link = await Link.findById(id).select('shelfId suggestions');
    if (!link) return res.status(404).json({ message: 'Link not found' });

    const suggestion = (link.suggestions || []).find((item) => String(item._id) === String(suggestionId));
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    const shelf = await Shelf.findById(link.shelfId).select('ownerId');
    const isShelfOwner = String(shelf?.ownerId || '') === String(req.user.id);
    const isSuggestionOwner = String(suggestion.userId || '') === String(req.user.id);

    if (!isShelfOwner && !isSuggestionOwner) {
      return res.status(403).json({ message: 'Only the suggestion owner or shelf owner can delete this entry' });
    }

    link.suggestions = (link.suggestions || []).filter((item) => String(item._id) !== String(suggestionId));
    await link.save();

    const io = req.app.get('io');
    if (io) {
      io.to(String(link.shelfId)).emit('suggestion-delete', {
        linkId: id,
        suggestionId,
      });
    }

    res.json({ suggestionId, deleted: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting suggestion' });
  }
};

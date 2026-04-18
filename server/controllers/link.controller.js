import Link from '../models/Link.js';
import User from '../models/User.js';
import { enrichUrlWithAI, classifyVibes } from '../services/ai.service.js';

// Helper: compute decay status from lastClickedAt
function computeStatus(lastClickedAt) {
  const minutesIdle = (Date.now() - new Date(lastClickedAt)) / 1000 / 60;
  if (minutesIdle < 1) return { status: 'fresh', minutesIdle: Math.floor(minutesIdle) };
  if (minutesIdle < 2) return { status: 'aging', minutesIdle: Math.floor(minutesIdle) };
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
        ai.vibes.forEach((v) => { statsUpdate[`vibeStats.${v.replace('-', '')}`] = 1; });
        await User.findByIdAndUpdate(req.user.id, { $inc: statsUpdate });

        if (io) io.to(shelfId).emit('link-enriched', tempLink.toObject());
      } catch (enrichErr) {
        console.error('Async enrichment error:', enrichErr.message);
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
    res.status(500).json({ message: 'Server error creating link' });
  }
};

export const getShelfLinks = async (req, res) => {
  try {
    const links = await Link.find({ shelfId: req.params.id })
      .sort({ createdAt: -1 }).populate('addedBy', 'name');
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

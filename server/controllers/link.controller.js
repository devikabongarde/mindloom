import Link from '../models/Link.js';
import User from '../models/User.js';
import { summarizeUrl, classifyVibes } from '../services/ai.service.js';

// Helper: compute decay status from lastClickedAt
function computeStatus(lastClickedAt) {
  const minutesIdle = (Date.now() - new Date(lastClickedAt)) / 1000 / 60;
  let status;
  // Test mode: ages after 1 minute, dies after 2 minutes
  if (minutesIdle < 1) status = 'fresh';
  else if (minutesIdle < 2) status = 'aging';
  else status = 'dead';
  return { status, minutesIdle: Math.floor(minutesIdle) };
}

export const createLink = async (req, res) => {
  try {
    const { shelfId, url, mode = 'url' } = req.body;
    if (!shelfId || !url)
      return res.status(400).json({ message: 'shelfId and url are required' });

    let title = url;
    let summary = '';
    let vibes = ['Educational'];

    if (mode === 'url') {
      const ai = await summarizeUrl(url);
      title = ai.title;
      summary = ai.summary;
      vibes = await classifyVibes(summary);
    } else if (mode === 'raw') {
      title = req.body.title || url;
    }

    const link = await Link.create({
      shelfId,
      addedBy: req.user.id,
      url,
      title,
      summary,
      vibes,
      status: 'fresh',
      lastClickedAt: new Date(),
    });

    // Update user vibeStats
    const statsUpdate = {};
    vibes.forEach((vibe) => {
      const key = vibe.replace('-', '');
      statsUpdate[`vibeStats.${key}`] = 1;
    });
    await User.findByIdAndUpdate(req.user.id, { $inc: statsUpdate });

    // Emit real-time event to all clients on this shelf
    const io = req.app.get('io');
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
      .sort({ createdAt: -1 })
      .populate('addedBy', 'name');

    const enriched = links.map((link) => {
      const l = link.toObject();
      const { status, minutesIdle } = computeStatus(l.lastClickedAt);
      l.status = status;
      l.minutesIdle = minutesIdle;
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
      .sort({ lastClickedAt: 1 })
      .populate('addedBy', 'name');

    const dead = links
      .map((link) => {
        const l = link.toObject();
        const { status, minutesIdle } = computeStatus(l.lastClickedAt);
        l.status = status;
        l.minutesIdle = minutesIdle;
        return l;
      })
      .filter((l) => l.status === 'dead');

    res.json(dead);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching compost' });
  }
};

export const clickLink = async (req, res) => {
  try {
    const link = await Link.findByIdAndUpdate(
      req.params.id,
      { lastClickedAt: new Date() },
      { new: true }
    );
    if (!link) return res.status(404).json({ message: 'Link not found' });
    res.json({ ...link.toObject(), status: 'fresh', minutesIdle: 0 });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

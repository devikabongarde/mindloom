import Link from '../models/Link.js';
import User from '../models/User.js';
import { enrichUrlWithAI, classifyVibes } from '../services/ai.service.js';

// Helper: compute decay status from lastClickedAt
function computeStatus(lastClickedAt) {
  const minutesIdle = (Date.now() - new Date(lastClickedAt)) / 1000 / 60;
  // Test mode: ages after 1 minute, dies after 2 minutes
  if (minutesIdle < 1) return { status: 'fresh', minutesIdle: Math.floor(minutesIdle) };
  if (minutesIdle < 2) return { status: 'aging', minutesIdle: Math.floor(minutesIdle) };
  return { status: 'dead', minutesIdle: Math.floor(minutesIdle) };
}

export const createLink = async (req, res) => {
  try {
    const { shelfId, url, mode = 'url' } = req.body;
    if (!shelfId || !url)
      return res.status(400).json({ message: 'shelfId and url are required' });

    const io = req.app.get('io');

    if (mode === 'url') {
      // Step 1: Create a stub link immediately to get a real _id for screenshot naming
      const tempLink = await Link.create({
        shelfId,
        addedBy:       req.user.id,
        url,
        title:         url,
        summary:       '',
        vibes:         [],
        status:        'fresh',
        lastClickedAt: new Date(),
      });

      // Emit placeholder immediately so the other room members see something appear
      if (io) io.to(shelfId).emit('link-created', tempLink);
      res.status(201).json(tempLink);

      // Step 2: Run the full pipeline asynchronously (non-blocking response)
      try {
        const ai = await enrichUrlWithAI(url, tempLink._id.toString());
        const vibes = await classifyVibes(ai.summary);

        tempLink.title      = ai.title;
        tempLink.summary    = ai.summary;
        tempLink.vibes      = vibes;
        tempLink.screenshot = ai.screenshotUrl;
        await tempLink.save();

        // Update vibeStats on user
        const statsUpdate = {};
        vibes.forEach((v) => { statsUpdate[`vibeStats.${v.replace('-', '')}`] = 1; });
        await User.findByIdAndUpdate(req.user.id, { $inc: statsUpdate });

        // Emit enriched update so clients can refresh the card
        if (io) io.to(shelfId).emit('link-enriched', tempLink.toObject());
      } catch (enrichErr) {
        console.error('Async enrichment error:', enrichErr.message);
      }

      return; // response already sent above
    }

    // mode === 'raw'
    const link = await Link.create({
      shelfId,
      addedBy:       req.user.id,
      url,
      title:         req.body.title || url,
      summary:       '',
      vibes:         [],
      status:        'fresh',
      lastClickedAt: new Date(),
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

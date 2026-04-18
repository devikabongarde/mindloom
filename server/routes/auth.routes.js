import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import User from '../models/User.js';
import Shelf from '../models/Shelf.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { computeArchetype } from '../utils/curator.util.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    // Auto-create a personal shelf for every new user
    const shelf = await Shelf.create({
      name: `${user.name}'s Shelf`,
      ownerId: user._id,
      members: [user._id],
      isPublic: false,
      weather: 'Foggy',
    });

    user.defaultShelfId = shelf._id;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        defaultShelfId: user.defaultShelfId,
        vibeStats: user.vibeStats,
        curatorArchetype: computeArchetype(user.vibeStats),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        defaultShelfId: user.defaultShelfId,
        vibeStats: user.vibeStats,
        curatorArchetype: computeArchetype(user.vibeStats),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me — protected
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      defaultShelfId: user.defaultShelfId,
      vibeStats: user.vibeStats,
      curatorArchetype: computeArchetype(user.vibeStats),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/auth/me — update defaultShelfId (or other safe fields)
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { defaultShelfId } = req.body;
    const update = {};
    if (defaultShelfId) update.defaultShelfId = defaultShelfId;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-passwordHash');
    res.json({
      _id: user._id, name: user.name, email: user.email,
      defaultShelfId: user.defaultShelfId,
      vibeStats: user.vibeStats,
      curatorArchetype: computeArchetype(user.vibeStats),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

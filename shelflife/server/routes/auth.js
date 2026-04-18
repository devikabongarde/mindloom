const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const VIBE_COLORS = ['#00FF9C', '#4FC3F7', '#FF6B35', '#9C27B0', '#FF80AB', '#B0BEC5', '#FFEB3B', '#F44336'];

// POST /api/auth/register
router.post('/register', validate(['username', 'email', 'password']), async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Pick random avatar color
    const avatarColor = VIBE_COLORS[Math.floor(Math.random() * VIBE_COLORS.length)];

    user = new User({
      username,
      email,
      passwordHash,
      avatarColor,
      curatorArchetype: {
        title: "The Novice Collector",
        description: "Your shelf is empty. Begin the curation.",
        dominantVibe: "None",
        updatedAt: new Date()
      }
    });

    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, username, email, avatarColor } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/auth/login
router.post('/login', validate(['email', 'password']), async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, username: user.username, email, avatarColor: user.avatarColor } });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

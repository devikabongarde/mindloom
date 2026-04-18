const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users/me/archetype
router.get('/me/archetype', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('curatorArchetype');
    res.json(user.curatorArchetype);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/users/:username
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username avatarColor curatorArchetype')
      .populate('shelves', 'name isPublic');
      
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // For privacy, only send count of links or public shelves
    const publicShelvesCount = user.shelves.filter(s => s.isPublic).length;

    res.json({
      username: user.username,
      avatarColor: user.avatarColor,
      curatorArchetype: user.curatorArchetype,
      publicShelvesCount,
      totalShelves: user.shelves.length
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

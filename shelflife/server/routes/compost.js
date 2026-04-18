const express = require('express');
const router = express.Router();
const Compost = require('../models/Compost');

// GET /api/compost/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalDead, vibeAgg] = await Promise.all([
      Compost.countDocuments(),
      Compost.aggregate([
        { $group: { _id: '$vibeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
    ]);

    res.json({
      totalDead,
      mostCommonVibe: vibeAgg[0]?._id || null,
      mostCommonVibeCount: vibeAgg[0]?.count || 0,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/compost
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const items = await Compost.find()
      .sort({ diedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Compost.countDocuments();

    res.json({
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;

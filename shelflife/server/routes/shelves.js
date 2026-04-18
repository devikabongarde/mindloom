const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const Shelf = require('../models/Shelf');
const User = require('../models/User');
const Lineage = require('../models/Lineage');

function createSlug(baseName) {
  return `${baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;
}

// POST /api/shelves
router.post('/', auth, validate(['name']), async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substr(2, 5);

    const shelf = new Shelf({
      name,
      description,
      slug,
      owners: [req.user.id],
      isPublic: isPublic || false,
    });

    await shelf.save();

    // Add to user
    await User.findByIdAndUpdate(req.user.id, { $push: { shelves: shelf.id } });

    res.json(shelf);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/shelves
router.get('/', auth, async (req, res) => {
  try {
    const shelves = await Shelf.find({ owners: req.user.id }).sort({ updatedAt: -1 });
    res.json(shelves);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// POST /api/shelves/:id/remix
router.post('/:id/remix', auth, async (req, res) => {
  try {
    const sourceShelf = await Shelf.findById(req.params.id).populate('owners', 'username');
    if (!sourceShelf) {
      return res.status(404).json({ msg: 'Shelf not found' });
    }

    const userOwnsSource = sourceShelf.owners.some((owner) => owner._id.toString() === req.user.id);
    if (!sourceShelf.isPublic && !userOwnsSource) {
      return res.status(403).json({ msg: 'Not authorized to remix this shelf' });
    }

    const remixShelf = new Shelf({
      name: `${sourceShelf.name} (Remix)`,
      description: sourceShelf.description || `Remix of ${sourceShelf.name}`,
      slug: createSlug(`${sourceShelf.name}-remix`),
      owners: [req.user.id],
      isPublic: false,
      links: [...sourceShelf.links],
      weather: {
        state: 'Foggy',
        activityScore: 0,
        lastUpdated: new Date(),
      },
      lineage: {
        forkedFrom: sourceShelf._id,
        forkDepth: (sourceShelf.lineage?.forkDepth || 0) + 1,
        remixCount: 0,
      },
    });

    await remixShelf.save();

    await User.findByIdAndUpdate(req.user.id, { $addToSet: { shelves: remixShelf._id } });

    await Shelf.findByIdAndUpdate(sourceShelf._id, {
      $inc: { 'lineage.remixCount': 1 },
    });

    const originalShelfId = sourceShelf.lineage?.forkedFrom || sourceShelf._id;
    const currentUser = await User.findById(req.user.id).select('username');

    await Lineage.findOneAndUpdate(
      { originalShelfId },
      {
        $setOnInsert: { originalShelfId },
        $inc: { totalRemixes: 1 },
        $push: {
          forkChain: {
            shelfId: remixShelf._id,
            shelfName: remixShelf.name,
            ownerUsername: currentUser?.username || 'unknown',
            forkedAt: new Date(),
            linkCountAtFork: sourceShelf.links.length,
          },
        },
      },
      { upsert: true, new: true }
    );

    res.json(remixShelf);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// GET /api/shelves/:id/lineage
router.get('/:id/lineage', async (req, res) => {
  try {
    const shelf = await Shelf.findById(req.params.id).select('_id lineage name');
    if (!shelf) {
      return res.status(404).json({ msg: 'Shelf not found' });
    }

    const originalShelfId = shelf.lineage?.forkedFrom || shelf._id;
    const lineage = await Lineage.findOne({ originalShelfId }).populate('forkChain.shelfId', 'name owners createdAt');

    if (!lineage) {
      return res.json({
        originalShelfId,
        forkChain: [],
        totalRemixes: 0,
      });
    }

    res.json(lineage);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shelf not found' });
    }
    res.status(500).send('Server Error');
  }
});

// GET /api/shelves/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const shelf = await Shelf.findById(req.params.id).populate({
      path: 'owners',
      select: 'username avatarColor'
    }).populate({
      path: 'links',
      match: { isDead: false }, // Only get alive links
      options: { sort: { createdAt: -1 } }
    });

    if (!shelf) {
      return res.status(404).json({ msg: 'Shelf not found' });
    }

    // Check if public or owned
    if (!shelf.isPublic && !shelf.owners.some(o => o._id.toString() === req.user.id)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    res.json(shelf);
  } catch (err) {
    console.error(err.message);
    if(err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shelf not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;

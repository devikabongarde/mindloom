import { Router } from 'express';
import Shelf from '../models/Shelf.js';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  createTeamShelf,
  getMyShelves,
  inviteMemberToShelf,
  acceptShelfInvite,
} from '../controllers/shelf.controller.js';

const router = Router();

// Team shelf actions
router.post('/team',          authMiddleware, createTeamShelf);
router.get('/mine',           authMiddleware, getMyShelves);
router.post('/invite',        authMiddleware, inviteMemberToShelf);
router.post('/invite/accept', authMiddleware, acceptShelfInvite);

// GET /api/shelves/:id — get shelf details with members populated
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const shelf = await Shelf.findById(req.params.id)
      .populate('ownerId', 'name email')
      .populate('members', 'name email');
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });
    res.json(shelf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/shelves — create a shelf (generic)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, isPublic, weather } = req.body;
    const shelf = await Shelf.create({
      name, ownerId: req.user.id, members: [req.user.id],
      isPublic: isPublic || false, weather: weather || 'Foggy',
    });
    res.status(201).json(shelf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

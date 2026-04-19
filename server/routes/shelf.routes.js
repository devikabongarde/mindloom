import { Router } from 'express';
import Shelf from '../models/Shelf.js';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  createTeamShelf,
  getMyShelves,
  inviteMemberToShelf,
  acceptShelfInvite,
  forkShelf,
  getShelfLineage,
  updateShelfVisibility,
  toggleShelfStar,
  deleteShelf,
  removeMemberFromShelf,
  getShelfMembers,
} from '../controllers/shelf.controller.js';

const router = Router();

// Named action routes MUST come before /:id wildcard
router.post('/team',          authMiddleware, createTeamShelf);
router.get('/mine',           authMiddleware, getMyShelves);
router.get('/discover',       authMiddleware, async (req, res) => {
  try {
    const publicShelves = await Shelf.find({ isPublic: true })
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(publicShelves);
  } catch (err) {
    console.error('Discover shelves error:', err.message);
    res.status(500).json({ message: 'Server error fetching public shelves' });
  }
});
router.post('/invite',        authMiddleware, inviteMemberToShelf);
router.post('/invite/accept', authMiddleware, acceptShelfInvite);
router.post('/fork',          authMiddleware, forkShelf);
router.post('/:id/star',       authMiddleware, toggleShelfStar);
router.get('/:id/members',     authMiddleware, getShelfMembers);
router.post('/:id/remove-member', authMiddleware, removeMemberFromShelf);
router.patch('/:id/visibility', authMiddleware, updateShelfVisibility);
router.patch('/:id/toggle-public', authMiddleware, updateShelfVisibility);
router.delete('/:id',           authMiddleware, deleteShelf);

// Parameterized routes
router.get('/:id/lineage',    authMiddleware, getShelfLineage);
router.get('/:id',            authMiddleware, async (req, res) => {
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

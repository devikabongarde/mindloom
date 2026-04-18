import crypto from 'crypto';
import Shelf from '../models/Shelf.js';
import User from '../models/User.js';
import ShelfInvite from '../models/ShelfInvite.js';

// POST /api/shelves/team
export const createTeamShelf = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const shelf = await Shelf.create({
      name,
      ownerId: req.user.id,
      members: [req.user.id],
      type: 'team',
      isPublic: false,
      weather: 'Foggy',
    });

    res.status(201).json(shelf);
  } catch (err) {
    res.status(500).json({ message: 'Server error creating team shelf' });
  }
};

// GET /api/shelves/mine
export const getMyShelves = async (req, res) => {
  try {
    const shelves = await Shelf.find({ members: req.user.id }).sort({ createdAt: -1 });
    res.json(shelves);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching shelves' });
  }
};

// POST /api/shelves/invite  — body: { shelfId, email }
export const inviteMemberToShelf = async (req, res) => {
  try {
    const { shelfId, email } = req.body;
    if (!shelfId || !email)
      return res.status(400).json({ message: 'shelfId and email are required' });

    const shelf = await Shelf.findById(shelfId);
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });
    if (shelf.ownerId.toString() !== req.user.id)
      return res.status(403).json({ message: 'Only the owner can invite' });

    const token = crypto.randomBytes(16).toString('hex');
    await ShelfInvite.create({ shelfId, email: email.toLowerCase(), token });

    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${token}`;
    res.json({ inviteUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error creating invite' });
  }
};

// POST /api/shelves/invite/accept  — body: { token }
export const acceptShelfInvite = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const invite = await ShelfInvite.findOne({ token });
    if (!invite) return res.status(404).json({ message: 'Invite not found or expired' });

    const shelf = await Shelf.findById(invite.shelfId);
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });

    if (!shelf.members.map(String).includes(req.user.id)) {
      shelf.members.push(req.user.id);
      await shelf.save();
    }

    // Single-use — delete after accept
    await ShelfInvite.deleteOne({ _id: invite._id });

    res.json({ shelfId: shelf._id, shelfName: shelf.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error accepting invite' });
  }
};

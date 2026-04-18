import crypto from 'crypto';
import Notification from '../models/Notification.js';
import Shelf from '../models/Shelf.js';
import ShelfComment from '../models/ShelfComment.js';
import Link from '../models/Link.js';
import ShelfInvite from '../models/ShelfInvite.js';
import User from '../models/User.js';

// POST /api/shelves/team
export const createTeamShelf = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const shelf = await Shelf.create({
      name, ownerId: req.user.id, members: [req.user.id],
      type: 'team', isPublic: false, weather: 'Foggy',
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

// POST /api/shelves/invite
export const inviteMemberToShelf = async (req, res) => {
  try {
    const { shelfId, email } = req.body;
    if (!shelfId || !email) return res.status(400).json({ message: 'shelfId and email are required' });
    const shelf = await Shelf.findById(shelfId);
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });
    if (shelf.ownerId.toString() !== req.user.id) return res.status(403).json({ message: 'Only the owner can invite' });
    const token = crypto.randomBytes(16).toString('hex');
    await ShelfInvite.create({ shelfId, email: email.toLowerCase(), token });
    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${token}`;
    res.json({ inviteUrl });
  } catch (err) {
    res.status(500).json({ message: 'Server error creating invite' });
  }
};

// POST /api/shelves/invite/accept
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
    await ShelfInvite.deleteOne({ _id: invite._id });
    res.json({ shelfId: shelf._id, shelfName: shelf.name });
  } catch (err) {
    res.status(500).json({ message: 'Server error accepting invite' });
  }
};

// POST /api/shelves/fork — body: { sourceShelfId, newName }
export const forkShelf = async (req, res) => {
  try {
    const { sourceShelfId, newName } = req.body;
    if (!sourceShelfId || !newName)
      return res.status(400).json({ message: 'sourceShelfId and newName required' });

    const source = await Shelf.findById(sourceShelfId);
    if (!source) return res.status(404).json({ message: 'Source shelf not found' });
    if (!source.isPublic && !source.members.map(String).includes(req.user.id))
      return res.status(403).json({ message: 'Cannot fork a private shelf you are not a member of' });

    // Create forked shelf with lineage pointer
    const forked = await Shelf.create({
      name: newName,
      ownerId: req.user.id,
      members: [req.user.id],
      type: 'team',
      isPublic: false,
      parentShelfId: sourceShelfId,
    });

    // Copy all links from source → forked shelf
    const sourceLinks = await Link.find({ shelfId: sourceShelfId }).lean();
    if (sourceLinks.length > 0) {
      const newLinks = sourceLinks.map(({ _id, __v, ...l }) => ({
        ...l,
        shelfId:       forked._id,
        addedBy:       req.user.id,
        lastClickedAt: new Date(),
        status:        'fresh',
        reactions:     [],
      }));
      await Link.insertMany(newLinks);
    }

    if (String(source.ownerId) !== String(req.user.id)) {
      const actor = await User.findById(req.user.id).select('name').lean();
      await Notification.create({
        userId: source.ownerId,
        actorId: req.user.id,
        type: 'shelf_forked',
        title: 'Your shelf was forked',
        message: `${actor?.name || 'Someone'} forked "${source.name}"`,
        meta: { sourceShelfId: source._id, forkedShelfId: forked._id },
        isRead: false,
      });
    }

    res.status(201).json(forked);
  } catch (err) {
    console.error('forkShelf error:', err.message);
    res.status(500).json({ message: 'Server error forking shelf' });
  }
};

// GET /api/shelves/:id/lineage
export const getShelfLineage = async (req, res) => {
  try {
    const current = await Shelf.findById(req.params.id)
      .populate('parentShelfId', 'name')
      .populate('ownerId', 'name')
      .lean();
    if (!current) return res.status(404).json({ message: 'Shelf not found' });

    const forks = await Shelf.find({ parentShelfId: req.params.id })
      .populate('ownerId', 'name')
      .lean();

    res.json({
      current: {
        _id:        current._id,
        name:       current.name,
        owner:      current.ownerId?.name,
        forkedFrom: current.parentShelfId ? {
          _id:  current.parentShelfId._id,
          name: current.parentShelfId.name,
        } : null,
      },
      forks:        forks.map((f) => ({ _id: f._id, name: f.name, owner: f.ownerId?.name })),
      totalRemixes: forks.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error getting lineage' });
  }
};

// PATCH /api/shelves/:id/visibility
export const updateShelfVisibility = async (req, res) => {
  try {
    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ message: 'isPublic (boolean) is required' });
    }

    const shelf = await Shelf.findById(req.params.id);
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });

    const isOwner = String(shelf.ownerId) === String(req.user.id);
    if (!isOwner) return res.status(403).json({ message: 'Only the shelf owner can change visibility' });

    shelf.isPublic = isPublic;
    await shelf.save();

    res.json({ _id: shelf._id, isPublic: shelf.isPublic });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating shelf visibility' });
  }
};

// DELETE /api/shelves/:id
export const deleteShelf = async (req, res) => {
  try {
    const shelf = await Shelf.findById(req.params.id);
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });

    const isOwner = String(shelf.ownerId) === String(req.user.id);
    if (!isOwner) return res.status(403).json({ message: 'Only the shelf owner can delete this shelf' });

    await Promise.all([
      Link.deleteMany({ shelfId: shelf._id }),
      ShelfComment.deleteMany({ shelfId: shelf._id }),
      ShelfInvite.deleteMany({ shelfId: shelf._id }),
      Shelf.updateMany({ parentShelfId: shelf._id }, { $set: { parentShelfId: null } }),
      User.updateMany({ defaultShelfId: shelf._id }, { $set: { defaultShelfId: null } }),
    ]);

    await Shelf.deleteOne({ _id: shelf._id });
    res.json({ _id: shelf._id, deleted: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting shelf' });
  }
};

// POST /api/shelves/:id/star
export const toggleShelfStar = async (req, res) => {
  try {
    const shelf = await Shelf.findById(req.params.id);
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });

    const userId = String(req.user.id);
    const starredBy = (shelf.starredBy || []).map(String);
    const hasStarred = starredBy.includes(userId);

    shelf.starredBy = hasStarred
      ? (shelf.starredBy || []).filter((id) => String(id) !== userId)
      : [...new Set([...(shelf.starredBy || []).map(String), userId])];

    await shelf.save();

    if (!hasStarred && String(shelf.ownerId) !== userId) {
      const actor = await User.findById(req.user.id).select('name').lean();
      await Notification.create({
        userId: shelf.ownerId,
        actorId: req.user.id,
        type: 'shelf_starred',
        title: 'Your shelf got a star',
        message: `${actor?.name || 'Someone'} starred "${shelf.name}"`,
        meta: { shelfId: shelf._id },
        isRead: false,
      });
    }

    res.json({
      _id: shelf._id,
      starred: !hasStarred,
      starCount: (shelf.starredBy || []).length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error updating shelf star' });
  }
};

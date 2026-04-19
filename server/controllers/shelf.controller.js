import crypto from 'crypto';
import axios from 'axios';
import Notification from '../models/Notification.js';
import Shelf from '../models/Shelf.js';
import ShelfComment from '../models/ShelfComment.js';
import Link from '../models/Link.js';
import ShelfInvite from '../models/ShelfInvite.js';
import User from '../models/User.js';

async function sendInviteToTelegramIfAvailable(email, inviteUrl, shelfName = 'a shelf') {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return false;

  const user = await User.findOne({ email: normalizedEmail }).select('telegramId name').lean();
  const telegramId = String(user?.telegramId || '').trim();
  if (!telegramId) return false;

  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!botToken) return false;

  const text = [
    'You received a SHELFLIFE shelf invite.',
    '',
    `Shelf: ${shelfName}`,
    `Invite link: ${inviteUrl}`,
  ].join('\n');

  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: telegramId,
      text,
    });
    return true;
  } catch (err) {
    console.error('sendInviteToTelegramIfAvailable error:', err.response?.data || err.message);
    return false;
  }
}

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
    const normalizedEmail = email.toLowerCase();
    await ShelfInvite.create({ shelfId, email: normalizedEmail, token });
    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${token}`;

    const telegramSent = await sendInviteToTelegramIfAvailable(
      normalizedEmail,
      inviteUrl,
      shelf.name || 'a shelf'
    );

    res.json({ inviteUrl, telegramSent });
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

    // Create forked shelf with lineage pointer (always public like GitHub)
    const forked = await Shelf.create({
      name: newName,
      ownerId: req.user.id,
      members: [req.user.id],
      type: 'team',
      isPublic: true,
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

    // Forked shelves must remain public (like GitHub)
    if (shelf.parentShelfId && !isPublic) {
      return res.status(400).json({ message: 'Forked shelves must remain public' });
    }

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

// POST /api/shelves/:id/remove-member
export const removeMemberFromShelf = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const shelf = await Shelf.findById(req.params.id);
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });

    const isOwner = String(shelf.ownerId) === String(req.user.id);
    if (!isOwner) {
      return res.status(403).json({ message: 'Only the shelf owner can remove members' });
    }

    if (String(userId) === String(shelf.ownerId)) {
      return res.status(400).json({ message: 'Cannot remove the owner from the shelf' });
    }

    shelf.members = shelf.members.filter((id) => String(id) !== String(userId));
    await shelf.save();

    // Notify the removed user
    const owner = await User.findById(req.user.id).select('name').lean();
    await Notification.create({
      userId: userId,
      actorId: req.user.id,
      type: 'shelf_access_revoked',
      title: 'Shelf access removed',
      message: `${owner?.name || 'Someone'} removed your access to "${shelf.name}"`,
      meta: { shelfId: shelf._id },
      isRead: false,
    });

    res.json({ message: 'Member removed successfully', shelfId: shelf._id });
  } catch (err) {
    console.error('removeMemberFromShelf error:', err.message);
    res.status(500).json({ message: 'Server error removing member' });
  }
};

// GET /api/shelves/:id/members
export const getShelfMembers = async (req, res) => {
  try {
    const shelf = await Shelf.findById(req.params.id)
      .populate('members', 'name email')
      .populate('ownerId', 'name email');
    
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });

    const isMember = shelf.members.some((m) => String(m._id) === String(req.user.id));
    const isOwner = String(shelf.ownerId._id) === String(req.user.id);

    if (!isMember && !isOwner) {
      return res.status(403).json({ message: 'You do not have access to this shelf' });
    }

    res.json({
      owner: {
        _id: shelf.ownerId._id,
        name: shelf.ownerId.name,
        email: shelf.ownerId.email,
      },
      members: shelf.members
        .filter((m) => String(m._id) !== String(shelf.ownerId._id))
        .map((m) => ({
          _id: m._id,
          name: m.name,
          email: m.email,
        })),
    });
  } catch (err) {
    console.error('getShelfMembers error:', err.message);
    res.status(500).json({ message: 'Server error fetching members' });
  }
};
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

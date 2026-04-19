import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Shelf from '../models/Shelf.js';
import Link from '../models/Link.js';
import ShelfInvite from '../models/ShelfInvite.js';
import Notification from '../models/Notification.js';
import ShelfComment from '../models/ShelfComment.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { computeArchetype } from '../utils/curator.util.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AVATAR_DIR = path.resolve(__dirname, '../public/avatars');

function buildCuratorArchetype(user) {
  const computed = computeArchetype(user.vibeStats);
  const customName = typeof user.curatorArchetypeName === 'string' ? user.curatorArchetypeName.trim() : '';
  const customDescription = typeof user.curatorArchetypeDescription === 'string' ? user.curatorArchetypeDescription.trim() : '';

  return {
    name: customName || computed.name,
    description: customDescription || computed.description,
    isCustom: Boolean(customName || customDescription),
  };
}

function toAvatarPathIfManaged(url) {
  if (typeof url !== 'string') return null;
  if (!url.startsWith('/static/avatars/')) return null;
  const fileName = url.replace('/static/avatars/', '').trim();
  return fileName ? path.join(AVATAR_DIR, fileName) : null;
}

async function removeManagedAvatar(url) {
  const filePath = toAvatarPathIfManaged(url);
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing files during cleanup.
  }
}

async function saveAvatarDataUrl(dataUrl, userId) {
  const value = String(dataUrl || '').trim();
  const match = value.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i);
  if (!match) {
    throw new Error('Avatar must be a valid image data URL');
  }

  const type = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > 4 * 1024 * 1024) {
    throw new Error('Avatar image must be 4MB or smaller');
  }

  await fs.mkdir(AVATAR_DIR, { recursive: true });

  const fileName = `${userId}-${Date.now()}.${type}`;
  const filePath = path.join(AVATAR_DIR, fileName);
  await fs.writeFile(filePath, buffer);

  return `/static/avatars/${fileName}`;
}

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
        phone: user.phone,
        telegramId: user.telegramId,
        avatarUrl: user.avatarUrl,
        defaultShelfId: user.defaultShelfId,
        vibeStats: user.vibeStats,
        curatorArchetype: buildCuratorArchetype(user),
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
        phone: user.phone,
        telegramId: user.telegramId,
        avatarUrl: user.avatarUrl,
        defaultShelfId: user.defaultShelfId,
        vibeStats: user.vibeStats,
        curatorArchetype: buildCuratorArchetype(user),
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
      phone: user.phone,
      telegramId: user.telegramId,
      avatarUrl: user.avatarUrl,
      defaultShelfId: user.defaultShelfId,
      vibeStats: user.vibeStats,
      curatorArchetype: buildCuratorArchetype(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/auth/me — update defaultShelfId (or other safe fields)
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const {
      defaultShelfId,
      name,
      email,
      phone,
      telegramId,
      avatarUrl,
      avatarDataUrl,
      curatorArchetypeName,
      curatorArchetypeDescription,
      currentPassword,
      newPassword,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (typeof name === 'string') {
      const nextName = name.trim();
      if (!nextName) return res.status(400).json({ message: 'Name cannot be empty' });
      user.name = nextName;
    }

    if (typeof email === 'string') {
      const nextEmail = email.trim().toLowerCase();
      if (!nextEmail) return res.status(400).json({ message: 'Email cannot be empty' });
      if (nextEmail !== user.email) {
        const existing = await User.findOne({ email: nextEmail, _id: { $ne: user._id } });
        if (existing) return res.status(409).json({ message: 'Email already in use' });
        user.email = nextEmail;
      }
    }

    if (typeof phone === 'string') {
      const nextPhone = phone.trim();
      user.phone = nextPhone || null;
    }

    if (typeof telegramId === 'string') {
      const nextTelegramId = telegramId.trim();
      user.telegramId = nextTelegramId || null;
    }

    if (typeof avatarDataUrl === 'string' && avatarDataUrl.trim()) {
      const nextAvatarUrl = await saveAvatarDataUrl(avatarDataUrl, user._id);
      await removeManagedAvatar(user.avatarUrl);
      user.avatarUrl = nextAvatarUrl;
    } else if (typeof avatarUrl !== 'undefined') {
      if (avatarUrl === null || avatarUrl === '') {
        await removeManagedAvatar(user.avatarUrl);
        user.avatarUrl = null;
      } else if (typeof avatarUrl === 'string') {
        user.avatarUrl = avatarUrl.trim();
      }
    }

    if (typeof defaultShelfId !== 'undefined') {
      user.defaultShelfId = defaultShelfId || null;
    }

    if (typeof curatorArchetypeName !== 'undefined') {
      const nextName = String(curatorArchetypeName || '').trim();
      if (nextName.length > 80) {
        return res.status(400).json({ message: 'Archetype name must be 80 characters or fewer' });
      }
      user.curatorArchetypeName = nextName || null;
    }

    if (typeof curatorArchetypeDescription !== 'undefined') {
      const nextDescription = String(curatorArchetypeDescription || '').trim();
      if (nextDescription.length > 280) {
        return res.status(400).json({ message: 'Archetype description must be 280 characters or fewer' });
      }
      user.curatorArchetypeDescription = nextDescription || null;
    }

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'currentPassword and newPassword are both required' });
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
      if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters' });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      telegramId: user.telegramId,
      avatarUrl: user.avatarUrl,
      defaultShelfId: user.defaultShelfId,
      vibeStats: user.vibeStats,
      curatorArchetype: buildCuratorArchetype(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/me — delete account with password + confirmation
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, confirmation } = req.body || {};
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ message: 'confirmation must be DELETE' });
    }

    if (!currentPassword) {
      return res.status(400).json({ message: 'currentPassword is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const ownedShelves = await Shelf.find({ ownerId: user._id }).select('_id').lean();
    const ownedShelfIds = ownedShelves.map((s) => s._id);

    await removeManagedAvatar(user.avatarUrl);

    if (ownedShelfIds.length) {
      await Promise.all([
        Shelf.updateMany(
          { parentShelfId: { $in: ownedShelfIds } },
          { $set: { parentShelfId: null } }
        ),
        User.updateMany(
          { _id: { $ne: user._id }, defaultShelfId: { $in: ownedShelfIds } },
          { $set: { defaultShelfId: null } }
        ),
      ]);
    }

    await Promise.all([
      Link.deleteMany({
        $or: [
          { shelfId: { $in: ownedShelfIds } },
          { addedBy: user._id },
        ],
      }),
      ShelfInvite.deleteMany({ shelfId: { $in: ownedShelfIds } }),
      ShelfComment.deleteMany({
        $or: [
          { userId: user._id },
          { shelfId: { $in: ownedShelfIds } },
        ],
      }),
      Notification.deleteMany({
        $or: [
          { userId: user._id },
          { actorId: user._id },
        ],
      }),
      Shelf.updateMany(
        { _id: { $nin: ownedShelfIds } },
        { $pull: { members: user._id, starredBy: user._id } }
      ),
      Shelf.deleteMany({ ownerId: user._id }),
      User.updateMany(
        { _id: { $ne: user._id } },
        {
          $pull: {
            friends: user._id,
            friendRequestsSent: user._id,
            friendRequestsReceived: user._id,
          },
        }
      ),
      User.deleteOne({ _id: user._id }),
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

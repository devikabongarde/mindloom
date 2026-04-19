import ChatMessage from '../models/ChatMessage.js';
import mongoose from 'mongoose';
import User from '../models/User.js';

function buildParticipantKey(a, b) {
  return [String(a), String(b)].sort().join(':');
}

function toObjectId(value) {
  try {
    return new mongoose.Types.ObjectId(String(value || '').trim());
  } catch {
    return null;
  }
}

async function computeUnreadSummary(userId) {
  const recipientId = toObjectId(userId);
  if (!recipientId) return { total: 0, byFriend: {} };
  const rows = await ChatMessage.aggregate([
    {
      $match: {
        recipientId,
        isRead: { $ne: true },
      },
    },
    {
      $group: {
        _id: '$senderId',
        count: { $sum: 1 },
      },
    },
  ]);

  const byFriend = {};
  let total = 0;
  rows.forEach((row) => {
    const friendId = String(row._id || '');
    const count = Number(row.count || 0);
    if (!friendId || count <= 0) return;
    byFriend[friendId] = count;
    total += count;
  });

  return { total, byFriend };
}

async function emitUnreadSummary(io, userId) {
  if (!io) return;
  const summary = await computeUnreadSummary(userId);
  io.to(`user:${String(userId)}`).emit('chat:unread:update', summary);
}

async function requireFriendship(meId, friendId) {
  const [me, friend] = await Promise.all([
    User.findById(meId).select('friends').lean(),
    User.findById(friendId).select('name email').lean(),
  ]);

  if (!me || !friend) return { ok: false, code: 404, message: 'User not found' };

  const isFriend = (me.friends || []).some((id) => String(id) === String(friendId));
  if (!isFriend) return { ok: false, code: 403, message: 'You can only chat with friends' };

  return { ok: true, me, friend };
}

export async function getMessagesWithFriend(req, res) {
  try {
    const { friendId } = req.params;
    if (!friendId) return res.status(400).json({ message: 'friendId is required' });

    const access = await requireFriendship(req.user.id, friendId);
    if (!access.ok) return res.status(access.code).json({ message: access.message });

    const limit = Math.min(200, Math.max(20, Number.parseInt(req.query.limit || '80', 10)));
    const participantKey = buildParticipantKey(req.user.id, friendId);

    await ChatMessage.updateMany(
      {
        senderId: toObjectId(friendId),
        recipientId: toObjectId(req.user.id),
        isRead: { $ne: true },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    const messages = await ChatMessage.find({ participantKey })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'name')
      .lean();

    const normalized = messages.reverse().map((msg) => ({
      _id: msg._id,
      senderId: String(msg.senderId?._id || msg.senderId || ''),
      recipientId: String(msg.recipientId || ''),
      senderName: msg.senderId?.name || 'Unknown',
      text: msg.text,
      createdAt: msg.createdAt,
    }));

    res.json({
      friend: {
        _id: access.friend._id,
        name: access.friend.name,
        email: access.friend.email,
      },
      messages: normalized,
    });

    emitUnreadSummary(req.app.get('io'), req.user.id).catch(() => {});
  } catch (err) {
    console.error('getMessagesWithFriend error:', err.message);
    res.status(500).json({ message: 'Server error fetching chat messages' });
  }
}

export async function markConversationRead(req, res) {
  try {
    const { friendId } = req.params;
    if (!friendId) return res.status(400).json({ message: 'friendId is required' });

    const access = await requireFriendship(req.user.id, friendId);
    if (!access.ok) return res.status(access.code).json({ message: access.message });

    await ChatMessage.updateMany(
      {
        senderId: toObjectId(friendId),
        recipientId: toObjectId(req.user.id),
        isRead: { $ne: true },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    const summary = await computeUnreadSummary(req.user.id);
    emitUnreadSummary(req.app.get('io'), req.user.id).catch(() => {});
    res.json(summary);
  } catch (err) {
    console.error('markConversationRead error:', err.message);
    res.status(500).json({ message: 'Server error marking conversation as read' });
  }
}

export async function getUnreadSummary(req, res) {
  try {
    const summary = await computeUnreadSummary(req.user.id);
    res.json(summary);
  } catch (err) {
    console.error('getUnreadSummary error:', err.message);
    res.status(500).json({ message: 'Server error fetching unread chat summary' });
  }
}

export async function sendMessageToFriend(req, res) {
  try {
    const { friendId } = req.params;
    const text = String(req.body?.text || '').trim();

    if (!friendId) return res.status(400).json({ message: 'friendId is required' });
    if (!text) return res.status(400).json({ message: 'Message text is required' });
    if (text.length > 2000) return res.status(400).json({ message: 'Message must be 2000 characters or fewer' });

    const access = await requireFriendship(req.user.id, friendId);
    if (!access.ok) return res.status(access.code).json({ message: access.message });

    const participantKey = buildParticipantKey(req.user.id, friendId);

    const created = await ChatMessage.create({
      participantKey,
      participants: [req.user.id, friendId],
      senderId: req.user.id,
      recipientId: friendId,
      text,
    });

    const populated = await ChatMessage.findById(created._id).populate('senderId', 'name').lean();

    const payload = {
      _id: populated._id,
      participantKey,
      senderId: String(populated.senderId?._id || populated.senderId || ''),
      recipientId: String(populated.recipientId || ''),
      senderName: populated.senderId?.name || 'Unknown',
      text: populated.text,
      createdAt: populated.createdAt,
    };

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${String(req.user.id)}`).emit('chat:message:new', payload);
      io.to(`user:${String(friendId)}`).emit('chat:message:new', payload);
      emitUnreadSummary(io, friendId).catch(() => {});
    }

    res.status(201).json(payload);
  } catch (err) {
    console.error('sendMessageToFriend error:', err.message);
    res.status(500).json({ message: 'Server error sending message' });
  }
}

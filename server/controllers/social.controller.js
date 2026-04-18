import Link from '../models/Link.js';
import Notification from '../models/Notification.js';
import Shelf from '../models/Shelf.js';
import ShelfComment from '../models/ShelfComment.js';
import User from '../models/User.js';

function toSet(values = []) {
  return new Set(values.map((v) => String(v)));
}

function buildFriendState(me, targetId) {
  const id = String(targetId);
  const friends = toSet(me.friends || []);
  const sent = toSet(me.friendRequestsSent || []);
  const received = toSet(me.friendRequestsReceived || []);

  if (friends.has(id)) return 'friends';
  if (sent.has(id)) return 'requested';
  if (received.has(id)) return 'incoming';
  return 'none';
}

function popularityScore(link) {
  const reactionCount = Array.isArray(link.reactions) ? link.reactions.length : 0;
  const ageHours = Math.max(1, (Date.now() - new Date(link.createdAt).getTime()) / (1000 * 60 * 60));
  const freshness = Math.max(0, 10 - ageHours / 8);
  return reactionCount * 3 + freshness;
}

function shelfPopularityScore(stats) {
  return stats.totalReactions * 2 + stats.totalLinks + stats.freshness;
}

export async function getSocialFeed(req, res) {
  try {
    const limit = Math.min(30, Math.max(3, Number.parseInt(req.query.limit || '12', 10)));

    const publicShelves = await Shelf.find({ isPublic: true })
      .select('_id name ownerId starredBy createdAt updatedAt')
      .populate('ownerId', 'name')
      .lean();
    if (publicShelves.length === 0) return res.json([]);

    const shelfIdList = publicShelves.map((s) => s._id);
    const shelfMap = new Map(publicShelves.map((s) => [String(s._id), s]));

    const links = await Link.find({ shelfId: { $in: shelfIdList } })
      .sort({ createdAt: -1 })
      .limit(400)
      .populate('addedBy', 'name')
      .lean();

    const commentCountsRaw = await ShelfComment.aggregate([
      { $match: { shelfId: { $in: shelfIdList } } },
      { $group: { _id: '$shelfId', count: { $sum: 1 } } },
    ]);
    const commentCountByShelfId = new Map(
      commentCountsRaw.map((row) => [String(row._id), row.count])
    );

    const shelfStats = new Map();
    for (const shelf of publicShelves) {
      shelfStats.set(String(shelf._id), {
        totalLinks: 0,
        totalReactions: 0,
        freshness: 0,
        latestActivityAt: shelf.updatedAt || shelf.createdAt || null,
        previewLinks: [],
      });
    }

    for (const link of links) {
      const shelfId = String(link.shelfId);
      const current = shelfStats.get(shelfId);
      if (!current) continue;

      current.totalLinks += 1;
      current.totalReactions += Array.isArray(link.reactions) ? link.reactions.length : 0;
      current.freshness += popularityScore(link);

      if (!current.latestActivityAt || new Date(link.createdAt) > new Date(current.latestActivityAt)) {
        current.latestActivityAt = link.createdAt;
      }

      if (current.previewLinks.length < 3) {
        current.previewLinks.push({
          _id: link._id,
          title: link.title,
          url: link.url,
          summary: link.summary,
        });
      }
    }

    const scoredShelves = publicShelves
      .map((shelf) => {
        const stats = shelfStats.get(String(shelf._id)) || {
          totalLinks: 0,
          totalReactions: 0,
          freshness: 0,
          latestActivityAt: shelf.updatedAt || shelf.createdAt || null,
          previewLinks: [],
        };

        return {
          _id: shelf._id,
          name: shelf.name || 'Public Shelf',
          ownerId: shelf.ownerId?._id || null,
          ownerName: shelf.ownerId?.name || 'Unknown',
          starCount: Array.isArray(shelf.starredBy) ? shelf.starredBy.length : 0,
          starredByMe: Array.isArray(shelf.starredBy) ? shelf.starredBy.some((id) => String(id) === String(req.user.id)) : false,
          commentsCount: commentCountByShelfId.get(String(shelf._id)) || 0,
          totalLinks: stats.totalLinks,
          totalReactions: stats.totalReactions,
          latestActivityAt: stats.latestActivityAt,
          popularity: shelfPopularityScore(stats),
          previewLinks: stats.previewLinks,
        };
      })
        .sort((a, b) => {
          if (b.starCount !== a.starCount) return b.starCount - a.starCount;
          if (b.totalReactions !== a.totalReactions) return b.totalReactions - a.totalReactions;
          return new Date(b.latestActivityAt || 0) - new Date(a.latestActivityAt || 0);
        })
      .slice(0, limit);

    res.json(scoredShelves);
  } catch (err) {
    console.error('getSocialFeed error:', err.message);
    res.status(500).json({ message: 'Server error fetching social feed' });
  }
}

export async function discoverUsers(req, res) {
  try {
    const me = await User.findById(req.user.id).lean();
    if (!me) return res.status(404).json({ message: 'User not found' });

    const q = String(req.query.q || '').trim();
    const regex = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const users = await User.find({
      _id: { $ne: req.user.id },
      ...(regex
        ? {
            $or: [{ name: regex }, { email: regex }],
          }
        : {}),
    })
      .select('name email')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const enriched = users.map((u) => ({
      ...u,
      friendState: buildFriendState(me, u._id),
    }));

    res.json(enriched);
  } catch (err) {
    console.error('discoverUsers error:', err.message);
    res.status(500).json({ message: 'Server error discovering users' });
  }
}

export async function getFriendsState(req, res) {
  try {
    const me = await User.findById(req.user.id)
      .populate('friends', 'name email')
      .populate('friendRequestsSent', 'name email')
      .populate('friendRequestsReceived', 'name email')
      .lean();

    if (!me) return res.status(404).json({ message: 'User not found' });

    res.json({
      friends: me.friends || [],
      sent: me.friendRequestsSent || [],
      received: me.friendRequestsReceived || [],
    });
  } catch (err) {
    console.error('getFriendsState error:', err.message);
    res.status(500).json({ message: 'Server error fetching friends' });
  }
}

export async function sendFriendRequest(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    if (String(userId) === String(req.user.id)) return res.status(400).json({ message: 'Cannot add yourself' });

    const [me, target] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId),
    ]);

    if (!me || !target) return res.status(404).json({ message: 'User not found' });

    const alreadyFriends = toSet(me.friends).has(String(target._id));
    const alreadySent = toSet(me.friendRequestsSent).has(String(target._id));

    if (alreadyFriends) return res.status(409).json({ message: 'Already friends' });
    if (alreadySent) return res.status(409).json({ message: 'Request already sent' });

    // If target already sent request to me, auto-accept.
    const incomingFromTarget = toSet(me.friendRequestsReceived).has(String(target._id));
    if (incomingFromTarget) {
      me.friendRequestsReceived = (me.friendRequestsReceived || []).filter((id) => String(id) !== String(target._id));
      target.friendRequestsSent = (target.friendRequestsSent || []).filter((id) => String(id) !== String(me._id));

      me.friends = [...new Set([...(me.friends || []).map(String), String(target._id)])];
      target.friends = [...new Set([...(target.friends || []).map(String), String(me._id)])];

      await Promise.all([me.save(), target.save()]);
      return res.json({ status: 'friends' });
    }

    me.friendRequestsSent = [...new Set([...(me.friendRequestsSent || []).map(String), String(target._id)])];
    target.friendRequestsReceived = [...new Set([...(target.friendRequestsReceived || []).map(String), String(me._id)])];

    await Promise.all([me.save(), target.save()]);

    await Notification.create({
      userId: target._id,
      actorId: me._id,
      type: 'friend_request',
      title: 'New friend request',
      message: `${me.name || 'Someone'} sent you a friend request`,
      meta: { requesterUserId: me._id },
      isRead: false,
    });

    res.json({ status: 'requested' });
  } catch (err) {
    console.error('sendFriendRequest error:', err.message);
    res.status(500).json({ message: 'Server error sending friend request' });
  }
}

export async function acceptFriendRequest(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const [me, requester] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId),
    ]);

    if (!me || !requester) return res.status(404).json({ message: 'User not found' });

    const hasIncoming = toSet(me.friendRequestsReceived).has(String(requester._id));
    if (!hasIncoming) return res.status(404).json({ message: 'No pending request from this user' });

    me.friendRequestsReceived = (me.friendRequestsReceived || []).filter((id) => String(id) !== String(requester._id));
    requester.friendRequestsSent = (requester.friendRequestsSent || []).filter((id) => String(id) !== String(me._id));

    me.friends = [...new Set([...(me.friends || []).map(String), String(requester._id)])];
    requester.friends = [...new Set([...(requester.friends || []).map(String), String(me._id)])];

    await Promise.all([me.save(), requester.save()]);

    await Notification.create({
      userId: requester._id,
      actorId: me._id,
      type: 'friend_accept',
      title: 'Friend request accepted',
      message: `${me.name || 'Someone'} accepted your friend request`,
      meta: { accepterUserId: me._id },
      isRead: false,
    });

    res.json({ status: 'friends' });
  } catch (err) {
    console.error('acceptFriendRequest error:', err.message);
    res.status(500).json({ message: 'Server error accepting friend request' });
  }
}

export async function getNotifications(req, res) {
  try {
    const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limit || '50', 10)));

    const [storedNotifications, me] = await Promise.all([
      Notification.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('actorId', 'name email')
        .lean(),
      User.findById(req.user.id)
        .populate('friendRequestsReceived', 'name email')
        .lean(),
    ]);

    const existingRequesters = new Set(
      storedNotifications
        .filter((n) => n.type === 'friend_request' && !n.isRead)
        .map((n) => String(n.meta?.requesterUserId || n.actorId?._id || n.actorId || ''))
    );

    const fallbackRequestNotifications = (me?.friendRequestsReceived || [])
      .filter((u) => !existingRequesters.has(String(u._id)))
      .map((u) => ({
        _id: `friend-request-${u._id}`,
        type: 'friend_request',
        title: 'New friend request',
        message: `${u.name || 'Someone'} sent you a friend request`,
        actorId: { _id: u._id, name: u.name, email: u.email },
        meta: { requesterUserId: u._id },
        isRead: false,
        createdAt: new Date(),
        synthetic: true,
      }));

    const combined = [...storedNotifications, ...fallbackRequestNotifications]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.json({
      notifications: combined,
      unreadCount: combined.filter((n) => !n.isRead).length,
    });
  } catch (err) {
    console.error('getNotifications error:', err.message);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { isRead: true } },
      { new: true }
    ).lean();

    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ _id: notification._id, isRead: true });
  } catch (err) {
    console.error('markNotificationRead error:', err.message);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { $set: { isRead: true } });
    res.json({ ok: true });
  } catch (err) {
    console.error('markAllNotificationsRead error:', err.message);
    res.status(500).json({ message: 'Server error marking all notifications as read' });
  }
}

export async function getShelfComments(req, res) {
  try {
    const limit = Math.min(100, Math.max(10, Number.parseInt(req.query.limit || '40', 10)));
    const shelf = await Shelf.findById(req.params.shelfId).select('isPublic members');
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });

    const isMember = (shelf.members || []).map(String).includes(String(req.user.id));
    if (!shelf.isPublic && !isMember) {
      return res.status(403).json({ message: 'You do not have access to this shelf discussion' });
    }

    const comments = await ShelfComment.find({ shelfId: shelf._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'name')
      .lean();

    res.json(comments.map((c) => ({
      _id: c._id,
      text: c.text,
      createdAt: c.createdAt,
      user: {
        _id: c.userId?._id || null,
        name: c.userId?.name || 'Unknown',
      },
    })));
  } catch (err) {
    console.error('getShelfComments error:', err.message);
    res.status(500).json({ message: 'Server error fetching shelf comments' });
  }
}

export async function addShelfComment(req, res) {
  try {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ message: 'Comment text is required' });
    if (text.length > 500) return res.status(400).json({ message: 'Comment must be 500 characters or less' });

    const shelf = await Shelf.findById(req.params.shelfId).select('isPublic members ownerId name');
    if (!shelf) return res.status(404).json({ message: 'Shelf not found' });

    const isMember = (shelf.members || []).map(String).includes(String(req.user.id));
    if (!shelf.isPublic && !isMember) {
      return res.status(403).json({ message: 'You do not have access to this shelf discussion' });
    }

    const comment = await ShelfComment.create({
      shelfId: shelf._id,
      userId: req.user.id,
      text,
    });

    const populated = await ShelfComment.findById(comment._id).populate('userId', 'name').lean();

    res.status(201).json({
      _id: populated._id,
      text: populated.text,
      createdAt: populated.createdAt,
      user: {
        _id: populated.userId?._id || null,
        name: populated.userId?.name || 'Unknown',
      },
    });
  } catch (err) {
    console.error('addShelfComment error:', err.message);
    res.status(500).json({ message: 'Server error creating shelf comment' });
  }
}

export async function removeFriend(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const [me, other] = await Promise.all([
      User.findById(req.user.id),
      User.findById(userId),
    ]);

    if (!me || !other) return res.status(404).json({ message: 'User not found' });

    me.friends = (me.friends || []).filter((id) => String(id) !== String(other._id));
    other.friends = (other.friends || []).filter((id) => String(id) !== String(me._id));

    me.friendRequestsSent = (me.friendRequestsSent || []).filter((id) => String(id) !== String(other._id));
    me.friendRequestsReceived = (me.friendRequestsReceived || []).filter((id) => String(id) !== String(other._id));
    other.friendRequestsSent = (other.friendRequestsSent || []).filter((id) => String(id) !== String(me._id));
    other.friendRequestsReceived = (other.friendRequestsReceived || []).filter((id) => String(id) !== String(me._id));

    await Promise.all([me.save(), other.save()]);
    res.json({ status: 'none' });
  } catch (err) {
    console.error('removeFriend error:', err.message);
    res.status(500).json({ message: 'Server error removing friend' });
  }
}

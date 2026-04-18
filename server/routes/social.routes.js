import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import {
  getSocialFeed,
  discoverUsers,
  getFriendsState,
  getNotifications,
  sendFriendRequest,
  acceptFriendRequest,
  markNotificationRead,
  markAllNotificationsRead,
  removeFriend,
} from '../controllers/social.controller.js';

const router = Router();

router.get('/feed', authMiddleware, getSocialFeed);
router.get('/users', authMiddleware, discoverUsers);
router.get('/friends', authMiddleware, getFriendsState);
router.get('/notifications', authMiddleware, getNotifications);
router.post('/friends/request', authMiddleware, sendFriendRequest);
router.post('/friends/accept', authMiddleware, acceptFriendRequest);
router.post('/friends/remove', authMiddleware, removeFriend);
router.patch('/notifications/read-all', authMiddleware, markAllNotificationsRead);
router.patch('/notifications/:id/read', authMiddleware, markNotificationRead);

export default router;

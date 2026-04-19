import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { getMessagesWithFriend, getUnreadSummary, markConversationRead, sendMessageToFriend } from '../controllers/chat.controller.js';

const router = Router();

router.get('/unread-summary', authMiddleware, getUnreadSummary);
router.patch('/:friendId/read', authMiddleware, markConversationRead);
router.get('/:friendId/messages', authMiddleware, getMessagesWithFriend);
router.post('/:friendId/messages', authMiddleware, sendMessageToFriend);

export default router;

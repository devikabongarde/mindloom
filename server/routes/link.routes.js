import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { createLink, getShelfLinks, getCompostLinks, clickLink, reactToLink, searchShelfLinks, deleteLink, getLinkSuggestions, addLinkSuggestion } from '../controllers/link.controller.js';
import { getContextFeed } from '../controllers/context.controller.js';

const router = Router();

router.post('/',                authMiddleware, createLink);
router.get('/search',           authMiddleware, searchShelfLinks);
router.get('/shelf/:id',        authMiddleware, getShelfLinks);
router.get('/compost/:shelfId', authMiddleware, getCompostLinks);
router.post('/:id/click',       authMiddleware, clickLink);
router.post('/:id/react',       authMiddleware, reactToLink);
router.get('/:id/suggestions',  authMiddleware, getLinkSuggestions);
router.post('/:id/suggestions', authMiddleware, addLinkSuggestion);
router.delete('/:id',           authMiddleware, deleteLink);
router.get('/:id/context',      authMiddleware, getContextFeed);

export default router;

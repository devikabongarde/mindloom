import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { createLink, getShelfLinks, getCompostLinks, clickLink } from '../controllers/link.controller.js';
import { getContextFeed } from '../controllers/context.controller.js';

const router = Router();

router.post('/',                    authMiddleware, createLink);
router.get('/shelf/:id',            authMiddleware, getShelfLinks);
router.get('/compost/:shelfId',     authMiddleware, getCompostLinks);
router.post('/:id/click',           authMiddleware, clickLink);
router.get('/:id/context',          authMiddleware, getContextFeed);

export default router;

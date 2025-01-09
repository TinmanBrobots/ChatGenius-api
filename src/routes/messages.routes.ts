import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateUser);

// Message Routes
router.post('/', messageController.createMessage);
router.get('/:id', messageController.getMessage);
router.patch('/:id', messageController.updateMessage);
router.delete('/:id', messageController.deleteMessage);
router.post('/:id/restore', messageController.restoreMessage);

// Thread Routes
router.post('/:parentId/replies', messageController.createThreadReply);
router.get('/:parentId/replies', messageController.getThreadReplies);

// Channel Messages Routes
router.get('/channel/:channelId', messageController.getChannelMessages);
router.get('/search', messageController.searchMessages);

// Reaction Routes
router.post('/:messageId/reactions', messageController.addReaction);
router.delete('/:messageId/reactions/:emoji', messageController.removeReaction);
router.get('/:messageId/reactions', messageController.getReactions);

export default router; 
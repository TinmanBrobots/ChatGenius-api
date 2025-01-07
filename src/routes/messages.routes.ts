import { Router } from 'express';
import { messageController } from '../controllers/message.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.get('/channel/:channelId', authenticateUser, messageController.getMessages);
router.post('/channel/:channelId', authenticateUser, messageController.createMessage);
router.post('/:messageId/reactions', authenticateUser, messageController.addReaction);
router.delete('/:messageId/reactions/:emoji', authenticateUser, messageController.removeReaction);

export default router; 
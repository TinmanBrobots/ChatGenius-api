import { Router } from 'express';
import { channelController } from '../controllers/channel.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Channel routes
router.get('/', authenticateUser, channelController.getChannels);
router.post('/', authenticateUser, channelController.createChannel);
router.get('/search', authenticateUser, channelController.searchChannels);

// Channel member routes
router.get('/:channelId/members', authenticateUser, channelController.getChannelMembers);
router.post('/:channelId/members', authenticateUser, channelController.addChannelMember);
router.delete('/:channelId/members/:userId', authenticateUser, channelController.removeChannelMember);
router.patch('/:channelId/members/:userId/role', authenticateUser, channelController.updateMemberRole);

export default router; 
import { Router } from 'express';
import { channelController } from '../controllers/channel.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateUser);

// Channel Routes
router.post('/', channelController.createChannel);
router.get('/:id', channelController.getChannel);
router.patch('/:id', channelController.updateChannel);
router.post('/:id/archive', channelController.archiveChannel);
router.delete('/:id', channelController.deleteChannel);
router.get('/', channelController.listChannels);
router.get('/search', channelController.searchChannels);

// Channel Member Routes
router.post('/:channelId/members', channelController.addMember);
router.delete('/:channelId/members/:profileId', channelController.removeMember);
router.patch('/:channelId/members/:profileId/role', channelController.updateMemberRole);
router.get('/:channelId/members', channelController.getChannelMembers);
router.patch('/:channelId/members/:profileId/settings', channelController.updateMemberSettings);
router.post('/:channelId/members/:profileId/read', channelController.updateLastRead);
router.post('/:channelId/members/:profileId/mute', channelController.toggleMute);

export default router; 
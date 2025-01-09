import { Router } from 'express';
import authRoutes from './auth.routes';
import channelRoutes from './channels.routes';
import messageRoutes from './messages.routes';
import profileRoutes from './profiles.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/channels', channelRoutes);
router.use('/messages', messageRoutes);
router.use('/profiles', profileRoutes);

export default router; 
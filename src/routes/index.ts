import { Router } from 'express';
import authRoutes from './auth.routes';
import channelRoutes from './channels.routes';
import messageRoutes from './messages.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/channels', channelRoutes);
router.use('/messages', messageRoutes);

export default router; 
import { Router } from 'express';
import authRoutes from './auth.routes';
import channelRoutes from './channels.routes';
import messageRoutes from './messages.routes';
import profileRoutes from './profiles.routes';
import fileRoutes from './files.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/channels', channelRoutes);
router.use('/messages', messageRoutes);
router.use('/profiles', profileRoutes);
router.use('/', fileRoutes);

export default router; 
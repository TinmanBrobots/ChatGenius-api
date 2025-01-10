import { Router } from 'express';
import { fileController } from '../controllers/file.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateUser);

// File upload
router.post('/channels/:channelId/files', fileController.uploadFile);

// File retrieval
router.get('/files/:fileId', fileController.getFileById);
router.get('/files/:fileId/url', fileController.getFileUrl);
router.get('/channels/:channelId/files', fileController.getChannelFiles);

// File management
router.delete('/files/:fileId', fileController.deleteFile);
router.patch('/files/:fileId', fileController.updateFileMetadata);

export default router;

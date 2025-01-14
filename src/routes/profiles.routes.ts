import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticateUser } from '../middleware/auth';
import { isAdmin, isProfileOwner } from '../middleware/authorization';

const router = Router();
const controller = new ProfileController();

router.use(authenticateUser);

// Public routes
router.get('/search', controller.searchProfiles);
router.get('/username/:username', controller.getProfileByUsername);

// Protected routes (require authentication)
router.get('/:id', controller.getProfile);

// Owner-only routes (require authentication and ownership)
router.patch('/:id', isProfileOwner, controller.updateProfile);

router.put('/:id/status', isProfileOwner, controller.updateStatus);

router.put('/:id/notifications', isProfileOwner, controller.updateNotificationPreferences);

router.put('/:id/theme', isProfileOwner, controller.updateTheme);

// Admin-only routes
router.delete('/:id', isAdmin, controller.deleteProfile);

router.put('/:id/admin', isAdmin, controller.setAdminStatus);

export default router; 
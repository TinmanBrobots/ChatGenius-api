import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authenticateUser } from '../middleware/auth';
import { isAdmin, isProfileOwner } from '../middleware/authorization';

const router = Router();
const controller = new ProfileController();

// Public routes
router.get('/search', authenticateUser, controller.searchProfiles);
router.get('/username/:username', authenticateUser, controller.getProfileByUsername);

// Protected routes (require authentication)
router.get('/:id', authenticateUser, controller.getProfile);

// Owner-only routes (require authentication and ownership)
router.patch('/:id', 
  authenticateUser, 
  isProfileOwner, 
  controller.updateProfile
);

router.put('/:id/status',
  authenticateUser,
  isProfileOwner,
  controller.updateStatus
);

router.put('/:id/notifications',
  authenticateUser,
  isProfileOwner,
  controller.updateNotificationPreferences
);

router.put('/:id/theme',
  authenticateUser,
  isProfileOwner,
  controller.updateTheme
);

// Admin-only routes
router.delete('/:id',
  authenticateUser,
  isAdmin,
  controller.deleteProfile
);

router.put('/:id/admin',
  authenticateUser,
  isAdmin,
  controller.setAdminStatus
);

export default router; 
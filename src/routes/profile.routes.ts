import { Router } from 'express';
import { profileController } from '../controllers/profile.controller';
import { authenticateUser } from '../middleware/auth';
import { isAdmin, isProfileOwner } from '../middleware/authorization';

const router = Router();

// Public routes
router.get('/search', authenticateUser, profileController.searchProfiles);
router.get('/username/:username', authenticateUser, profileController.getProfileByUsername);

// Protected routes (require authentication)
router.get('/:id', authenticateUser, profileController.getProfile);

// Owner-only routes (require authentication and ownership)
router.patch('/:id', 
  authenticateUser, 
  isProfileOwner, 
  profileController.updateProfile
);

router.put('/:id/status',
  authenticateUser,
  isProfileOwner,
  profileController.updateStatus
);

router.put('/:id/notifications',
  authenticateUser,
  isProfileOwner,
  profileController.updateNotificationPreferences
);

router.put('/:id/theme',
  authenticateUser,
  isProfileOwner,
  profileController.updateTheme
);

// Admin-only routes
router.delete('/:id',
  authenticateUser,
  isAdmin,
  profileController.deleteProfile
);

router.put('/:id/admin',
  authenticateUser,
  isAdmin,
  profileController.setAdminStatus
);

export default router; 
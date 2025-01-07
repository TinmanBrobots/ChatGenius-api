import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateUser } from '../middleware/auth';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = req.user;
    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
router.post('/reset-password', authController.requestPasswordReset);
router.post('/update-password', authenticateUser, authController.updatePassword);

export default router; 
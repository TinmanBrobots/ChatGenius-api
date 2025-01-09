import { Request, Response, NextFunction } from 'express';
import { profileService } from '../services/profile.service';

// Middleware to check if the authenticated user is the owner of the profile
export async function isProfileOwner(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    const profileId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (userId !== profileId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware to check if the authenticated user is an admin
export async function isAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const profile = await profileService.getProfileById(userId);

    if (!profile.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
} 
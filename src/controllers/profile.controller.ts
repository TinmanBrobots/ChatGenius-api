import { Request, Response } from 'express';
import { ProfileService } from '../services/profile.service';
import { z } from 'zod';

// Validation schemas
const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  full_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  title: z.string().max(100).optional(),
  timezone: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['online', 'offline', 'away', 'busy']),
  custom_status: z.string().max(100).optional(),
});

const updateNotificationPreferencesSchema = z.object({
  email_notifications: z.boolean(),
  desktop_notifications: z.boolean(),
  mobile_notifications: z.boolean(),
  mention_notifications: z.boolean(),
});

const updateThemeSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
});

export class ProfileController {
  // GET /profiles/:id
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const profileService = new ProfileService(req.token);
      const profile = await profileService.getProfileById(req.params.id);
      res.json(profile);
    } catch (error) {
      res.status(404).json({ error: 'Profile not found' });
    }
  }

  // GET /profiles/username/:username
  async getProfileByUsername(req: Request, res: Response): Promise<void> {
    try {
      const profileService = new ProfileService(req.token);
      const profile = await profileService.getProfileByUsername(req.params.username);
      res.json(profile);
    } catch (error) {
      res.status(404).json({ error: 'Profile not found' });
    }
  }

  // PATCH /profiles/:id
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const data = updateProfileSchema.parse(req.body);
      const profileService = new ProfileService(req.token);
      const profile = await profileService.updateProfile(req.params.id, data);
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update profile' });
      }
    }
  }

  // PUT /profiles/:id/status
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, custom_status } = updateStatusSchema.parse(req.body);
      const profileService = new ProfileService(req.token);
      await profileService.updateStatus(req.params.id, status, custom_status);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update status' });
      }
    }
  }

  // GET /profiles/search
  async searchProfiles(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }
      const profileService = new ProfileService(req.token);
      const profiles = await profileService.searchProfiles(query);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ error: 'Failed to search profiles' });
    }
  }

  // PUT /profiles/:id/notifications
  async updateNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const preferences = updateNotificationPreferencesSchema.parse(req.body);
      const profileService = new ProfileService(req.token);
      await profileService.updateNotificationPreferences(req.params.id, preferences);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update notification preferences' });
      }
    }
  }

  // PUT /profiles/:id/theme
  async updateTheme(req: Request, res: Response): Promise<void> {
    try {
      const { theme } = updateThemeSchema.parse(req.body);
      const profileService = new ProfileService(req.token);
      await profileService.updateThemePreference(req.params.id, theme);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update theme' });
      }
    }
  }

  // Admin routes
  // DELETE /profiles/:id (admin only)
  async deleteProfile(req: Request, res: Response): Promise<void> {
    try {
      const profileService = new ProfileService(req.token);
      await profileService.deleteProfile(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete profile' });
    }
  }

  // PUT /profiles/:id/admin (admin only)
  async setAdminStatus(req: Request, res: Response): Promise<void> {
    try {
      const isAdmin = z.boolean().parse(req.body.is_admin);
      const profileService = new ProfileService(req.token);
      await profileService.setAdminStatus(req.params.id, isAdmin);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update admin status' });
      }
    }
  }
} 
import '@jest/globals';
import { profileService } from '../../services/profile.service';
import { cleanDatabase, createTestUser, initTestDatabase, supabase } from '../setup';

describe('ProfileService', () => {
  // beforeAll(async () => {
  //   await initTestDatabase();
  // });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('getProfileById', () => {
    it('should return profile by id', async () => {
      const user = await createTestUser({
        email: 'mecijo@thetechnext.net',
        password: 'password123',
        username: 'test_user1',
        full_name: 'Test User1'
      });

      const profile = await profileService.getProfileById(user.id);

      expect(profile).toBeDefined();
      expect(profile.username).toBe('test_user1');
      expect(profile.email).toBe('mecijo@thetechnext.net');
    });

    it('should throw error for non-existent profile', async () => {
      await expect(
        profileService.getProfileById('non-existent-id')
      ).rejects.toThrow('Profile not found');
    });
  });

  describe('getProfileByUsername', () => {
    it('should return profile by username', async () => {
      await createTestUser({
        email: 'mecijo@thetechnext.net',
        password: 'password123',
        username: 'test_user1',
        full_name: 'Test User1'
      });

      const profile = await profileService.getProfileByUsername('test_user1');

      expect(profile).toBeDefined();
      expect(profile.email).toBe('mecijo@thetechnext.net');
      expect(profile.full_name).toBe('Test User1');
    });

    it('should throw error for non-existent username', async () => {
      await expect(
        profileService.getProfileByUsername('nonexistent')
      ).rejects.toThrow('Profile not found');
    });
  });

  describe('updateProfile', () => {
    it('should update allowed profile fields', async () => {
      const user = await createTestUser({
        email: 'mecijo@thetechnext.net',
        password: 'password123',
        username: 'test_user1',
        full_name: 'Test User1'
      });

      const updates = {
        full_name: 'Updated Name',
        bio: 'New bio',
        title: 'Developer',
        timezone: 'UTC'
      };

      const updatedProfile = await profileService.updateProfile(user.id, updates);

      expect(updatedProfile.full_name).toBe(updates.full_name);
      expect(updatedProfile.bio).toBe(updates.bio);
      expect(updatedProfile.title).toBe(updates.title);
      expect(updatedProfile.timezone).toBe(updates.timezone);
    });

    it('should ignore protected fields and succeed', async () => {
			const user = await createTestUser({
				email: 'mecijo@thetechnext.net',
				password: 'password123',
				username: 'test_user1',
				full_name: 'Test User1'
			});
		
			const updates = {
				is_admin: true,
				email_verified: true,
				created_at: new Date(),
				// Add some allowed fields to verify the update still succeeds
				bio: 'New bio',
				title: 'Developer'
			};
		
			const updatedProfile = await profileService.updateProfile(user.id, updates);
		
			// Verify protected fields were not updated
			expect(updatedProfile.is_admin).toBe(false);
			expect(updatedProfile.email_verified).toBe(true); // Set by createTestUser
			
			// Verify allowed fields were updated
			expect(updatedProfile.bio).toBe('New bio');
			expect(updatedProfile.title).toBe('Developer');
		}); 
  });

  describe('updateStatus', () => {
    it('should update status and custom status', async () => {
      const user = await createTestUser({
        email: 'mecijo@thetechnext.net',
        password: 'password123',
        username: 'test_user1',
        full_name: 'Test User1'
      });

      await profileService.updateStatus(user.id, 'away', 'In a meeting');

      const { data: profile } = await supabase
        .from('profiles')
        .select('status, custom_status, last_seen_at')
        .eq('id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found after logout');
      }

      expect(profile.status).toBe('away');
      expect(profile.custom_status).toBe('In a meeting');
      expect(new Date(profile.last_seen_at)).toBeDefined();
    });
  });

  describe('searchProfiles', () => {
    it('should find profiles by username or full name', async () => {
      await createTestUser({
        email: 'john@example.com',
        password: 'password123',
        username: 'johndoe',
        full_name: 'John Doe'
      });

      await createTestUser({
        email: 'jane@example.com',
        password: 'password123',
        username: 'janedoe',
        full_name: 'Jane Doe'
      });

      const results = await profileService.searchProfiles('doe');
      expect(results.length).toBe(2);

      const usernameResults = await profileService.searchProfiles('john');
      expect(usernameResults.length).toBe(1);
      expect(usernameResults[0].username).toBe('johndoe');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      const user = await createTestUser({
        email: 'mecijo@thetechnext.net',
        password: 'password123',
        username: 'test_user1',
        full_name: 'Test User1'
      });

      const newPreferences = {
        email_notifications: false,
        desktop_notifications: true,
        mobile_notifications: false,
        mention_notifications: true
      };

      await profileService.updateNotificationPreferences(user.id, newPreferences);

      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found after logout');
      }

      expect(profile.notification_preferences).toEqual(newPreferences);
    });
  });

  describe('admin operations', () => {
    it('should allow admin to delete profile', async () => {
      const admin = await createTestUser({
        email: 'admin@example.com',
        password: 'password123',
        username: 'admin',
        full_name: 'Admin User',
        is_admin: true
      });

      const user = await createTestUser({
        email: 'user@example.com',
        password: 'password123',
        username: 'user',
        full_name: 'Regular User'
      });

      await profileService.deleteProfile(user.id);

      const { data: deletedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      expect(deletedProfile).toBeNull();
    });

    it('should allow admin to set admin status', async () => {
      const user = await createTestUser({
        email: 'mecijo@thetechnext.net',
        password: 'password123',
        username: 'test_user1',
        full_name: 'Test User1'
      });

      await profileService.setAdminStatus(user.id, true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile) {
        throw new Error('Profile not found after logout');
      }

      expect(profile.is_admin).toBe(true);
    });
  });
}); 
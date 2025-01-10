import { supabase, supabaseAdmin } from '../config/supabase';
import { Profile } from '../types/database';

// Use admin client in test environment to bypass auth
const client = process.env.NODE_ENV === 'test' ? supabaseAdmin : supabase;

export class ProfileService {
  // Core Profile Operations
  async getProfileById(id: string): Promise<Profile> {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    // if (error) throw error;
    if (!data) throw new Error('Profile not found');

    return data;
  }

  async getProfileByUsername(username: string): Promise<Profile> {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    // if (error) throw error;
    if (!data) throw new Error('Profile not found');

    return data;
  }

  async updateProfile(id: string, data: Partial<Profile>): Promise<Profile> {
    // Don't allow updating certain fields
    delete data.id;
    delete data.created_at;
    delete data.email_verified;
    delete data.is_admin;

    const { data: updatedProfile, error } = await client
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!updatedProfile) throw new Error('Profile not found');

    return updatedProfile;
  }

  // Status Management
  async updateStatus(id: string, status: Profile['status'], customStatus?: string): Promise<void> {
		console.log('Updating status for user:', id, '\nwith status:', status, '\nand custom status:', customStatus);
    const { error } = await client
      .from('profiles')
      .update({
        status,
        custom_status: customStatus,
        last_seen_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  async updateLastSeen(id: string): Promise<void> {
    const { error } = await client
      .from('profiles')
      .update({
        last_seen_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
  }

  // Bulk Operations
  async getProfiles(ids: string[]): Promise<Profile[]> {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .in('id', ids);

    if (error) throw error;
    return data || [];
  }

  async searchProfiles(query: string): Promise<Profile[]> {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  }

  // Preferences
  async updateNotificationPreferences(
    id: string,
    preferences: Profile['notification_preferences']
  ): Promise<void> {
    const { error } = await client
      .from('profiles')
      .update({ notification_preferences: preferences })
      .eq('id', id);

    if (error) throw error;
  }

  async updateThemePreference(id: string, theme: Profile['theme_preference']): Promise<void> {
    const { error } = await client
      .from('profiles')
      .update({ theme_preference: theme })
      .eq('id', id);

    if (error) throw error;
  }

  // Admin Operations (always use supabaseAdmin)
  async deleteProfile(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async setAdminStatus(id: string, isAdmin: boolean): Promise<void> {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', id);

    if (error) throw error;
  }
}

export const profileService = new ProfileService(); 
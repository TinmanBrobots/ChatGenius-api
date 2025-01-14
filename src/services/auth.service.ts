import { SupabaseClient } from '@supabase/supabase-js';
import { getClientWithToken, supabase, supabaseAdmin } from '../config/supabase';
import { Database, Profile } from '../types/database';

export class AuthService {
  private client: SupabaseClient<Database>;

  constructor(token?: string) {
    console.log('token', token);
    this.client = token ? getClientWithToken(token) : supabaseAdmin;
  }

  async registerUser(
    email: string, 
    password: string, 
    username: string, 
    full_name: string
  ) {
    // First check if username is already taken
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      throw new Error('Username is already taken');
    }

    // Create auth user with regular client and require email verification
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.FRONTEND_URL}/login`,
        data: {
          username,
          full_name
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Create profile with admin client to bypass RLS
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email,
        username,
        full_name,
        status: 'offline',
        notification_preferences: {
          email_notifications: true,
          desktop_notifications: true,
          mobile_notifications: true,
          mention_notifications: true
        },
        theme_preference: 'system',
        email_verified: false,
        is_admin: false
      });

    if (profileError) {
      // If profile creation fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    // Return user data without session
    return { user: authData.user };
  }

  async loginUser(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Update profile status to online and last_seen
    const { error: updateError } = await this.client
      .from('profiles')
      .update({
        status: 'online',
        last_seen_at: new Date().toISOString()
      })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('Failed to update user status:', updateError);
    }

    // Get full profile data
    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      session: data.session,
      user: profile
    };
  }

  async logoutUser(userId: string) {
    // Update status to offline before logging out
    const { error: updateError } = await this.client
      .from('profiles')
      .update({
        status: 'offline',
        last_seen_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update user status:', updateError);
    }

    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async requestPasswordReset(email: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) throw error;
  }

  async updatePassword(userId: string, newPassword: string) {
    const { error } = await this.client.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    // Update last_seen timestamp
    const { error: updateError } = await this.client
      .from('profiles')
      .update({
        last_seen_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to update last seen:', updateError);
    }
  }

  async getCurrentUser(userId: string) {
    const { data: profile, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (!profile) throw new Error('Profile not found');

    return profile;
  }
}

export const authService = new AuthService(); 
import { supabase, supabaseAdmin } from '../config/supabase';

export class AuthService {
  async registerUser(email: string, password: string, username: string, full_name: string) {
    // Create auth user with regular client and require email verification
    const { data: authData, error: authError } = await supabase.auth.signUp({
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

    // Create profile with admin client to bypass RLS
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user?.id,
        username,
        full_name,
        status: 'offline'
      });

    if (profileError) throw profileError;

    // Return user data without session
    return { user: authData.user };
  }

  async loginUser(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Check if email is verified
    if (!data.user.email_confirmed_at) {
      throw new Error('Please verify your email before logging in');
    }

    return data;
  }

  async requestPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) throw error;
  }

  async updatePassword(newPassword: string) {
    // This should be called with the session from the reset password flow
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
  }
}

export const authService = new AuthService(); 
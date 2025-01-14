import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { supabaseAdmin } from '@/config/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { getClientWithToken } from '@/config/supabase';
import { Database } from '@/types/database';

export class AuthController {
  register = async (req: Request, res: Response) => {
    const { email, password, username, full_name } = req.body;
    
    try {
      const authService = new AuthService();
      const data = await authService.registerUser(email, password, username, full_name);
      res.status(201).json({ message: 'User registered successfully', data });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    try {
      const authService = new AuthService();
      const data = await authService.loginUser(email, password);
      res.json(data);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  requestPasswordReset = async (req: Request, res: Response) => {
    const { email } = req.body;

    try {
      const authService = new AuthService();
      await authService.requestPasswordReset(email);
      res.json({ message: 'Password reset email sent' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  updatePassword = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { password } = req.body;

    try {
      const authService = new AuthService(req.token);
      await authService.updatePassword(userId, password);
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

export const authController = new AuthController(); 
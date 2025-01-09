import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', req.user?.id)
      .single();

    if (!profile?.is_admin) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify admin status' });
    return;
  }
};

export const isProfileOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const profileId = req.params.id;
  
  if (profileId !== req.user?.id) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  next();
}; 
import { Request, Response, NextFunction } from 'express';
import { getClientWithToken } from '../config/supabase';
import '../types/express';

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const client = getClientWithToken(token);
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}; 
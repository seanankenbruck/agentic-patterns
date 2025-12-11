import { Request, Response, NextFunction } from 'express';

/**
 * Simple authentication middleware
 * In a real app, this would verify JWT tokens, API keys, etc.
 */

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Check for API key in header
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  // Simulate API key validation
  // In real app, this would check against database
  if (!apiKey.startsWith('sk_')) {
    res.status(401).json({ error: 'Invalid API key format' });
    return;
  }

  // Extract user ID from API key (simplified)
  // In real app, this would look up the API key in database
  const userId = apiKey.split('_')[1] || 'user1';
  req.userId = userId;

  next();
}

/**
 * Optional authentication - doesn't reject if no auth provided
 */
export function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (apiKey && apiKey.startsWith('sk_')) {
    const userId = apiKey.split('_')[1] || 'user1';
    req.userId = userId;
  }

  next();
}
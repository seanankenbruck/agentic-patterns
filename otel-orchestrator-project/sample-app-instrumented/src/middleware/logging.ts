import { Request, Response, NextFunction } from 'express';

/**
 * Simple request logging middleware
 * In a real app, this might use a proper logging library like Winston or Pino
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`;
    console.log(logMessage);
  });

  next();
}
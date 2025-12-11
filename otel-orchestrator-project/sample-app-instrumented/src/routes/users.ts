import { Router, Response } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { UserService } from '../services/userService';
import { AuthenticatedRequest, optionalAuthenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const userService = new UserService();
const tracer = trace.getTracer('http-routes');

/**
 * GET /users
 * Get all users
 */
router.get('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /users');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/users');
  
  try {
    const users = await userService.getAllUsers();
    span.setAttribute('http.status_code', 200);
    res.json({ users });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    next(error);
  } finally {
    span.end();
  }
});

/**
 * GET /users/:id
 * Get user by ID
 */
router.get('/:id', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /users/:id');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/users/:id');
  span.setAttribute('user.id', req.params.id);
  
  try {
    const user = await userService.getUserById(req.params.id);
    
    if (!user) {
      span.setAttribute('http.status_code', 404);
      throw new AppError(404, 'User not found');
    }

    span.setAttribute('http.status_code', 200);
    res.json({ user });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    next(error);
  } finally {
    span.end();
  }
});

/**
 * GET /users/:id/profile
 * Get detailed user profile
 */
router.get('/:id/profile', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /users/:id/profile');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/users/:id/profile');
  span.setAttribute('user.id', req.params.id);
  
  try {
    const profile = await userService.getUserProfile(req.params.id);
    
    if (!profile) {
      span.setAttribute('http.status_code', 404);
      throw new AppError(404, 'User not found');
    }

    span.setAttribute('http.status_code', 200);
    res.json({ profile });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    next(error);
  } finally {
    span.end();
  }
});

/**
 * POST /users
 * Create a new user
 */
router.post('/', async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('POST /users');
  span.setAttribute('http.method', 'POST');
  span.setAttribute('http.route', '/users');
  
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      span.setAttribute('http.status_code', 400);
      throw new AppError(400, 'Name and email are required');
    }

    const user = await userService.createUser(name, email);
    
    span.setAttribute('http.status_code', 201);
    res.status(201).json({ 
      user,
      message: 'User created successfully'
    });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    if (error instanceof Error) {
      if (error.message.includes('Invalid email') || error.message.includes('already registered')) {
        next(new AppError(400, error.message));
        return;
      }
    }
    next(error);
  } finally {
    span.end();
  }
});

export default router;
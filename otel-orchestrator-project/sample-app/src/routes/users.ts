import { Router, Response } from 'express';
import { UserService } from '../services/userService';
import { AuthenticatedRequest, optionalAuthenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const userService = new UserService();

/**
 * GET /users
 * Get all users
 */
router.get('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/:id
 * Get user by ID
 */
router.get('/:id', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/:id/profile
 * Get detailed user profile
 */
router.get('/:id/profile', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const profile = await userService.getUserProfile(req.params.id);
    
    if (!profile) {
      throw new AppError(404, 'User not found');
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /users
 * Create a new user
 */
router.post('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      throw new AppError(400, 'Name and email are required');
    }

    const user = await userService.createUser(name, email);
    
    res.status(201).json({ 
      user,
      message: 'User created successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid email') || error.message.includes('already registered')) {
        next(new AppError(400, error.message));
        return;
      }
    }
    next(error);
  }
});

export default router;
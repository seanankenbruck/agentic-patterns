import { db, User } from '../utils/database';
import { cache } from '../utils/cache';

export class UserService {
  /**
   * Get user by ID with caching
   */
  async getUserById(userId: string): Promise<User | null> {
    // Try cache first
    const cacheKey = `user:${userId}`;
    const cachedUser = await cache.get<User>(cacheKey);
    
    if (cachedUser) {
      return cachedUser;
    }

    // Cache miss - fetch from database
    const user = await db.findUserById(userId);
    
    if (user) {
      // Cache for 5 minutes
      await cache.set(cacheKey, user, 300);
    }

    return user;
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return await db.findAllUsers();
  }

  /**
   * Create a new user
   */
  async createUser(name: string, email: string): Promise<User> {
    // Validate email format (simple check)
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }

    // Check if email already exists
    const allUsers = await db.findAllUsers();
    const existingUser = allUsers.find(u => u.email === email);
    
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const user = await db.createUser({ name, email });

    // Cache the new user
    await cache.set(`user:${user.id}`, user, 300);

    return user;
  }

  /**
   * Get user profile with additional computed data
   */
  async getUserProfile(userId: string): Promise<{
    user: User;
    orderCount: number;
    memberSince: string;
  } | null> {
    const user = await this.getUserById(userId);
    
    if (!user) {
      return null;
    }

    // Get order count
    const orders = await db.findOrdersByUserId(userId);
    
    // Calculate membership duration
    const memberSince = this.formatMembershipDuration(user.createdAt);

    return {
      user,
      orderCount: orders.length,
      memberSince
    };
  }

  private formatMembershipDuration(createdAt: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years > 1 ? 's' : ''}`;
    }
  }
}
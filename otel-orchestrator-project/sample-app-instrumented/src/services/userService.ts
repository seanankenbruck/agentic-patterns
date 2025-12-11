import { trace } from '@opentelemetry/api';
import { db, User } from '../utils/database';
import { cache } from '../utils/cache';

const tracer = trace.getTracer('services');

export class UserService {
  /**
   * Get user by ID with caching
   */
  async getUserById(userId: string): Promise<User | null> {
    const span = tracer.startSpan('UserService.getUserById');
    span.setAttribute('user.id', userId);
    
    try {
      // Try cache first
      const cacheKey = `user:${userId}`;
      span.addEvent('checking_cache');
      const cachedUser = await cache.get<User>(cacheKey);
      
      if (cachedUser) {
        span.addEvent('cache_hit');
        return cachedUser;
      }

      // Cache miss - fetch from database
      span.addEvent('cache_miss');
      span.addEvent('querying_database');
      const user = await db.findUserById(userId);
      
      if (user) {
        // Cache for 5 minutes
        span.addEvent('caching_user');
        await cache.set(cacheKey, user, 300);
      }

      return user;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    const span = tracer.startSpan('UserService.getAllUsers');
    
    try {
      span.addEvent('querying_database');
      const users = await db.findAllUsers();
      span.setAttribute('users.count', users.length);
      return users;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create a new user
   */
  async createUser(name: string, email: string): Promise<User> {
    const span = tracer.startSpan('UserService.createUser');
    span.setAttribute('user.email', email);
    span.setAttribute('user.name', name);
    
    try {
      // Validate email format (simple check)
      span.addEvent('validating_email');
      if (!email.includes('@')) {
        throw new Error('Invalid email format');
      }

      // Check if email already exists
      span.addEvent('checking_email_exists');
      const allUsers = await db.findAllUsers();
      const existingUser = allUsers.find(u => u.email === email);
      
      if (existingUser) {
        throw new Error('Email already registered');
      }

      span.addEvent('creating_user_in_database');
      const user = await db.createUser({ name, email });

      // Cache the new user
      span.addEvent('caching_new_user');
      await cache.set(`user:${user.id}`, user, 300);

      span.setAttribute('user.id', user.id);
      return user;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get user profile with additional computed data
   */
  async getUserProfile(userId: string): Promise<{
    user: User;
    orderCount: number;
    memberSince: string;
  } | null> {
    const span = tracer.startSpan('UserService.getUserProfile');
    span.setAttribute('user.id', userId);
    
    try {
      span.addEvent('getting_user');
      const user = await this.getUserById(userId);
      
      if (!user) {
        span.addEvent('user_not_found');
        return null;
      }

      // Get order count
      span.addEvent('getting_orders');
      const orders = await db.findOrdersByUserId(userId);
      
      // Calculate membership duration
      span.addEvent('calculating_membership_duration');
      const memberSince = this.formatMembershipDuration(user.createdAt);

      const profile = {
        user,
        orderCount: orders.length,
        memberSince
      };

      span.setAttribute('profile.order_count', orders.length);
      span.setAttribute('profile.member_since', memberSince);

      return profile;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  private formatMembershipDuration(createdAt: Date): string {
    const span = tracer.startSpan('UserService.formatMembershipDuration');
    
    try {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      span.setAttribute('membership.days', diffDays);

      if (diffDays < 30) {
        return `${diffDays} days`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''}`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? 's' : ''}`;
      }
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}
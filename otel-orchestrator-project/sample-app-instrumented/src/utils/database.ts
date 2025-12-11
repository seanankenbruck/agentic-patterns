/**
 * Simulated database operations
 * In a real app, this would connect to PostgreSQL, MongoDB, etc.
 */

import { trace, SpanStatusCode } from '@opentelemetry/api';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
}

const tracer = trace.getTracer('database');

// Simulated database with delay
class Database {
  private users: Map<string, User> = new Map();
  private orders: Map<string, Order> = new Map();
  private products: Map<string, Product> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed some initial data
    this.users.set('user1', {
      id: 'user1',
      name: 'Alice Johnson',
      email: 'alice@example.com',
      createdAt: new Date('2023-01-15')
    });

    this.users.set('user2', {
      id: 'user2',
      name: 'Bob Smith',
      email: 'bob@example.com',
      createdAt: new Date('2023-03-20')
    });

    this.products.set('prod1', {
      id: 'prod1',
      name: 'Laptop',
      price: 1200,
      stockQuantity: 50
    });

    this.products.set('prod2', {
      id: 'prod2',
      name: 'Mouse',
      price: 25,
      stockQuantity: 200
    });

    this.orders.set('order1', {
      id: 'order1',
      userId: 'user1',
      productId: 'prod1',
      quantity: 1,
      totalAmount: 1200,
      status: 'delivered',
      createdAt: new Date('2023-06-10')
    });
  }

  // Simulate network delay for database operations
  private async simulateDelay(min: number = 50, max: number = 150): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async findUserById(id: string): Promise<User | null> {
    return tracer.startActiveSpan('db.findUserById', {
      attributes: {
        'db.operation': 'SELECT',
        'db.collection.name': 'users',
        'db.query.text': `SELECT * FROM users WHERE id = '${id}'`
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay();
        const result = this.users.get(id) || null;
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': result ? 1 : 0
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async findAllUsers(): Promise<User[]> {
    return tracer.startActiveSpan('db.findAllUsers', {
      attributes: {
        'db.operation': 'SELECT',
        'db.collection.name': 'users',
        'db.query.text': 'SELECT * FROM users'
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay(100, 200);
        const result = Array.from(this.users.values());
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': result.length
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    return tracer.startActiveSpan('db.createUser', {
      attributes: {
        'db.operation': 'INSERT',
        'db.collection.name': 'users',
        'db.query.text': `INSERT INTO users (name, email) VALUES ('${user.name}', '${user.email}')`
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay();
        const newUser: User = {
          id: `user${this.users.size + 1}`,
          ...user,
          createdAt: new Date()
        };
        this.users.set(newUser.id, newUser);
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': 1,
          'db.record.id': newUser.id
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return newUser;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async findOrderById(id: string): Promise<Order | null> {
    return tracer.startActiveSpan('db.findOrderById', {
      attributes: {
        'db.operation': 'SELECT',
        'db.collection.name': 'orders',
        'db.query.text': `SELECT * FROM orders WHERE id = '${id}'`
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay();
        const result = this.orders.get(id) || null;
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': result ? 1 : 0
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async findOrdersByUserId(userId: string): Promise<Order[]> {
    return tracer.startActiveSpan('db.findOrdersByUserId', {
      attributes: {
        'db.operation': 'SELECT',
        'db.collection.name': 'orders',
        'db.query.text': `SELECT * FROM orders WHERE userId = '${userId}'`
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay(100, 200);
        const result = Array.from(this.orders.values()).filter(order => order.userId === userId);
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': result.length
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async createOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    return tracer.startActiveSpan('db.createOrder', {
      attributes: {
        'db.operation': 'INSERT',
        'db.collection.name': 'orders',
        'db.query.text': `INSERT INTO orders (userId, productId, quantity, totalAmount, status) VALUES ('${order.userId}', '${order.productId}', ${order.quantity}, ${order.totalAmount}, '${order.status}')`
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay();
        const newOrder: Order = {
          id: `order${this.orders.size + 1}`,
          ...order,
          createdAt: new Date()
        };
        this.orders.set(newOrder.id, newOrder);
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': 1,
          'db.record.id': newOrder.id
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return newOrder;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
    return tracer.startActiveSpan('db.updateOrderStatus', {
      attributes: {
        'db.operation': 'UPDATE',
        'db.collection.name': 'orders',
        'db.query.text': `UPDATE orders SET status = '${status}' WHERE id = '${id}'`
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay();
        const order = this.orders.get(id);
        if (!order) {
          span.addEvent('query.end');
          span.setAttributes({
            'db.result.count': 0
          });
          span.setStatus({ code: SpanStatusCode.OK });
          return null;
        }
        order.status = status;
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': 1
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return order;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async findProductById(id: string): Promise<Product | null> {
    return tracer.startActiveSpan('db.findProductById', {
      attributes: {
        'db.operation': 'SELECT',
        'db.collection.name': 'products',
        'db.query.text': `SELECT * FROM products WHERE id = '${id}'`
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay();
        const result = this.products.get(id) || null;
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': result ? 1 : 0
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async findAllProducts(): Promise<Product[]> {
    return tracer.startActiveSpan('db.findAllProducts', {
      attributes: {
        'db.operation': 'SELECT',
        'db.collection.name': 'products',
        'db.query.text': 'SELECT * FROM products'
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay(100, 200);
        const result = Array.from(this.products.values());
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': result.length
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async updateProductStock(id: string, quantity: number): Promise<Product | null> {
    return tracer.startActiveSpan('db.updateProductStock', {
      attributes: {
        'db.operation': 'UPDATE',
        'db.collection.name': 'products',
        'db.query.text': `UPDATE products SET stockQuantity = ${quantity} WHERE id = '${id}'`
      }
    }, async (span) => {
      try {
        span.addEvent('query.start');
        await this.simulateDelay();
        const product = this.products.get(id);
        if (!product) {
          span.addEvent('query.end');
          span.setAttributes({
            'db.result.count': 0
          });
          span.setStatus({ code: SpanStatusCode.OK });
          return null;
        }
        product.stockQuantity = quantity;
        span.addEvent('query.end');
        span.setAttributes({
          'db.result.count': 1
        });
        span.setStatus({ code: SpanStatusCode.OK });
        return product;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

export const db = new Database();
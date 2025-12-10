/**
 * Simulated database operations
 * In a real app, this would connect to PostgreSQL, MongoDB, etc.
 */

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
    await this.simulateDelay();
    return this.users.get(id) || null;
  }

  async findAllUsers(): Promise<User[]> {
    await this.simulateDelay(100, 200);
    return Array.from(this.users.values());
  }

  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    await this.simulateDelay();
    const newUser: User = {
      id: `user${this.users.size + 1}`,
      ...user,
      createdAt: new Date()
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async findOrderById(id: string): Promise<Order | null> {
    await this.simulateDelay();
    return this.orders.get(id) || null;
  }

  async findOrdersByUserId(userId: string): Promise<Order[]> {
    await this.simulateDelay(100, 200);
    return Array.from(this.orders.values()).filter(order => order.userId === userId);
  }

  async createOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    await this.simulateDelay();
    const newOrder: Order = {
      id: `order${this.orders.size + 1}`,
      ...order,
      createdAt: new Date()
    };
    this.orders.set(newOrder.id, newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
    await this.simulateDelay();
    const order = this.orders.get(id);
    if (!order) return null;
    order.status = status;
    return order;
  }

  async findProductById(id: string): Promise<Product | null> {
    await this.simulateDelay();
    return this.products.get(id) || null;
  }

  async findAllProducts(): Promise<Product[]> {
    await this.simulateDelay(100, 200);
    return Array.from(this.products.values());
  }

  async updateProductStock(id: string, quantity: number): Promise<Product | null> {
    await this.simulateDelay();
    const product = this.products.get(id);
    if (!product) return null;
    product.stockQuantity = quantity;
    return product;
  }
}

export const db = new Database();
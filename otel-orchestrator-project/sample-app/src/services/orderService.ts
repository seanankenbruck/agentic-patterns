import { db, Order } from '../utils/database';
import { cache } from '../utils/cache';
import { externalAPI } from '../utils/externalAPI';

export class OrderService {
  /**
   * Get order by ID with caching
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const cacheKey = `order:${orderId}`;
    const cachedOrder = await cache.get<Order>(cacheKey);
    
    if (cachedOrder) {
      return cachedOrder;
    }

    const order = await db.findOrderById(orderId);
    
    if (order) {
      await cache.set(cacheKey, order, 180); // Cache for 3 minutes
    }

    return order;
  }

  /**
   * Get all orders for a user
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    return await db.findOrdersByUserId(userId);
  }

  /**
   * Create a new order with payment processing and inventory check
   */
  async createOrder(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<{ order: Order; success: boolean; message: string }> {
    // Verify user exists
    const user = await db.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get product details
    const product = await db.findProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check inventory availability
    const inventoryStatus = await externalAPI.checkInventory(productId);
    if (!inventoryStatus.available || inventoryStatus.quantity < quantity) {
      return {
        order: null as any,
        success: false,
        message: 'Insufficient inventory'
      };
    }

    // Calculate total amount
    const totalAmount = product.price * quantity;

    // Process payment
    const paymentResult = await externalAPI.processPayment(totalAmount, userId);
    
    if (!paymentResult.success) {
      return {
        order: null as any,
        success: false,
        message: 'Payment processing failed'
      };
    }

    // Create the order
    const order = await db.createOrder({
      userId,
      productId,
      quantity,
      totalAmount,
      status: 'pending'
    });

    // Update product stock
    await db.updateProductStock(productId, product.stockQuantity - quantity);

    // Cache the new order
    await cache.set(`order:${order.id}`, order, 180);

    // Send confirmation notification
    await externalAPI.sendNotification(
      userId,
      `Your order ${order.id} has been confirmed`,
      'email'
    );

    return {
      order,
      success: true,
      message: 'Order created successfully'
    };
  }

  /**
   * Update order status with notifications
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: Order['status']
  ): Promise<Order | null> {
    const order = await db.updateOrderStatus(orderId, newStatus);
    
    if (!order) {
      return null;
    }

    // Invalidate cache
    await cache.delete(`order:${orderId}`);

    // Send status update notification
    await externalAPI.sendNotification(
      order.userId,
      `Your order ${orderId} status: ${newStatus}`,
      'email'
    );

    return order;
  }

  /**
   * Get shipping quote for an order
   */
  async getShippingQuote(orderId: string, destinationZip: string): Promise<any> {
    const order = await this.getOrderById(orderId);
    
    if (!order) {
      throw new Error('Order not found');
    }

    const product = await db.findProductById(order.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Estimate weight (simplified)
    const estimatedWeight = order.quantity * 2; // 2 lbs per item

    const quotes = await externalAPI.getShippingQuote(destinationZip, estimatedWeight);

    return {
      orderId,
      quotes
    };
  }

  /**
   * Process order fulfillment workflow
   */
  async fulfillOrder(orderId: string): Promise<{
    success: boolean;
    message: string;
    steps: string[];
  }> {
    const steps: string[] = [];

    // Get order
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    steps.push('Order retrieved');

    // Check if already fulfilled
    if (order.status === 'delivered' || order.status === 'shipped') {
      return {
        success: false,
        message: 'Order already fulfilled',
        steps
      };
    }

    // Update to processing
    await this.updateOrderStatus(orderId, 'processing');
    steps.push('Status updated to processing');

    // Check inventory one more time
    const inventoryStatus = await externalAPI.checkInventory(order.productId);
    if (!inventoryStatus.available) {
      return {
        success: false,
        message: 'Inventory no longer available',
        steps
      };
    }
    steps.push('Inventory verified');

    // Simulate picking and packing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    steps.push('Order picked and packed');

    // Update to shipped
    await this.updateOrderStatus(orderId, 'shipped');
    steps.push('Order shipped');

    return {
      success: true,
      message: 'Order fulfilled successfully',
      steps
    };
  }
}
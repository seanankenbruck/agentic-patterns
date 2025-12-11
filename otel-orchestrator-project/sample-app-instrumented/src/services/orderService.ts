import { trace } from '@opentelemetry/api';
import { db, Order } from '../utils/database';
import { cache } from '../utils/cache';
import { externalAPI } from '../utils/externalAPI';

const tracer = trace.getTracer('services');

export class OrderService {
  /**
   * Get order by ID with caching
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const span = tracer.startSpan('OrderService.getOrderById');
    span.setAttribute('order.id', orderId);
    
    try {
      const cacheKey = `order:${orderId}`;
      
      span.addEvent('checking_cache');
      const cachedOrder = await cache.get<Order>(cacheKey);
      
      if (cachedOrder) {
        span.addEvent('cache_hit');
        span.setAttribute('cache.hit', true);
        return cachedOrder;
      }

      span.addEvent('cache_miss');
      span.setAttribute('cache.hit', false);
      
      span.addEvent('querying_database');
      const order = await db.findOrderById(orderId);
      
      if (order) {
        span.addEvent('caching_result');
        await cache.set(cacheKey, order, 180); // Cache for 3 minutes
        span.setAttribute('order.found', true);
      } else {
        span.setAttribute('order.found', false);
      }

      return order;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2 });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get all orders for a user
   */
  async getUserOrders(userId: string): Promise<Order[]> {
    const span = tracer.startSpan('OrderService.getUserOrders');
    span.setAttribute('user.id', userId);
    
    try {
      span.addEvent('querying_user_orders');
      const orders = await db.findOrdersByUserId(userId);
      span.setAttribute('orders.count', orders.length);
      return orders;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2 });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Create a new order with payment processing and inventory check
   */
  async createOrder(
    userId: string,
    productId: string,
    quantity: number
  ): Promise<{ order: Order; success: boolean; message: string }> {
    const span = tracer.startSpan('OrderService.createOrder');
    span.setAttribute('user.id', userId);
    span.setAttribute('product.id', productId);
    span.setAttribute('order.quantity', quantity);
    
    try {
      // Verify user exists
      span.addEvent('verifying_user');
      const user = await db.findUserById(userId);
      if (!user) {
        span.setAttribute('user.found', false);
        throw new Error('User not found');
      }
      span.setAttribute('user.found', true);

      // Get product details
      span.addEvent('fetching_product_details');
      const product = await db.findProductById(productId);
      if (!product) {
        span.setAttribute('product.found', false);
        throw new Error('Product not found');
      }
      span.setAttribute('product.found', true);
      span.setAttribute('product.price', product.price);

      // Check inventory availability
      span.addEvent('checking_inventory');
      const inventoryStatus = await externalAPI.checkInventory(productId);
      span.setAttribute('inventory.available', inventoryStatus.available);
      span.setAttribute('inventory.quantity', inventoryStatus.quantity);
      
      if (!inventoryStatus.available || inventoryStatus.quantity < quantity) {
        span.addEvent('insufficient_inventory');
        return {
          order: null as any,
          success: false,
          message: 'Insufficient inventory'
        };
      }

      // Calculate total amount
      const totalAmount = product.price * quantity;
      span.setAttribute('order.total_amount', totalAmount);

      // Process payment
      span.addEvent('processing_payment');
      const paymentResult = await externalAPI.processPayment(totalAmount, userId);
      span.setAttribute('payment.success', paymentResult.success);
      
      if (!paymentResult.success) {
        span.addEvent('payment_failed');
        return {
          order: null as any,
          success: false,
          message: 'Payment processing failed'
        };
      }

      // Create the order
      span.addEvent('creating_order');
      const order = await db.createOrder({
        userId,
        productId,
        quantity,
        totalAmount,
        status: 'pending'
      });
      span.setAttribute('order.created_id', order.id);

      // Update product stock
      span.addEvent('updating_product_stock');
      await db.updateProductStock(productId, product.stockQuantity - quantity);

      // Cache the new order
      span.addEvent('caching_new_order');
      await cache.set(`order:${order.id}`, order, 180);

      // Send confirmation notification
      span.addEvent('sending_confirmation_notification');
      await externalAPI.sendNotification(
        userId,
        `Your order ${order.id} has been confirmed`,
        'email'
      );

      span.addEvent('order_creation_completed');
      return {
        order,
        success: true,
        message: 'Order created successfully'
      };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2 });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Update order status with notifications
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: Order['status']
  ): Promise<Order | null> {
    const span = tracer.startSpan('OrderService.updateOrderStatus');
    span.setAttribute('order.id', orderId);
    span.setAttribute('order.new_status', newStatus);
    
    try {
      span.addEvent('updating_order_status');
      const order = await db.updateOrderStatus(orderId, newStatus);
      
      if (!order) {
        span.setAttribute('order.found', false);
        return null;
      }
      span.setAttribute('order.found', true);

      // Invalidate cache
      span.addEvent('invalidating_cache');
      await cache.delete(`order:${orderId}`);

      // Send status update notification
      span.addEvent('sending_status_notification');
      await externalAPI.sendNotification(
        order.userId,
        `Your order ${orderId} status: ${newStatus}`,
        'email'
      );

      return order;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2 });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get shipping quote for an order
   */
  async getShippingQuote(orderId: string, destinationZip: string): Promise<any> {
    const span = tracer.startSpan('OrderService.getShippingQuote');
    span.setAttribute('order.id', orderId);
    span.setAttribute('shipping.destination_zip', destinationZip);
    
    try {
      span.addEvent('fetching_order');
      const order = await this.getOrderById(orderId);
      
      if (!order) {
        span.setAttribute('order.found', false);
        throw new Error('Order not found');
      }
      span.setAttribute('order.found', true);

      span.addEvent('fetching_product_details');
      const product = await db.findProductById(order.productId);
      if (!product) {
        span.setAttribute('product.found', false);
        throw new Error('Product not found');
      }
      span.setAttribute('product.found', true);

      // Estimate weight (simplified)
      const estimatedWeight = order.quantity * 2; // 2 lbs per item
      span.setAttribute('shipping.estimated_weight', estimatedWeight);

      span.addEvent('requesting_shipping_quotes');
      const quotes = await externalAPI.getShippingQuote(destinationZip, estimatedWeight);
      span.setAttribute('shipping.quotes_count', quotes.length);

      return {
        orderId,
        quotes
      };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2 });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Process order fulfillment workflow
   */
  async fulfillOrder(orderId: string): Promise<{
    success: boolean;
    message: string;
    steps: string[];
  }> {
    const span = tracer.startSpan('OrderService.fulfillOrder');
    span.setAttribute('order.id', orderId);
    
    try {
      const steps: string[] = [];

      // Get order
      span.addEvent('retrieving_order');
      const order = await this.getOrderById(orderId);
      if (!order) {
        span.setAttribute('order.found', false);
        throw new Error('Order not found');
      }
      span.setAttribute('order.found', true);
      span.setAttribute('order.current_status', order.status);
      steps.push('Order retrieved');

      // Check if already fulfilled
      if (order.status === 'delivered' || order.status === 'shipped') {
        span.addEvent('order_already_fulfilled');
        return {
          success: false,
          message: 'Order already fulfilled',
          steps
        };
      }

      // Update to processing
      span.addEvent('updating_status_to_processing');
      await this.updateOrderStatus(orderId, 'processing');
      steps.push('Status updated to processing');

      // Check inventory one more time
      span.addEvent('final_inventory_check');
      const inventoryStatus = await externalAPI.checkInventory(order.productId);
      span.setAttribute('inventory.final_check_available', inventoryStatus.available);
      
      if (!inventoryStatus.available) {
        span.addEvent('inventory_no_longer_available');
        return {
          success: false,
          message: 'Inventory no longer available',
          steps
        };
      }
      steps.push('Inventory verified');

      // Simulate picking and packing delay
      span.addEvent('picking_and_packing');
      await new Promise(resolve => setTimeout(resolve, 100));
      steps.push('Order picked and packed');

      // Update to shipped
      span.addEvent('updating_status_to_shipped');
      await this.updateOrderStatus(orderId, 'shipped');
      steps.push('Order shipped');

      span.addEvent('fulfillment_completed');
      return {
        success: true,
        message: 'Order fulfilled successfully',
        steps
      };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2 });
      throw error;
    } finally {
      span.end();
    }
  }
}
import { trace } from '@opentelemetry/api';

/**
 * Simulated external API calls
 * In a real app, these would be HTTP requests to third-party services
 */

const tracer = trace.getTracer('external-api');

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
}

export interface ShippingQuote {
  carrier: string;
  estimatedDays: number;
  cost: number;
}

export interface InventoryStatus {
  productId: string;
  available: boolean;
  quantity: number;
  warehouse: string;
}

class ExternalAPI {
  private async simulateDelay(min: number = 100, max: number = 300): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Simulate payment processing through external gateway
   */
  async processPayment(amount: number, userId: string): Promise<PaymentResult> {
    return tracer.startActiveSpan('external.processPayment', {
      attributes: {
        'api.endpoint': '/payment/process',
        'api.method': 'POST',
        'payment.amount': amount,
        'payment.userId': userId
      }
    }, async (span) => {
      try {
        span.addEvent('payment.request.sent', {
          amount,
          userId
        });

        await this.simulateDelay(200, 500);
        
        // Simulate occasional failures
        const success = Math.random() > 0.1; // 90% success rate
        
        const result = {
          success,
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          amount
        };

        span.setAttributes({
          'response.status': success ? 200 : 400,
          'payment.success': success,
          'payment.transactionId': result.transactionId
        });

        span.addEvent('payment.response.received', {
          success,
          transactionId: result.transactionId
        });

        if (!success) {
          span.recordException(new Error('Payment processing failed'));
          span.setStatus({ code: 2, message: 'Payment failed' });
        } else {
          span.setStatus({ code: 1 });
        }

        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Simulate getting shipping quotes from carrier API
   */
  async getShippingQuote(destinationZip: string, weight: number): Promise<ShippingQuote[]> {
    return tracer.startActiveSpan('external.getShippingQuote', {
      attributes: {
        'api.endpoint': '/shipping/quote',
        'api.method': 'GET',
        'shipping.destinationZip': destinationZip,
        'shipping.weight': weight
      }
    }, async (span) => {
      try {
        span.addEvent('shipping.quote.request.sent', {
          destinationZip,
          weight
        });

        await this.simulateDelay(150, 400);
        
        const quotes = [
          {
            carrier: 'FastShip',
            estimatedDays: 2,
            cost: 12.99
          },
          {
            carrier: 'StandardPost',
            estimatedDays: 5,
            cost: 6.99
          },
          {
            carrier: 'ExpressAir',
            estimatedDays: 1,
            cost: 24.99
          }
        ];

        span.setAttributes({
          'response.status': 200,
          'shipping.quotes.count': quotes.length
        });

        span.addEvent('shipping.quote.response.received', {
          quotesCount: quotes.length,
          carriers: quotes.map(q => q.carrier)
        });

        span.setStatus({ code: 1 });
        return quotes;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Simulate checking inventory from warehouse management system
   */
  async checkInventory(productId: string): Promise<InventoryStatus> {
    return tracer.startActiveSpan('external.checkInventory', {
      attributes: {
        'api.endpoint': '/inventory/check',
        'api.method': 'GET',
        'inventory.productId': productId
      }
    }, async (span) => {
      try {
        span.addEvent('inventory.check.request.sent', {
          productId
        });

        await this.simulateDelay(100, 250);
        
        // Simulate some products being out of stock
        const available = Math.random() > 0.15; // 85% availability
        
        const result = {
          productId,
          available,
          quantity: available ? Math.floor(Math.random() * 100) + 1 : 0,
          warehouse: available ? ['WH-EAST', 'WH-WEST', 'WH-CENTRAL'][Math.floor(Math.random() * 3)] : 'NONE'
        };

        span.setAttributes({
          'response.status': 200,
          'inventory.available': available,
          'inventory.quantity': result.quantity,
          'inventory.warehouse': result.warehouse
        });

        span.addEvent('inventory.check.response.received', {
          available,
          quantity: result.quantity,
          warehouse: result.warehouse
        });

        span.setStatus({ code: 1 });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Simulate sending notification through external service
   */
  async sendNotification(userId: string, message: string, channel: 'email' | 'sms'): Promise<boolean> {
    return tracer.startActiveSpan('external.sendNotification', {
      attributes: {
        'api.endpoint': '/notifications/send',
        'api.method': 'POST',
        'notification.userId': userId,
        'notification.channel': channel,
        'notification.messageLength': message.length
      }
    }, async (span) => {
      try {
        span.addEvent('notification.request.sent', {
          userId,
          channel,
          messageLength: message.length
        });

        await this.simulateDelay(100, 300);
        
        // Simulate occasional failures
        const success = Math.random() > 0.05; // 95% success rate

        span.setAttributes({
          'response.status': success ? 200 : 500,
          'notification.success': success
        });

        span.addEvent('notification.response.received', {
          success
        });

        if (!success) {
          span.recordException(new Error('Notification sending failed'));
          span.setStatus({ code: 2, message: 'Notification failed' });
        } else {
          span.setStatus({ code: 1 });
        }

        return success;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

export const externalAPI = new ExternalAPI();
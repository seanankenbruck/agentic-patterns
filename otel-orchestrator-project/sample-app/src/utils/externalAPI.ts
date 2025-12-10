/**
 * Simulated external API calls
 * In a real app, these would be HTTP requests to third-party services
 */

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
    await this.simulateDelay(200, 500);
    
    // Simulate occasional failures
    const success = Math.random() > 0.1; // 90% success rate
    
    return {
      success,
      transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount
    };
  }

  /**
   * Simulate getting shipping quotes from carrier API
   */
  async getShippingQuote(destinationZip: string, weight: number): Promise<ShippingQuote[]> {
    await this.simulateDelay(150, 400);
    
    return [
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
  }

  /**
   * Simulate checking inventory from warehouse management system
   */
  async checkInventory(productId: string): Promise<InventoryStatus> {
    await this.simulateDelay(100, 250);
    
    // Simulate some products being out of stock
    const available = Math.random() > 0.15; // 85% availability
    
    return {
      productId,
      available,
      quantity: available ? Math.floor(Math.random() * 100) + 1 : 0,
      warehouse: available ? ['WH-EAST', 'WH-WEST', 'WH-CENTRAL'][Math.floor(Math.random() * 3)] : 'NONE'
    };
  }

  /**
   * Simulate sending notification through external service
   */
  async sendNotification(userId: string, message: string, channel: 'email' | 'sms'): Promise<boolean> {
    await this.simulateDelay(100, 300);
    
    // Simulate occasional failures
    return Math.random() > 0.05; // 95% success rate
  }
}

export const externalAPI = new ExternalAPI();
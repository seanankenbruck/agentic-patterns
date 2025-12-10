/**
 * Simulated cache operations (like Redis)
 */

class Cache {
  private store: Map<string, { value: any; expiresAt: number | null }> = new Map();

  private async simulateDelay(min: number = 10, max: number = 30): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async get<T>(key: string): Promise<T | null> {
    await this.simulateDelay();
    
    const item = this.store.get(key);
    if (!item) return null;

    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.simulateDelay();
    
    const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<boolean> {
    await this.simulateDelay();
    return this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    await this.simulateDelay();
    const item = this.store.get(key);
    
    if (!item) return false;
    
    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }
}

export const cache = new Cache();
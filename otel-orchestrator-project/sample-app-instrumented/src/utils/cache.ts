/**
 * Simulated cache operations (like Redis)
 */

import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('cache');

class Cache {
  private store: Map<string, { value: any; expiresAt: number | null }> = new Map();

  private async simulateDelay(min: number = 10, max: number = 30): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async get<T>(key: string): Promise<T | null> {
    return await tracer.startActiveSpan('cache.get', { attributes: { 'cache.key': key } }, async (span) => {
      try {
        await this.simulateDelay();
        
        const item = this.store.get(key);
        if (!item) {
          span.setAttributes({ 'cache.hit': false });
          span.addEvent('cache.miss');
          span.setStatus({ code: SpanStatusCode.OK });
          return null;
        }

        // Check expiration
        if (item.expiresAt && Date.now() > item.expiresAt) {
          this.store.delete(key);
          span.setAttributes({ 'cache.hit': false });
          span.addEvent('cache.miss', { reason: 'expired' });
          span.setStatus({ code: SpanStatusCode.OK });
          return null;
        }

        span.setAttributes({ 'cache.hit': true });
        span.addEvent('cache.hit');
        span.setStatus({ code: SpanStatusCode.OK });
        return item.value as T;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    return await tracer.startActiveSpan('cache.set', { attributes: { 'cache.key': key, 'cache.ttl': ttlSeconds || 0 } }, async (span) => {
      try {
        await this.simulateDelay();
        
        const expiresAt = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null;
        this.store.set(key, { value, expiresAt });
        
        span.addEvent('cache.set');
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async delete(key: string): Promise<boolean> {
    return await tracer.startActiveSpan('cache.delete', { attributes: { 'cache.key': key } }, async (span) => {
      try {
        await this.simulateDelay();
        const result = this.store.delete(key);
        
        span.setAttributes({ 'cache.deleted': result });
        span.addEvent('cache.delete');
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async exists(key: string): Promise<boolean> {
    return await tracer.startActiveSpan('cache.exists', { attributes: { 'cache.key': key } }, async (span) => {
      try {
        await this.simulateDelay();
        const item = this.store.get(key);
        
        if (!item) {
          span.setAttributes({ 'cache.exists': false });
          span.addEvent('cache.not_exists');
          span.setStatus({ code: SpanStatusCode.OK });
          return false;
        }
        
        // Check expiration
        if (item.expiresAt && Date.now() > item.expiresAt) {
          this.store.delete(key);
          span.setAttributes({ 'cache.exists': false });
          span.addEvent('cache.not_exists', { reason: 'expired' });
          span.setStatus({ code: SpanStatusCode.OK });
          return false;
        }
        
        span.setAttributes({ 'cache.exists': true });
        span.addEvent('cache.exists');
        span.setStatus({ code: SpanStatusCode.OK });
        return true;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

export const cache = new Cache();
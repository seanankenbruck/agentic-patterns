import { trace } from '@opentelemetry/api';
import { db, Product } from '../utils/database';
import { cache } from '../utils/cache';
import { externalAPI } from '../utils/externalAPI';

const tracer = trace.getTracer('services');

export class ProductService {
  /**
   * Get product by ID with caching
   */
  async getProductById(productId: string): Promise<Product | null> {
    const span = tracer.startSpan('ProductService.getProductById');
    span.setAttribute('product.id', productId);
    
    try {
      const cacheKey = `product:${productId}`;
      
      span.addEvent('checking_cache');
      const cachedProduct = await cache.get<Product>(cacheKey);
      
      if (cachedProduct) {
        span.setAttribute('cache.hit', true);
        span.addEvent('cache_hit');
        return cachedProduct;
      }

      span.setAttribute('cache.hit', false);
      span.addEvent('cache_miss');
      span.addEvent('querying_database');
      const product = await db.findProductById(productId);
      
      if (product) {
        span.addEvent('caching_product');
        await cache.set(cacheKey, product, 600); // Cache for 10 minutes
        span.setAttribute('product.found', true);
      } else {
        span.setAttribute('product.found', false);
      }

      return product;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get all products
   */
  async getAllProducts(): Promise<Product[]> {
    const span = tracer.startSpan('ProductService.getAllProducts');
    
    try {
      span.addEvent('querying_database');
      const products = await db.findAllProducts();
      span.setAttribute('products.count', products.length);
      return products;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get product with real-time inventory status
   */
  async getProductWithInventory(productId: string): Promise<{
    product: Product;
    inventory: {
      available: boolean;
      quantity: number;
      warehouse: string;
    };
  } | null> {
    const span = tracer.startSpan('ProductService.getProductWithInventory');
    span.setAttribute('product.id', productId);
    
    try {
      span.addEvent('fetching_product');
      const product = await this.getProductById(productId);
      
      if (!product) {
        span.setAttribute('product.found', false);
        return null;
      }

      span.setAttribute('product.found', true);
      span.addEvent('checking_external_inventory');
      // Check real-time inventory from external system
      const inventoryStatus = await externalAPI.checkInventory(productId);

      span.setAttribute('inventory.available', inventoryStatus.available);
      span.setAttribute('inventory.quantity', inventoryStatus.quantity);
      span.setAttribute('inventory.warehouse', inventoryStatus.warehouse);

      return {
        product,
        inventory: {
          available: inventoryStatus.available,
          quantity: inventoryStatus.quantity,
          warehouse: inventoryStatus.warehouse
        }
      };
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Search products by name (simple implementation)
   */
  async searchProducts(query: string): Promise<Product[]> {
    const span = tracer.startSpan('ProductService.searchProducts');
    span.setAttribute('search.query', query);
    
    try {
      span.addEvent('fetching_all_products');
      const allProducts = await db.findAllProducts();
      span.setAttribute('products.total_count', allProducts.length);
      
      span.addEvent('filtering_products');
      const searchTerm = query.toLowerCase();
      const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm)
      );
      
      span.setAttribute('products.filtered_count', filteredProducts.length);
      return filteredProducts;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(threshold: number = 20): Promise<Product[]> {
    const span = tracer.startSpan('ProductService.getLowStockProducts');
    span.setAttribute('stock.threshold', threshold);
    
    try {
      span.addEvent('fetching_all_products');
      const allProducts = await db.findAllProducts();
      span.setAttribute('products.total_count', allProducts.length);
      
      span.addEvent('filtering_low_stock_products');
      const lowStockProducts = allProducts.filter(product => product.stockQuantity < threshold);
      span.setAttribute('products.low_stock_count', lowStockProducts.length);
      
      return lowStockProducts;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}
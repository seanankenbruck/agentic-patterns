import { db, Product } from '../utils/database';
import { cache } from '../utils/cache';
import { externalAPI } from '../utils/externalAPI';

export class ProductService {
  /**
   * Get product by ID with caching
   */
  async getProductById(productId: string): Promise<Product | null> {
    const cacheKey = `product:${productId}`;
    const cachedProduct = await cache.get<Product>(cacheKey);
    
    if (cachedProduct) {
      return cachedProduct;
    }

    const product = await db.findProductById(productId);
    
    if (product) {
      await cache.set(cacheKey, product, 600); // Cache for 10 minutes
    }

    return product;
  }

  /**
   * Get all products
   */
  async getAllProducts(): Promise<Product[]> {
    return await db.findAllProducts();
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
    const product = await this.getProductById(productId);
    
    if (!product) {
      return null;
    }

    // Check real-time inventory from external system
    const inventoryStatus = await externalAPI.checkInventory(productId);

    return {
      product,
      inventory: {
        available: inventoryStatus.available,
        quantity: inventoryStatus.quantity,
        warehouse: inventoryStatus.warehouse
      }
    };
  }

  /**
   * Search products by name (simple implementation)
   */
  async searchProducts(query: string): Promise<Product[]> {
    const allProducts = await db.findAllProducts();
    
    const searchTerm = query.toLowerCase();
    return allProducts.filter(product => 
      product.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get products with low stock
   */
  async getLowStockProducts(threshold: number = 20): Promise<Product[]> {
    const allProducts = await db.findAllProducts();
    return allProducts.filter(product => product.stockQuantity < threshold);
  }
}
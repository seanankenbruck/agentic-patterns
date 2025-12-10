import { Router, Response } from 'express';
import { ProductService } from '../services/productService';
import { AuthenticatedRequest, optionalAuthenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const productService = new ProductService();

/**
 * GET /products
 * Get all products
 */
router.get('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const products = await productService.getAllProducts();
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/search
 * Search products by name
 */
router.get('/search', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      throw new AppError(400, 'Search query (q) is required');
    }

    const products = await productService.searchProducts(q);
    res.json({ 
      query: q,
      count: products.length,
      products 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/low-stock
 * Get products with low stock
 */
router.get('/low-stock', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { threshold } = req.query;
    const thresholdNumber = threshold ? parseInt(threshold as string) : 20;

    if (isNaN(thresholdNumber)) {
      throw new AppError(400, 'Threshold must be a number');
    }

    const products = await productService.getLowStockProducts(thresholdNumber);
    res.json({ 
      threshold: thresholdNumber,
      count: products.length,
      products 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/:id
 * Get product by ID
 */
router.get('/:id', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /products/:id/inventory
 * Get product with real-time inventory status
 */
router.get('/:id/inventory', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await productService.getProductWithInventory(req.params.id);
    
    if (!result) {
      throw new AppError(404, 'Product not found');
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
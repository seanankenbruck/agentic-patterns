import { Router, Response } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { ProductService } from '../services/productService';
import { AuthenticatedRequest, optionalAuthenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const productService = new ProductService();
const tracer = trace.getTracer('http-routes');

/**
 * GET /products
 * Get all products
 */
router.get('/', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /products');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/products');
  
  try {
    const products = await productService.getAllProducts();
    span.setAttribute('http.status_code', 200);
    span.setAttribute('products.count', products.length);
    res.json({ products });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    next(error);
  } finally {
    span.end();
  }
});

/**
 * GET /products/search
 * Search products by name
 */
router.get('/search', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /products/search');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/products/search');
  
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      span.setAttribute('http.status_code', 400);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Search query (q) is required' });
      throw new AppError(400, 'Search query (q) is required');
    }

    span.setAttribute('search.query', q);
    const products = await productService.searchProducts(q);
    span.setAttribute('http.status_code', 200);
    span.setAttribute('products.count', products.length);
    res.json({ 
      query: q,
      count: products.length,
      products 
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    next(error);
  } finally {
    span.end();
  }
});

/**
 * GET /products/low-stock
 * Get products with low stock
 */
router.get('/low-stock', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /products/low-stock');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/products/low-stock');
  
  try {
    const { threshold } = req.query;
    const thresholdNumber = threshold ? parseInt(threshold as string) : 20;

    if (isNaN(thresholdNumber)) {
      span.setAttribute('http.status_code', 400);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Threshold must be a number' });
      throw new AppError(400, 'Threshold must be a number');
    }

    span.setAttribute('inventory.threshold', thresholdNumber);
    const products = await productService.getLowStockProducts(thresholdNumber);
    span.setAttribute('http.status_code', 200);
    span.setAttribute('products.count', products.length);
    res.json({ 
      threshold: thresholdNumber,
      count: products.length,
      products 
    });
  } catch (error) {
    if (!(error instanceof AppError)) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    next(error);
  } finally {
    span.end();
  }
});

/**
 * GET /products/:id
 * Get product by ID
 */
router.get('/:id', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /products/:id');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/products/:id');
  span.setAttribute('product.id', req.params.id);
  
  try {
    const product = await productService.getProductById(req.params.id);
    
    if (!product) {
      span.setAttribute('http.status_code', 404);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Product not found' });
      throw new AppError(404, 'Product not found');
    }

    span.setAttribute('http.status_code', 200);
    res.json({ product });
  } catch (error) {
    if (!(error instanceof AppError)) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    next(error);
  } finally {
    span.end();
  }
});

/**
 * GET /products/:id/inventory
 * Get product with real-time inventory status
 */
router.get('/:id/inventory', optionalAuthenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /products/:id/inventory');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/products/:id/inventory');
  span.setAttribute('product.id', req.params.id);
  
  try {
    const result = await productService.getProductWithInventory(req.params.id);
    
    if (!result) {
      span.setAttribute('http.status_code', 404);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Product not found' });
      throw new AppError(404, 'Product not found');
    }

    span.setAttribute('http.status_code', 200);
    res.json(result);
  } catch (error) {
    if (!(error instanceof AppError)) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
    }
    next(error);
  } finally {
    span.end();
  }
});

export default router;
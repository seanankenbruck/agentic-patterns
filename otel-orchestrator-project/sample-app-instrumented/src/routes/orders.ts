import { Router, Response } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { OrderService } from '../services/orderService';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const orderService = new OrderService();
const tracer = trace.getTracer('http-routes');

/**
 * GET /orders/:id
 * Get order by ID
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /orders/:id');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/orders/:id');
  span.setAttribute('order.id', req.params.id);
  
  try {
    const order = await orderService.getOrderById(req.params.id);
    
    if (!order) {
      span.setAttribute('http.status_code', 404);
      throw new AppError(404, 'Order not found');
    }

    span.setAttribute('http.status_code', 200);
    res.json({ order });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    next(error);
  } finally {
    span.end();
  }
});

/**
 * GET /orders/user/:userId
 * Get all orders for a user
 */
router.get('/user/:userId', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /orders/user/:userId');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/orders/user/:userId');
  span.setAttribute('user.id', req.params.userId);
  
  try {
    const orders = await orderService.getUserOrders(req.params.userId);
    span.setAttribute('http.status_code', 200);
    span.setAttribute('orders.count', orders.length);
    res.json({ orders });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    next(error);
  } finally {
    span.end();
  }
});

/**
 * POST /orders
 * Create a new order
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('POST /orders');
  span.setAttribute('http.method', 'POST');
  span.setAttribute('http.route', '/orders');
  
  try {
    const { userId, productId, quantity } = req.body;
    
    span.setAttribute('user.id', userId);
    span.setAttribute('product.id', productId);
    span.setAttribute('order.quantity', quantity);

    if (!userId || !productId || !quantity) {
      span.setAttribute('http.status_code', 400);
      throw new AppError(400, 'userId, productId, and quantity are required');
    }

    if (quantity <= 0) {
      span.setAttribute('http.status_code', 400);
      throw new AppError(400, 'Quantity must be greater than 0');
    }

    const result = await orderService.createOrder(userId, productId, quantity);
    
    if (!result.success) {
      span.setAttribute('http.status_code', 400);
      throw new AppError(400, result.message);
    }

    span.setAttribute('http.status_code', 201);
    span.setAttribute('order.id', result.order?.id);
    res.status(201).json({
      order: result.order,
      message: result.message
    });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    if (error instanceof Error && !error.hasOwnProperty('statusCode')) {
      if (error.message.includes('not found')) {
        next(new AppError(404, error.message));
        return;
      }
    }
    next(error);
  } finally {
    span.end();
  }
});

/**
 * PATCH /orders/:id/status
 * Update order status
 */
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('PATCH /orders/:id/status');
  span.setAttribute('http.method', 'PATCH');
  span.setAttribute('http.route', '/orders/:id/status');
  span.setAttribute('order.id', req.params.id);
  
  try {
    const { status } = req.body;
    span.setAttribute('order.status', status);

    if (!status) {
      span.setAttribute('http.status_code', 400);
      throw new AppError(400, 'Status is required');
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered'];
    if (!validStatuses.includes(status)) {
      span.setAttribute('http.status_code', 400);
      throw new AppError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await orderService.updateOrderStatus(req.params.id, status);
    
    if (!order) {
      span.setAttribute('http.status_code', 404);
      throw new AppError(404, 'Order not found');
    }

    span.setAttribute('http.status_code', 200);
    res.json({
      order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    next(error);
  } finally {
    span.end();
  }
});

/**
 * GET /orders/:id/shipping-quote
 * Get shipping quotes for an order
 */
router.get('/:id/shipping-quote', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('GET /orders/:id/shipping-quote');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/orders/:id/shipping-quote');
  span.setAttribute('order.id', req.params.id);
  
  try {
    const { zip } = req.query;
    span.setAttribute('shipping.zip', zip as string);

    if (!zip || typeof zip !== 'string') {
      span.setAttribute('http.status_code', 400);
      throw new AppError(400, 'Destination zip code is required');
    }

    const result = await orderService.getShippingQuote(req.params.id, zip);
    span.setAttribute('http.status_code', 200);
    res.json(result);
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError(404, error.message));
      return;
    }
    next(error);
  } finally {
    span.end();
  }
});

/**
 * POST /orders/:id/fulfill
 * Fulfill an order
 */
router.post('/:id/fulfill', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  const span = tracer.startSpan('POST /orders/:id/fulfill');
  span.setAttribute('http.method', 'POST');
  span.setAttribute('http.route', '/orders/:id/fulfill');
  span.setAttribute('order.id', req.params.id);
  
  try {
    const result = await orderService.fulfillOrder(req.params.id);
    
    if (!result.success) {
      span.setAttribute('http.status_code', 400);
      throw new AppError(400, result.message);
    }

    span.setAttribute('http.status_code', 200);
    res.json(result);
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError(404, error.message));
      return;
    }
    next(error);
  } finally {
    span.end();
  }
});

export default router;
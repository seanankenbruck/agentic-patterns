import { Router, Response } from 'express';
import { OrderService } from '../services/orderService';
import { AuthenticatedRequest, authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const orderService = new OrderService();

/**
 * GET /orders/:id
 * Get order by ID
 */
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    
    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /orders/user/:userId
 * Get all orders for a user
 */
router.get('/user/:userId', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const orders = await orderService.getUserOrders(req.params.userId);
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /orders
 * Create a new order
 */
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { userId, productId, quantity } = req.body;

    if (!userId || !productId || !quantity) {
      throw new AppError(400, 'userId, productId, and quantity are required');
    }

    if (quantity <= 0) {
      throw new AppError(400, 'Quantity must be greater than 0');
    }

    const result = await orderService.createOrder(userId, productId, quantity);
    
    if (!result.success) {
      throw new AppError(400, result.message);
    }

    res.status(201).json({
      order: result.order,
      message: result.message
    });
  } catch (error) {
    if (error instanceof Error && !error.hasOwnProperty('statusCode')) {
      if (error.message.includes('not found')) {
        next(new AppError(404, error.message));
        return;
      }
    }
    next(error);
  }
});

/**
 * PATCH /orders/:id/status
 * Update order status
 */
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      throw new AppError(400, 'Status is required');
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered'];
    if (!validStatuses.includes(status)) {
      throw new AppError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await orderService.updateOrderStatus(req.params.id, status);
    
    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    res.json({
      order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /orders/:id/shipping-quote
 * Get shipping quotes for an order
 */
router.get('/:id/shipping-quote', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { zip } = req.query;

    if (!zip || typeof zip !== 'string') {
      throw new AppError(400, 'Destination zip code is required');
    }

    const result = await orderService.getShippingQuote(req.params.id, zip);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError(404, error.message));
      return;
    }
    next(error);
  }
});

/**
 * POST /orders/:id/fulfill
 * Fulfill an order
 */
router.post('/:id/fulfill', authenticate, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await orderService.fulfillOrder(req.params.id);
    
    if (!result.success) {
      throw new AppError(400, result.message);
    }

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      next(new AppError(404, error.message));
      return;
    }
    next(error);
  }
});

export default router;
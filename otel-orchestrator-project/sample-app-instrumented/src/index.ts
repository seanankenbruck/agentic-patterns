import express from 'express';
import userRoutes from './routes/users';
import orderRoutes from './routes/orders';
import productRoutes from './routes/products';
import { requestLogger } from './middleware/logging';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET    /api/users`);
  console.log(`  GET    /api/users/:id`);
  console.log(`  GET    /api/users/:id/profile`);
  console.log(`  POST   /api/users`);
  console.log(`  GET    /api/orders/:id`);
  console.log(`  GET    /api/orders/user/:userId`);
  console.log(`  POST   /api/orders`);
  console.log(`  PATCH  /api/orders/:id/status`);
  console.log(`  GET    /api/orders/:id/shipping-quote`);
  console.log(`  POST   /api/orders/:id/fulfill`);
  console.log(`  GET    /api/products`);
  console.log(`  GET    /api/products/:id`);
  console.log(`  GET    /api/products/:id/inventory`);
  console.log(`  GET    /api/products/search?q=<query>`);
  console.log(`  GET    /api/products/low-stock?threshold=<number>`);
});

export default app;
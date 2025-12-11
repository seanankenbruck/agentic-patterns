# Sample Express Application

A realistic Express/TypeScript application designed to demonstrate OpenTelemetry instrumentation patterns.

## Architecture

```
src/
├── index.ts              # Main Express app
├── routes/               # API route handlers
│   ├── users.ts         # User endpoints
│   ├── orders.ts        # Order endpoints
│   └── products.ts      # Product endpoints
├── services/             # Business logic layer
│   ├── userService.ts
│   ├── orderService.ts
│   └── productService.ts
├── middleware/           # Express middleware
│   ├── auth.ts          # Authentication
│   ├── errorHandler.ts  # Error handling
│   └── logging.ts       # Request logging
└── utils/                # External dependencies (simulated)
    ├── database.ts      # Simulated database
    ├── cache.ts         # Simulated cache (Redis)
    └── externalAPI.ts   # Simulated external APIs
```

## Features

### Multi-layer Architecture
- **Routes**: Handle HTTP requests/responses
- **Services**: Business logic with multiple async operations
- **Utils**: Simulated external dependencies (DB, cache, APIs)

### Realistic Async Operations
- Database queries with simulated latency
- Cache operations (get/set/delete)
- External API calls (payment, shipping, inventory)
- Complex workflows (order fulfillment)

### Middleware
- Request logging
- Authentication (simple API key)
- Error handling
- 404 handler

## Installation

```bash
npm install
```

## Running the App

```bash
# Development mode with ts-node
npm run dev

# Build and run production
npm run build
npm start
```

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:id/profile` - Get detailed user profile
- `POST /api/users` - Create new user

### Orders
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/user/:userId` - Get user's orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/orders/:id/shipping-quote?zip=12345` - Get shipping quotes
- `POST /api/orders/:id/fulfill` - Fulfill an order

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/:id/inventory` - Get product with inventory status
- `GET /api/products/search?q=laptop` - Search products
- `GET /api/products/low-stock?threshold=20` - Get low stock products

## Authentication

Most endpoints accept an optional `x-api-key` header:
```
x-api-key: sk_user1
```

Some endpoints (like creating orders) require authentication.

## Example Requests

```bash
# Get all products
curl http://localhost:3000/api/products

# Get user profile
curl http://localhost:3000/api/users/user1/profile

# Create an order (requires auth)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_user1" \
  -d '{"userId":"user1","productId":"prod1","quantity":1}'

# Fulfill an order
curl -X POST http://localhost:3000/api/orders/order1/fulfill \
  -H "x-api-key: sk_user1"
```

## What Makes This Good for OTel Instrumentation?

1. **Multiple async operations** - DB, cache, external APIs
2. **Complex workflows** - Order fulfillment with multiple steps
3. **Service layer** - Clear instrumentation boundaries
4. **Error scenarios** - Payment failures, out of stock, etc.
5. **Nested operations** - Services calling other services
6. **Different operation types**:
   - HTTP requests (Express routes)
   - Database queries
   - Cache operations
   - External API calls
   - Business logic functions

This structure allows the orchestrator to demonstrate various instrumentation patterns:
- HTTP span creation at route handlers
- Custom spans in service layer
- Span attributes for important data
- Error recording
- Span events for significant operations
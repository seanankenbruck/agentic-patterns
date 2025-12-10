# OpenTelemetry Orchestrator-Workers Project

This project demonstrates the **orchestrator-workers agentic workflow pattern** applied to automatic OpenTelemetry instrumentation of Express applications.

## Project Structure

```
orchestrator-worker/
├── sample-app/              # Target application to be instrumented
│   ├── src/
│   │   ├── index.ts        # Main Express app
│   │   ├── routes/         # API endpoints (users, orders, products)
│   │   ├── services/       # Business logic layer
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Simulated external dependencies
│   ├── package.json
│   └── README.md
│
└── orchestrator-workflow/    # TO BE BUILT - The agentic workflow
    └── src/
        ├── orchestrator.ts  # Main orchestrator logic
        ├── workers/         # Specialized worker implementations
        └── types.ts         # Shared types and interfaces
```

## The Sample Application

### What It Does
A realistic Express/TypeScript e-commerce API with:
- **User management** - Create users, get profiles
- **Order processing** - Complex workflows with payment, inventory checks
- **Product catalog** - Search, inventory status
- **External dependencies** - Simulated database, cache, and external APIs

### Why This App?
Perfect for OTel instrumentation because it has:
1. **Multiple layers** - Routes → Services → Utils
2. **Async operations** - DB queries, cache, external APIs
3. **Complex workflows** - Order fulfillment with multiple steps
4. **Various operation types** - HTTP, database, cache, external calls
5. **Error scenarios** - Payment failures, stock issues

### Key Files
- `src/index.ts` - Express app setup, route registration
- `src/routes/*.ts` - HTTP handlers for different resources
- `src/services/*.ts` - Business logic with multiple async operations
- `src/utils/database.ts` - Simulated DB with delays
- `src/utils/cache.ts` - Simulated Redis cache
- `src/utils/externalAPI.ts` - Simulated payment/shipping APIs

## The Orchestrator-Workers Pattern

### What We'll Build

An intelligent system that:

1. **Orchestrator** analyzes the codebase and creates a dynamic plan:
   - Reads all TypeScript files
   - Identifies instrumentation opportunities
   - Determines what OTel packages are needed
   - Creates specialized tasks for workers
   - Synthesizes results into final instrumented code

2. **Workers** handle specific instrumentation tasks:
   - **Dependency Worker** - Updates package.json with OTel packages
   - **Config Worker** - Creates OTel initialization code
   - **HTTP Worker** - Instruments Express routes
   - **Service Worker** - Adds custom spans to business logic
   - **Database Worker** - Instruments database operations
   - **Cache Worker** - Instruments cache operations
   - **External API Worker** - Instruments external API calls

### Why Orchestrator-Workers?

This pattern is ideal because:
- **Dynamic discovery** - Can't predict which files need what instrumentation
- **Specialized workers** - Different instrumentation strategies per component type
- **Complex synthesis** - Must coordinate changes across multiple files
- **Variable scope** - Could be 3 files or 30 files depending on the app

### Architecture Flow

```
User: "Instrument this Express app with OpenTelemetry"
         ↓
    ORCHESTRATOR
    - Analyzes codebase structure
    - Identifies Express app, routes, services
    - Determines OTel SDK is needed
    - Creates task assignments
         ↓
    ┌────────┴─────────┐
    ↓                  ↓
DEPENDENCY          CONFIG
WORKER              WORKER
Updates             Creates
package.json        tracing.ts
    ↓                  ↓
    └────────┬─────────┘
         ↓
    ┌────────┴─────────┬────────┬────────┐
    ↓                  ↓        ↓        ↓
HTTP WORKER      SERVICE   DATABASE  CACHE
Instruments      WORKER    WORKER    WORKER
routes/*.ts      ...       ...       ...
         ↓
    ORCHESTRATOR
    - Synthesizes all changes
    - Validates instrumentation
    - Generates summary report
         ↓
    Instrumented Application
```
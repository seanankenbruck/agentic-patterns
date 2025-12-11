import {
  CodebaseAnalysis,
  InstrumentationTask,
  OrchestrationPlan,
  WorkerType,
  TaskContext
} from '../types';

 /**
   * Create an orchestration plan from codebase analysis
   */
export class Orchestrator {
  static createPlan(analysis: CodebaseAnalysis): OrchestrationPlan {
    const tasks: InstrumentationTask[] = [];
    let taskIdCounter = 0;

    const generateTaskId = (type: WorkerType) => `${type}-${++taskIdCounter}`;

    // Task 1: Update dependencies (highest priority, no dependencies)
    if (analysis.dependencies.missing.length > 0) {
      tasks.push({
        id: generateTaskId('dependency'),
        type: 'dependency',
        targetFile: 'package.json',
        instructions: this.createDependencyInstructions(analysis),
        priority: 1,
        dependencies: [],
        context: this.createTaskContext(analysis, [])
      });
    }

    // Task 2: Create OTel configuration (depends on dependencies)
    const configTaskId = generateTaskId('config');
    tasks.push({
      id: configTaskId,
      type: 'config',
      targetFile: 'src/tracing.ts',
      instructions: this.createConfigInstructions(analysis),
      priority: 2,
      dependencies: tasks.filter(t => t.type === 'dependency').map(t => t.id),
      context: this.createTaskContext(analysis, [])
    });

    // Tasks 3+: Instrument individual files (depends on config)
    const fileInstrumentationTasks = this.createFileInstrumentationTasks(
      analysis,
      configTaskId,
      taskIdCounter
    );
    
    tasks.push(...fileInstrumentationTasks);
    taskIdCounter += fileInstrumentationTasks.length;

    // Create execution order based on dependencies
    const executionOrder = this.calculateExecutionOrder(tasks);

    return {
      analysis,
      tasks,
      executionOrder,
      estimatedDuration: this.estimateDuration(tasks)
    };
  }

  /**
   * Create file instrumentation tasks
   */
  private static createFileInstrumentationTasks(
    analysis: CodebaseAnalysis,
    configTaskId: string,
    startingId: number
  ): InstrumentationTask[] {
    const tasks: InstrumentationTask[] = [];
    let taskId = startingId;

    for (const file of analysis.files) {
      const workerType = this.selectWorkerType(file);
      
      if (workerType) {
        taskId++;
        tasks.push({
          id: `${workerType}-${taskId}`,
          type: workerType,
          targetFile: file.path,
          instructions: this.createFileInstructions(file, workerType),
          priority: 3,
          dependencies: [configTaskId],
          context: this.createTaskContext(analysis, [file])
        });
      }
    }

    return tasks;
  }

  /**
   * Select appropriate worker type for a file
   */
  private static selectWorkerType(file: any): WorkerType | null {
    switch (file.type) {
      case 'route':
        return 'http';
      case 'service':
        return 'service';
      case 'utility':
        // Check what kind of utility
        if (file.path.includes('database')) return 'database';
        if (file.path.includes('cache')) return 'cache';
        if (file.path.includes('external') || file.path.includes('api')) return 'external-api';
        return null;
      default:
        return null;
    }
  }

  /**
   * Create instructions for dependency worker
   */
  private static createDependencyInstructions(analysis: CodebaseAnalysis): string {
    return `
You are a dependency management worker. Your task is to update package.json with OpenTelemetry packages.

Required packages to add:
${analysis.dependencies.missing.map(pkg => `- ${pkg}`).join('\n')}

Instructions:
1. Add these packages to the "dependencies" section
2. Use the versions specified in the required dependencies list
3. Maintain proper JSON formatting
4. Keep existing dependencies intact

Return the complete updated package.json file.
    `.trim();
  }

  /**
   * Create instructions for config worker
   */
  private static createConfigInstructions(analysis: CodebaseAnalysis): string {
    return `
You are an OpenTelemetry configuration worker. Your task is to create a tracing initialization file.

Framework detected: ${analysis.framework}
Entry point: ${analysis.entryPoint}

Instructions:
1. Create a new file called "tracing.ts" (or "tracing.js" for JavaScript)
2. Import necessary OpenTelemetry packages:
   - @opentelemetry/sdk-node
   - @opentelemetry/auto-instrumentations-node
   - @opentelemetry/exporter-trace-otlp-http
3. Initialize the NodeSDK with:
   - Service name: Extract from package.json or use "sample-app"
   - Auto-instrumentations for ${analysis.framework}
   - Console exporter for development
   - Optional OTLP exporter for production
4. Export a function to start tracing
5. Add proper TypeScript types

Return the complete tracing.ts file content.
    `.trim();
  }

  /**
   * Create instructions for file instrumentation
   */
  private static createFileInstructions(
    file: any,
    workerType: WorkerType
  ): string {
    const baseInstructions = `
You are a ${workerType} instrumentation worker. Your task is to add OpenTelemetry spans to the following file.

File: ${file.path}
Type: ${file.type}
Has async operations: ${file.hasAsyncOperations}

Functions in this file:
${file.functions.map((f: any) => `- ${f.name} (async: ${f.isAsync}, calls DB: ${f.callsDatabase}, calls cache: ${f.callsCache}, calls external API: ${f.callsExternalAPIs})`).join('\n')}
    `.trim();

    const specificInstructions = this.getWorkerSpecificInstructions(workerType);

    return `${baseInstructions}\n\n${specificInstructions}`;
  }

  /**
   * Get worker-specific instrumentation instructions
   */
  private static getWorkerSpecificInstructions(workerType: WorkerType): string {
    switch (workerType) {
      case 'http':
        return `
HTTP Instrumentation Instructions:
1. Import tracer: import { trace } from '@opentelemetry/api';
2. Get tracer instance: const tracer = trace.getTracer('http-routes');
3. For each route handler:
   - Start a span with a descriptive name (e.g., 'GET /users/:id')
   - Add attributes: http.method, http.route, http.status_code
   - Wrap the handler logic in the span context
   - End the span when the response is sent
   - Record errors if they occur
4. Preserve the existing error handling logic
5. Maintain TypeScript types

Example pattern:
router.get('/:id', async (req, res, next) => {
  const span = tracer.startSpan('GET /users/:id');
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.route', '/users/:id');
  span.setAttribute('user.id', req.params.id);
  
  try {
    // existing logic
    span.setAttribute('http.status_code', 200);
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
});

Return the complete instrumented file.
        `.trim();

      case 'service':
        return `
Service Layer Instrumentation Instructions:
1. Import tracer: import { trace } from '@opentelemetry/api';
2. Get tracer instance: const tracer = trace.getTracer('services');
3. For each public method:
   - Start a span with format: 'ServiceName.methodName'
   - Add relevant attributes (e.g., userId, orderId, productId)
   - Use span.addEvent() for significant operations
   - Record any errors
4. For async operations, ensure proper span context propagation
5. Preserve all existing logic and TypeScript types

Example pattern:
async getUserById(userId: string): Promise<User | null> {
  const span = tracer.startSpan('UserService.getUserById');
  span.setAttribute('user.id', userId);
  
  try {
    span.addEvent('checking_cache');
    // cache check logic
    
    span.addEvent('querying_database');
    // database query logic
    
    return user;
  } catch (error) {
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

Return the complete instrumented file.
        `.trim();

      case 'database':
        return `
Database Instrumentation Instructions:
1. Import tracer: import { trace } from '@opentelemetry/api';
2. Get tracer instance: const tracer = trace.getTracer('database');
3. For each database operation:
   - Start a span with operation name (e.g., 'db.findUserById')
   - Add attributes: db.operation, db.collection/table, query parameters
   - Add event for query execution
   - Record query duration
4. Preserve simulated delays and all existing logic

Return the complete instrumented file.
        `.trim();

      case 'cache':
        return `
Cache Instrumentation Instructions:
1. Import tracer: import { trace } from '@opentelemetry/api';
2. Get tracer instance: const tracer = trace.getTracer('cache');
3. For each cache operation (get, set, delete):
   - Start a span with operation name (e.g., 'cache.get')
   - Add attributes: cache.key, cache.hit (for get operations)
   - Record cache hit/miss events
4. Preserve all existing logic

Return the complete instrumented file.
        `.trim();

      case 'external-api':
        return `
External API Instrumentation Instructions:
1. Import tracer: import { trace } from '@opentelemetry/api';
2. Get tracer instance: const tracer = trace.getTracer('external-api');
3. For each external API call:
   - Start a span with API name (e.g., 'external.processPayment')
   - Add attributes: api.endpoint, api.method, response.status
   - Add events for request/response
   - Record any errors or failures
4. Preserve all existing logic

Return the complete instrumented file.
        `.trim();

      default:
        return '';
    }
  }

  /**
   * Create task context
   */
  private static createTaskContext(
    analysis: CodebaseAnalysis,
    relevantFiles: any[]
  ): TaskContext {
    return {
      allFiles: analysis.files.map(f => f.path),
      relevantFiles,
      dependencies: analysis.dependencies
    };
  }

  /**
   * Calculate execution order based on task dependencies
   */
  private static calculateExecutionOrder(tasks: InstrumentationTask[]): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();
    const remaining = [...tasks];

    while (remaining.length > 0) {
      // Find tasks that can be executed (all dependencies completed)
      const batch = remaining.filter(task => 
        task.dependencies.every(dep => completed.has(dep))
      );

      if (batch.length === 0) {
        throw new Error('Circular dependency detected in tasks');
      }

      // Add batch to execution order
      order.push(batch.map(t => t.id));

      // Mark tasks as completed
      batch.forEach(task => {
        completed.add(task.id);
        const index = remaining.indexOf(task);
        remaining.splice(index, 1);
      });
    }

    return order;
  }

  /**
   * Estimate duration for all tasks
   */
  private static estimateDuration(tasks: InstrumentationTask[]): string {
    // Rough estimate: 10 seconds per task
    const seconds = tasks.length * 10;
    
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
}
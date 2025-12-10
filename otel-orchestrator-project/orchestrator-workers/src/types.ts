/**
 * Type definitions for OpenTelemetry Orchestrator-Workers System
 */

// CODEBASE ANALYSIS TYPES
export interface CodebaseAnalysis {
    files: FileAnalysis[];
    dependencies: DependencyInfo;
    framework: 'express' | 'fastify' | 'nestjs' | 'unknown';
    entryPoint: string;
}

export interface FileAnalysis {
    path: string;
    type: 'route' | 'service' | 'utility' | 'middleware' | 'config' | 'entry';
    imports: string[];
    exports: string[];
    functions: FunctionInfo[];
    hasAsyncOperations: boolean;
}

export interface DependencyInfo {
    current: PackageDependency[];
    required: PackageDependency[];
    missing: string[]; // Package names that need to be added
}

export interface PackageDependency {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
}

export interface FunctionInfo {
    name: string;
    isAsync: boolean;
    parameters: ParameterInfo[];
    callsExternalAPIs: boolean;
    callsDatabase: boolean;
    callsCache: boolean;
    startLine: number;
    endLine: number;
}

export interface ParameterInfo {
    name: string;
    type?: string; // TypeScript type if available
}

// ORCHESTRATOR TASK TYPES
export interface InstrumentationTask {
    id: string;
    type: WorkerType;
    targetFile: string;
    instructions: string; // Instructions for worker LLM
    priority: number; // Lower number = higher priority
    dependencies: string[]; // Task IDs the task depends on
    context: TaskContext;
}

export interface TaskContext {
    allFiles: string[]; // All file paths in the codebase
    relevantFiles: FileAnalysis[]; // Files relevant to this task
    dependencies: DependencyInfo;
}

export type WorkerType = 
  | 'dependency'      // Updates package.json
  | 'config'          // Creates tracing initialization
  | 'http'            // Instruments HTTP routes
  | 'service'         // Instruments service layer
  | 'database'        // Instruments database calls
  | 'cache'           // Instruments cache operations
  | 'external-api';   // Instruments external API calls

// WORKER RESULT TYPES
export interface WorkerResult {
    taskId: string;
    workerType: WorkerType;
    success: boolean;
    changes: FileChange[];
    message: string;
    errors?: string[];
    warnings?: string[];
}

export interface FileChange {
    path: string;
    operation: 'create' | 'modify' | 'none';
    originalContent?: string;
    newContent?: string;
    description: string; // Human-readable description of the change
}

// ORCHESTRATOR TYPES
export interface OrchestrationPlan {
    analysis: CodebaseAnalysis;
    tasks: InstrumentationTask[];
    executionOrder: string[][]; // Array of task ID batches (parallel execution within batch)
    estimatedDuration: string;
}

export interface OrchestrationResult {
    success: boolean;
    plan: OrchestrationPlan;
    workerResults: WorkerResult[];
    summary: InstrumentationSummary;
    errors: string[];
}

export interface InstrumentationSummary {
    filesAnalyzed: number;
    filesModified: number;
    filesCreated: number;
    instrumentationPoints: InstrumentationPoint[];
    packagesAdded: string[];
    duration: number; // milliseconds
}

export interface InstrumentationPoint {
    file: string;
    type: 'span' | 'attribute' | 'event' | 'init';
    location: string; // e.g., "userService.getUserById"
    description: string;
}

// OPENTELEMETRY CONFIGURATION TYPES
export interface OTelConfig {
    serviceName: string;
    instrumentations: string[]; // e.g., ['http', 'express', 'winston']
    exporters: ExporterConfig[];
    samplingRate: number; // 0.0 to 1.0
}

export interface ExporterConfig {
    type: 'console' | 'otlp' | 'jaeger' | 'zipkin';
    endpoint?: string;
    headers?: Record<string, string>;
}

// WORKER INTERFACE
export interface Worker {
    type: WorkerType;
    execute(task: InstrumentationTask): Promise<WorkerResult>;
}

// UTILITY TYPES
export interface FileContent {
    path: string;
    content: string;
}

export interface CodeSnippet {
    file: string;
    startLine: number;
    endLine: number;
    content: string;
}
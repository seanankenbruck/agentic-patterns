import {
  InstrumentationTask,
  InstrumentationSummary,
  OrchestrationPlan,
  OrchestrationResult,
  WorkerResult
} from '../types.js';
import { DependencyWorker } from '../workers/dependencyWorker.js';
import { ConfigWorker } from '../workers/configWorker.js';
import { FileInstrumentationWorker } from '../workers/fileInstrumentationWorker.js';
import { AnthropicClient } from '../utils/anthropicClient.js';


export class WorkerExecutor {
  private client: AnthropicClient;
  private rootPath: string;

  constructor(client: AnthropicClient, rootPath: string) {
    this.client = client;
    this.rootPath = rootPath;
  }
  

  async execute(plan: OrchestrationPlan): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const workerResults: WorkerResult[] = [];
    const errors: string[] = [];

    // Loop through execution order (batches of parallel tasks)
    for (const batchIds of plan.executionOrder) {
        // Get tasks for this batch
        const batchTasks = plan.tasks.filter(task => batchIds.includes(task.id));
        
        // Execute all tasks in this batch in parallel
        const batchResults = await Promise.all(
        batchTasks.map(task => this.executeTask(task))
        );
        
        // Collect results
        workerResults.push(...batchResults);
        
        // Collect errors from failed tasks
        for (const result of batchResults) {
            if (!result.success && result.errors) {
                errors.push(...result.errors);
            }
        }
        
        // If any task in batch failed critically, could stop here
        // (For now, we'll continue and collect all results)
    }

    const duration = Date.now() - startTime;
    const summary = this.createSummary(plan, workerResults, duration);
    
    // Success if all workers succeeded
    const success = workerResults.every(r => r.success);

    return {
        success,
        plan,
        workerResults,
        summary,
        errors
    };
  }

  private async executeTask(task: InstrumentationTask): Promise<WorkerResult> {
    // Create appropriate worker based on task type
    let worker;
    
    if (task.type === 'dependency') {
        worker = new DependencyWorker(this.client, this.rootPath);
    } else if (task.type === 'config') {
        worker = new ConfigWorker(this.client, this.rootPath);
    } else {
        // http, service, database, cache, external-api
        worker = new FileInstrumentationWorker(this.client, this.rootPath, task.type);
    }
    
    // Execute and return result
    return await worker.execute(task);
  }

  private createSummary(
    plan: OrchestrationPlan,
    results: WorkerResult[],
    duration: number
  ): InstrumentationSummary {
    // Count files analyzed (from plan)
    const filesAnalyzed = plan.analysis.files.length;
    
    // Count files modified and created
    let filesModified = 0;
    let filesCreated = 0;
    
    for (const result of results) {
        for (const change of result.changes) {
        if (change.operation === 'modify') {
            filesModified++;
        } else if (change.operation === 'create') {
            filesCreated++;
        }
        }
    }
    
    // Extract instrumentation points (simplified for now)
    const instrumentationPoints = results
        .filter(r => r.success && r.workerType !== 'dependency')
        .map(r => ({
        file: r.changes[0]?.path || 'unknown',
        type: 'span' as const,
        location: r.workerType,
        description: r.message
        }));
    
    // Get packages added
    const packagesAdded = plan.analysis.dependencies.missing;

    return {
        filesAnalyzed,
        filesModified,
        filesCreated,
        instrumentationPoints,
        packagesAdded,
        duration
    };
  }
}
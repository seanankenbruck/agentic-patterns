import {
  InstrumentationTask,
  WorkerResult,
  WorkerType,
  FileChange
} from '../types';
import { AnthropicClient } from '../utils/anthropicClient';

export abstract class BaseWorker {
  protected client: AnthropicClient;
  protected workerType: WorkerType;

  constructor(client: AnthropicClient, workerType: WorkerType) {
    this.client = client;
    this.workerType = workerType;
  }

  /**
   * Execute the task - must be implemented by concrete workers
   */
  abstract execute(task: InstrumentationTask): Promise<WorkerResult>;

  /**
   * Create a successful result
   */
  protected createSuccessResult(
    taskId: string,
    changes: FileChange[],
    message: string
  ): WorkerResult {
    return {
      taskId,
      workerType: this.workerType,
      success: true,
      changes,
      message,
      errors: [],
      warnings: []
    };
  }

  /**
   * Create a failure result
   */
  protected createFailureResult(
    taskId: string,
    error: string,
    changes: FileChange[] = []
  ): WorkerResult {
    return {
      taskId,
      workerType: this.workerType,
      success: false,
      changes,
      message: 'Task failed',
      errors: [error]
    };
  }

  /**
   * Get system prompt for worker
   */
  protected abstract getSystemPrompt(): string;

  /**
   * Build user prompt for worker
   */
  protected abstract buildUserPrompt(task: InstrumentationTask, ...args: any[]): string;
}
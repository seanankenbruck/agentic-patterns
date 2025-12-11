import { BaseWorker } from './baseWorker.js';
import {
  InstrumentationTask,
  WorkerResult,
  FileChange,
  WorkerType
} from '../types.js';
import { AnthropicClient } from '../utils/anthropicClient.js';
import { FileSystemUtil } from '../utils/fileSystem.js';
import * as path from 'path';

export class FileInstrumentationWorker extends BaseWorker {
    private rootPath: string;

    constructor(client: AnthropicClient, rootPath: string, workerType: WorkerType) {
    super(client, workerType);
    this.rootPath = rootPath;
  }

  async execute(task: InstrumentationTask): Promise<WorkerResult> {
    try {
      // Build full file path
      const filePath = path.join(this.rootPath, task.targetFile);

      // Read original file content
      const originalContent = FileSystemUtil.readFile(filePath);

      // Build prompts
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildUserPrompt(task, originalContent);

      // Get LLM response (higher token limit for code files)
      const response = await this.client.generateCompletion(
        systemPrompt,
        userPrompt,
        6000
      );

      // Extract code from response
      const newContent = this.extractCode(response.content);

      // Create file change
      const change: FileChange = {
        path: task.targetFile,
        operation: 'modify',
        originalContent,
        newContent,
        description: this.getInstrumentationDescription()
      };

      return this.createSuccessResult(
        task.id,
        [change],
        `Successfully instrumented ${task.targetFile}`
      );
      
    } catch (error) {
      return this.createFailureResult(
        task.id,
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  protected getSystemPrompt(): string {
    return `
You are an OpenTelemetry instrumentation expert.

Your task is to add tracing spans to existing code while:
1. Preserving ALL existing functionality and logic
2. Maintaining proper TypeScript types
3. Importing required OpenTelemetry packages (@opentelemetry/api)
4. Adding spans that capture important operations
5. Including proper error handling and span status
6. Following OpenTelemetry best practices

Return ONLY the complete instrumented file content. Do not include explanations or extra commentary.
    `.trim();
  }

  protected buildUserPrompt(task: InstrumentationTask, originalContent: string): string {
    return `
${task.instructions}

Original file content:
${originalContent}

Please return the complete instrumented file with OpenTelemetry spans added.
Preserve all existing functionality and maintain TypeScript types.
Return ONLY the code, no markdown code blocks or explanations.
    `.trim();
  }

  private extractCode(content: string): string {
    // Try to extract from TypeScript code block
    const tsMatch = content.match(/```(?:typescript|ts)\n([\s\S]*?)\n```/);
    if (tsMatch) {
      return tsMatch[1].trim();
    }

    // Try to extract from generic code block
    const codeMatch = content.match(/```\n([\s\S]*?)\n```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }

    // Return as-is if no code block
    return content.trim();
  }

  private getInstrumentationDescription(): string {
    const descriptions: Record<WorkerType, string> = {
      'http': 'Added OpenTelemetry spans to HTTP routes',
      'service': 'Added OpenTelemetry spans to service methods',
      'database': 'Added OpenTelemetry spans to database operations',
      'cache': 'Added OpenTelemetry spans to cache operations',
      'external-api': 'Added OpenTelemetry spans to external API calls',
      'dependency': 'Updated dependencies', // Won't be used here but needed for type
      'config': 'Created configuration' // Won't be used here but needed for type
    };

    return descriptions[this.workerType];
  }
}
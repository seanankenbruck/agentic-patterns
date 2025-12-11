import { BaseWorker } from './baseWorker.js';
import {
  InstrumentationTask,
  WorkerResult,
  FileChange
} from '../types.js';
import { AnthropicClient } from '../utils/anthropicClient.js';
import * as path from 'path';

export class ConfigWorker extends BaseWorker {
  private rootPath: string;

  constructor(client: AnthropicClient, rootPath: string) {
    super(client, 'config');
    this.rootPath = rootPath;
  }

  async execute(task: InstrumentationTask): Promise<WorkerResult> {
    try {
      // Build prompt
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildUserPrompt(task);

      // Get LLM response
      const response = await this.client.generateCompletion(
        systemPrompt,
        userPrompt,
        3000
      );

      // Extract code from response
      const newContent = this.extractCode(response.content);

      const change: FileChange = {
        path: task.targetFile,
        operation: 'create',
        newContent,
        description: 'Created OpenTelemetry tracing initialization file'
      };

      return this.createSuccessResult(
        task.id,
        [change],
        'Successfully created tracing configuration file'
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
You are an OpenTelemetry configuration expert.

Your task is to create tracing initialization files that:
1. Import necessary OpenTelemetry packages
2. Configure the NodeSDK with appropriate instrumentations
3. Set up exporters (console for dev, OTLP for production)
4. Provide a clean initialization function
5. Include proper TypeScript types and error handling
6. Follow best practices for OpenTelemetry setup

Return ONLY the complete file content. Do not include explanations or extra commentary.
    `.trim();
  }

  protected buildUserPrompt(task: InstrumentationTask): string {
    return `
${task.instructions}

Please create a complete tracing initialization file.

The file should:
- Export a function called 'initTracing()' that starts the SDK
- Use environment variables for configuration (OTEL_EXPORTER_OTLP_ENDPOINT, etc.)
- Include console exporter by default for development
- Handle errors gracefully
- Use TypeScript with proper types

Return ONLY the file content, no markdown code blocks or explanations.
    `.trim();
  }

  /**
   * Extract code from LLM response (handles code blocks)
   */
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
}
import { BaseWorker } from './baseWorker';
import {
  InstrumentationTask,
  WorkerResult,
  FileChange
} from '../types';
import { AnthropicClient } from '../utils/anthropicClient';
import { FileSystemUtil } from '../utils/fileSystem';
import * as path from 'path';

export class DependencyWorker extends BaseWorker {
  private rootPath: string;

  constructor(client: AnthropicClient, rootPath: string) {
    super(client, 'dependency');
    this.rootPath = rootPath;
  }

  async execute(task: InstrumentationTask): Promise<WorkerResult> {
    try {
      // Read current package.json
      const packageJsonPath = path.join(this.rootPath, task.targetFile);
      const originalContent = FileSystemUtil.readFile(packageJsonPath);

      // Build prompt
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildUserPrompt(task, originalContent);

      // Get LLM response
      const response = await this.client.generateCompletion(
        systemPrompt,
        userPrompt,
        2000
      );

      // Extract JSON from response
      const newContent = this.extractJSON(response.content);

      // Validate it's valid JSON
      JSON.parse(newContent); // Will throw if invalid

      const change: FileChange = {
        path: task.targetFile,
        operation: 'modify',
        originalContent,
        newContent,
        description: 'Added OpenTelemetry dependencies to package.json'
      };

      return this.createSuccessResult(
        task.id,
        [change],
        'Successfully updated package.json with OpenTelemetry dependencies'
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
You are a dependency management expert specializing in Node.js and OpenTelemetry.

Your task is to update package.json files to include OpenTelemetry packages while:
1. Maintaining proper JSON formatting
2. Preserving all existing dependencies
3. Adding new dependencies in alphabetical order
4. Using appropriate version numbers

Return ONLY the complete updated package.json content. Do not include any explanations or markdown code blocks.
    `.trim();
  }

  protected buildUserPrompt(task: InstrumentationTask, originalContent: string): string {
    return `
${task.instructions}

Current package.json:
${originalContent}

Please return the updated package.json with the required OpenTelemetry packages added.
Return ONLY the JSON content, no markdown code blocks or explanations.
    `.trim();
  }

  /**
   * Extract JSON from LLM response (handles code blocks)
   */
  private extractJSON(content: string): string {
    // Try to extract from code block
    const codeBlockMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Return as-is if no code block
    return content.trim();
  }
}
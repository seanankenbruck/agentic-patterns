// src/index.ts

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { AnthropicClient } from './utils/anthropicClient.js';
import { FileSystemUtil } from './utils/fileSystem.js';
import { CodebaseAnalyzer } from './analyzer/codebaseAnalyzer.js';
import { Orchestrator } from './orchestrator/orchestrator.js';
import { WorkerExecutor } from './executor/workerExecutor.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

async function main() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not found in environment');
    }

    console.log("🚀 Starting Orchestrator-Worker Test\n");
    console.log("=".repeat(80));

    // Create client and summarizer
    const client = new AnthropicClient(apiKey);

    const sampleAppPath = path.join(__dirname, '../../sample-app');
    const outputPath = path.join(__dirname, '../../sample-app-instrumented');

    console.log('🔍 Step 1: Analyzing codebase...');
    const files = await FileSystemUtil.readCodebase(sampleAppPath);
    const analysis = CodebaseAnalyzer.analyze(files, sampleAppPath);

    // Print comprehensive analysis summary
    console.log(`\n📊 Analysis Summary:`);
    console.log(`  Files analyzed: ${analysis.files.length}`);

    // Group files by type
    const filesByType = analysis.files.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`  File types:`);
    Object.entries(filesByType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });

    // Count total functions and async operations
    const totalFunctions = analysis.files.reduce((sum, file) => sum + file.functions.length, 0);
    const filesWithAsync = analysis.files.filter(f => f.hasAsyncOperations).length;
    console.log(`  Total functions: ${totalFunctions}`);
    console.log(`  Files with async operations: ${filesWithAsync}`);

    // Framework and entry point
    console.log(`  Framework: ${analysis.framework}`);
    console.log(`  Entry point: ${analysis.entryPoint || 'Not detected'}`);

    // Dependencies
    console.log(`  Dependencies:`);
    console.log(`    - Current packages: ${analysis.dependencies.current.length}`);
    console.log(`    - Required OTel packages: ${analysis.dependencies.required.length}`);
    console.log(`    - Missing packages: ${analysis.dependencies.missing.length}`);
    if (analysis.dependencies.missing.length > 0) {
      console.log(`      Missing: ${analysis.dependencies.missing.join(', ')}`);
    }


    console.log('\n📋 Step 2: Creating orchestration plan...');
    // TODO: Create plan using Orchestrator.createPlan()
    const plan = Orchestrator.createPlan(analysis);
    // TODO: Print plan summary (tasks, execution order, estimated duration)
    

    console.log('\n⚙️  Step 3: Executing instrumentation...');
    // TODO: Create AnthropicClient
    // TODO: Create WorkerExecutor
    // TODO: Execute plan using executor.execute()

    console.log('\n📊 Step 4: Results summary...');
    // TODO: Print orchestration result summary
    // TODO: Show success/failure status
    // TODO: List files modified/created
    // TODO: Show any errors

    console.log('\n💾 Step 5: Writing instrumented files...');
    // TODO: Copy sample-app to sample-app-instrumented
    // TODO: Apply all file changes from worker results
    // TODO: Print completion message

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Helper function to apply file changes
// async function applyChanges(
//   outputPath: string,
//   changes: FileChange[]
// ): Promise<void> {
//   // TODO: For each change:
//   //   - Build full output path
//   //   - Write newContent to file using FileSystemUtil.writeFile()
//   //   - Print what was done
// }

// // Helper function to print plan summary
// function printPlanSummary(plan: OrchestrationPlan): void {
//   // TODO: Print:
//   //   - Total tasks
//   //   - Tasks by type
//   //   - Execution order (batches)
//   //   - Estimated duration
// }

// // Helper function to print results summary
// function printResultsSummary(result: OrchestrationResult): void {
//   // TODO: Print:
//   //   - Success status
//   //   - Files analyzed/modified/created
//   //   - Packages added
//   //   - Duration
//   //   - Instrumentation points
//   //   - Any errors
// }

main();
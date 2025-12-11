// src/index.ts

import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { AnthropicClient } from './utils/anthropicClient.js';
import { FileSystemUtil } from './utils/fileSystem.js';
import { CodebaseAnalyzer } from './analyzer/codebaseAnalyzer.js';
import { Orchestrator } from './orchestrator/orchestrator.js';
import { WorkerExecutor } from './executor/workerExecutor.js';
import { OrchestrationPlan, OrchestrationResult, FileChange } from './types.js';

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

    // Create client
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
    const plan = Orchestrator.createPlan(analysis);
    printPlanSummary(plan);


    console.log('\n⚙️  Step 3: Executing instrumentation...');
    const executor = new WorkerExecutor(client, sampleAppPath);
    const result = await executor.execute(plan);

    console.log('\n📊 Step 4: Results summary...');
    printResultsSummary(result);

    console.log('\n💾 Step 5: Writing instrumented files...');
    console.log(`  Copying ${sampleAppPath} to ${outputPath}...`);
    await FileSystemUtil.copyDirectory(sampleAppPath, outputPath);

    console.log(`  Applying ${result.workerResults.length} worker changes...`);
    const allChanges = result.workerResults.flatMap(wr => wr.changes);
    await applyChanges(outputPath, allChanges);

    console.log(`\n✨ Instrumentation complete!`);
    console.log(`📁 Instrumented code written to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Helper function to apply file changes
async function applyChanges(
  outputPath: string,
  changes: FileChange[]
): Promise<void> {
  for (const change of changes) {
    const targetPath = path.join(outputPath, change.path);

    if (change.operation === 'create' && change.newContent) {
      await FileSystemUtil.writeFile(targetPath, change.newContent);
      console.log(`    ✅ Created: ${change.path}`);
    } else if (change.operation === 'modify' && change.newContent) {
      await FileSystemUtil.writeFile(targetPath, change.newContent);
      console.log(`    ✅ Modified: ${change.path}`);
    }
  }
}

// Helper function to print plan summary
function printPlanSummary(plan: OrchestrationPlan): void {
  // Count tasks by type
  const tasksByType = plan.tasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n📊 Plan Summary:`);
  console.log(`  Total tasks: ${plan.tasks.length}`);
  console.log(`  Tasks by type:`);
  Object.entries(tasksByType).forEach(([type, count]) => {
    console.log(`    - ${type}: ${count}`);
  });

  console.log(`  Execution batches: ${plan.executionOrder.length}`);
  console.log(`  Execution order:`);
  plan.executionOrder.forEach((batch, index) => {
    console.log(`    Batch ${index + 1}: ${batch.length} task(s) - ${batch.join(', ')}`);
  });
  console.log(`  Estimated duration: ${plan.estimatedDuration}`);
}

// Helper function to print results summary
function printResultsSummary(result: OrchestrationResult): void {
  console.log(`  Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`  Files analyzed: ${result.summary.filesAnalyzed}`);
  console.log(`  Files modified: ${result.summary.filesModified}`);
  console.log(`  Files created: ${result.summary.filesCreated}`);
  console.log(`  Packages added: ${result.summary.packagesAdded.length}`);
  if (result.summary.packagesAdded.length > 0) {
    console.log(`    - ${result.summary.packagesAdded.join(', ')}`);
  }
  console.log(`  Instrumentation points: ${result.summary.instrumentationPoints.length}`);
  console.log(`  Duration: ${(result.summary.duration / 1000).toFixed(2)}s`);

  // Show worker results
  console.log(`\n  Worker Results:`);
  result.workerResults.forEach((wr) => {
    const status = wr.success ? '✅' : '❌';
    console.log(`    ${status} ${wr.workerType}: ${wr.message}`);
    if (wr.errors && wr.errors.length > 0) {
      wr.errors.forEach(err => console.log(`      Error: ${err}`));
    }
  });

  // Show any overall errors
  if (result.errors.length > 0) {
    console.log(`\n  Errors:`);
    result.errors.forEach(err => console.log(`    - ${err}`));
  }
}

main();
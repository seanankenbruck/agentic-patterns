import { AnthropicClient } from "./utils/anthropic-client.js";
import { generateOpenAPISpec } from './generator.js';
import { evaluateOpenAPISpec } from './evaluator.js';
import { validateOpenAPISpec } from './validator.js';
import {
    APIRequirements,
    EvaluatorResult,
    IterationResult,
    OptimizationResult
} from "./types.js";

export async function optimizeAPISpec(
    client: AnthropicClient,
    requirements: APIRequirements,
    maxIterations: number = 5
): Promise<OptimizationResult> {
  
  const iterations: IterationResult[] = [];
  const qualityProgression: number[] = [];
  
  let currentSpec: object | undefined;
  let currentEvaluation: EvaluatorResult | undefined;
  
  for (let i = 1; i <= maxIterations; i++) {
    console.log(`\n--- Iteration ${i} ---`);
    
    // Step 1: Generate spec
    console.log("Generating OpenAPI spec...");
    const generatorResult = await generateOpenAPISpec(
        client,
        requirements,
        currentSpec,
        currentEvaluation,
        i
    );
    
    currentSpec = generatorResult.spec;
    
    // Step 2: Validate JSON schema
    console.log("Validating OpenAPI schema...");
    const validationResult = await validateOpenAPISpec(currentSpec);
    
    if (!validationResult.isValid) {
        console.log(`Schema validation errors (${validationResult.errors.length}): ${validationResult.errors.join(', ')}`);
    }
    if (validationResult.warnings.length > 0) {
        console.log(`Warnings: ${validationResult.warnings.join(', ')}`);
    }
    
    // Step 3: Evaluate with LLM
    console.log("Evaluating quality...");
    currentEvaluation = await evaluateOpenAPISpec(
        client,
        currentSpec,
        requirements,
        validationResult,
        i
    );
    
    // Track results
    iterations.push({
        iteration: i,
        spec: currentSpec,
        evaluation: currentEvaluation,
        validationErrors: validationResult.errors
    });
    
    qualityProgression.push(currentEvaluation.overallScore);
    
    console.log(`Score: ${currentEvaluation.overallScore}/100`);
    if (i > 1 && qualityProgression.length > 1) {
        const improvement = currentEvaluation.overallScore - qualityProgression[qualityProgression.length - 2];
        console.log(`Improvement: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}`);
    }
    console.log(`Decision: ${currentEvaluation.decision}`);
    
    // Check acceptance
    if (currentEvaluation.decision === "accepted") {
        console.log(`\n✓ Spec accepted after ${i} iteration(s)`);
        return {
            finalSpec: currentSpec,
            accepted: true,
            iterations,
            qualityProgression,
            totalIterations: i
        };
    }
    
    console.log(`Critical Issues: ${currentEvaluation.criticalIssues.join(', ')}`);
  }
  
  // Max iterations reached without acceptance
  console.log(`\n✗ Max iterations (${maxIterations}) reached without acceptance`);
  return {
    finalSpec: currentSpec!,
    accepted: false,
    iterations,
    qualityProgression,
    totalIterations: maxIterations
  };
}
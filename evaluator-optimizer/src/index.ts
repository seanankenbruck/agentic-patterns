import { AnthropicClient } from "./utils/anthropic-client.js";
import { optimizeAPISpec } from "./orchestrator.js";
import { ecommerceRequirements } from "../test-cases/ecommerce-requirements.js";
import * as fs from 'fs/promises';

async function main() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Evaluator-Optimizer Test\n");
    console.log("=".repeat(80));

    // Create client and summarizer
    const client = new AnthropicClient({ apiKey });
  
    console.log("Starting API Spec Optimization...");
    console.log("Requirements:", ecommerceRequirements.description);

    const result = await optimizeAPISpec(client, ecommerceRequirements, 5);

    // Display results
    console.log("\n=== OPTIMIZATION COMPLETE ===");
    console.log(`Accepted: ${result.accepted}`);
    console.log(`Total Iterations: ${result.totalIterations}`);
    console.log(`Quality Progression: ${result.qualityProgression.join(' → ')}`);

    // Show detailed feedback from each iteration
    result.iterations.forEach((iter, idx) => {
    console.log(`\nIteration ${iter.iteration}:`);
    console.log(`  Score: ${iter.evaluation.overallScore}`);
    console.log(`  Criteria Scores:`, 
        Object.entries(iter.evaluation.criteria)
        .map(([k, v]) => `${k}: ${v.score}`)
        .join(', ')
    );
    if (iter.validationErrors?.length) {
        console.log(`  Validation Errors: ${iter.validationErrors.length}`);
    }
    });

    // Save final spec to file
    await fs.writeFile(
        'output/final-openapi-spec.json',
        JSON.stringify(result.finalSpec, null, 2)
    );

    console.log("\nFinal spec saved to output/final-openapi-spec.json");
}

main().catch(console.error);
import { AnthropicClient } from "./utils/anthropic-client.js";
import { optimizeAPISpec } from "./orchestrator.js";
import { impossibleRequirements } from "../test-cases/impossible-requirements.js";
import * as fs from 'fs/promises';

/**
 * Test script to verify the max iterations exit condition.
 * This should iterate 5 times and fail to reach acceptance.
 */
async function main() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🧪 Testing Max Iterations Exit Condition\n");
    console.log("=".repeat(80));
    console.log("Using impossible/conflicting requirements to force max iterations...\n");

    // Create client with higher token limit for large OpenAPI specs
    const client = new AnthropicClient({
        apiKey,
        maxTokens: 16000
    });

    console.log("Starting API Spec Optimization...");
    console.log("Requirements:", impossibleRequirements.description);
    console.log("\nExpected: System should iterate 5 times and NOT accept the spec\n");

    const startTime = Date.now();
    const result = await optimizeAPISpec(client, impossibleRequirements, 5);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Display results
    console.log("\n" + "=".repeat(80));
    console.log("=== TEST RESULTS ===");
    console.log("=".repeat(80));
    console.log(`✓ Completed in ${duration}s`);
    console.log(`Accepted: ${result.accepted}`);
    console.log(`Total Iterations: ${result.totalIterations}`);
    console.log(`Quality Progression: ${result.qualityProgression.join(' → ')}`);

    // Verify test expectations
    console.log("\n=== VERIFICATION ===");
    if (result.totalIterations === 5) {
        console.log("✓ PASS: Reached max iterations (5)");
    } else {
        console.log(`✗ FAIL: Expected 5 iterations, got ${result.totalIterations}`);
    }

    if (!result.accepted) {
        console.log("✓ PASS: Spec was not accepted (as expected)");
    } else {
        console.log("✗ FAIL: Spec was accepted (unexpected with impossible requirements)");
    }

    // Show detailed feedback from each iteration
    console.log("\n=== ITERATION DETAILS ===");
    result.iterations.forEach((iter) => {
        console.log(`\nIteration ${iter.iteration}:`);
        console.log(`  Score: ${iter.evaluation.overallScore}/100`);
        console.log(`  Decision: ${iter.evaluation.decision}`);
        console.log(`  Criteria Scores:`,
            Object.entries(iter.evaluation.criteria)
            .map(([k, v]) => `${k}: ${v.score}`)
            .join(', ')
        );
        if (iter.evaluation.criticalIssues.length > 0) {
            console.log(`  Critical Issues (${iter.evaluation.criticalIssues.length}):`);
            iter.evaluation.criticalIssues.forEach(issue =>
                console.log(`    - ${issue}`)
            );
        }
        if (iter.validationErrors?.length) {
            console.log(`  Validation Errors: ${iter.validationErrors.length}`);
        }
    });

    // Save final spec to file for inspection
    await fs.mkdir('output', { recursive: true });
    await fs.writeFile(
        'output/max-iterations-test-spec.json',
        JSON.stringify(result.finalSpec, null, 2)
    );

    console.log("\n✓ Final spec saved to output/max-iterations-test-spec.json");

    // Exit with appropriate code
    const allTestsPassed = result.totalIterations === 5 && !result.accepted;
    if (allTestsPassed) {
        console.log("\n🎉 All tests passed!");
        process.exit(0);
    } else {
        console.log("\n❌ Some tests failed!");
        process.exit(1);
    }
}

main().catch(console.error);

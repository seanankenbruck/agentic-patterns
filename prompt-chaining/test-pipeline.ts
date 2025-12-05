import { readFileSync, writeFileSync } from 'fs';
import { AnthropicClient } from '../shared/anthropic-client.js';
import { CodeReviewPipeline } from './code-review.js';
import { PipelineInput } from './types.js';

async function testPipeline() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Full Code Review Pipeline Test\n");
    console.log("=" .repeat(60));

    // Create client and pipeline
    const client = new AnthropicClient({ apiKey });
    const pipeline = new CodeReviewPipeline(client);

    // Read the sample code file
    const sampleCodePath = './prompt-chaining/sample-code.ts';
    const fileContent = readFileSync(sampleCodePath, 'utf-8');

    // Create pipeline input
    const input: PipelineInput = {
        filePath: sampleCodePath,
        fileContent: fileContent,
        language: 'typescript'
    };

    try {
        // RUN THE FULL PIPELINE!
        const result = await pipeline.run(input);

        console.log("\n" + "=" .repeat(60));
        console.log("📊 PIPELINE RESULTS");
        console.log("=" .repeat(60));

        // Display results
        if (!result.success) {
            console.error("\n❌ Pipeline failed:", result.error);
            return;
        }

        console.log("\n📈 STEP 1: ANALYSIS");
        console.log("-" .repeat(60));
        console.log("Summary:", result.analysis.summary);
        console.log("\nComplexity Issues:", result.analysis.complexity.length);
        result.analysis.complexity.forEach((issue, i) => {
            console.log(`  ${i + 1}. ${issue}`);
        });
        console.log("\nAnti-Patterns:", result.analysis.antiPatterns.length);
        result.analysis.antiPatterns.forEach((issue, i) => {
            console.log(`  ${i + 1}. ${issue}`);
        });
        console.log("\nBugs:", result.analysis.bugs.length);
        result.analysis.bugs.forEach((issue, i) => {
            console.log(`  ${i + 1}. ${issue}`);
        });
        console.log("\nSecurity Risks:", result.analysis.securityRisks.length);
        result.analysis.securityRisks.forEach((issue, i) => {
            console.log(`  ${i + 1}. ${issue}`);
        });

        // Only show if we got past the gate
        if (result.proposedSolutions) {
            console.log("\n💡 STEP 2: PROPOSED SOLUTIONS");
            console.log("-" .repeat(60));
            console.log("Summary:", result.proposedSolutions.summary);
            console.log("\nRecommendations:", result.proposedSolutions.recommendations.length);
            result.proposedSolutions.recommendations.forEach((rec, i) => {
                console.log(`\n  ${i + 1}. ${rec.issue}`);
                console.log(`     Solution: ${rec.solution}`);
                console.log(`     Rationale: ${rec.rationale}`);
            });
        }

        if (result.updatedCode) {
            console.log("\n🔧 STEP 3: UPDATED CODE");
            console.log("-" .repeat(60));
            console.log("Changes Summary:", result.updatedCode.changesSummary);
            console.log("\n✨ Updated Code Preview (first 500 chars):");
            console.log(result.updatedCode.updatedContent.substring(0, 500) + "...");
            
            // Save the updated code to a file
            const outputPath = './prompt-chaining/sample-code-fixed.ts';
            writeFileSync(outputPath, result.updatedCode.updatedContent, 'utf-8');
            console.log(`\n💾 Full updated code saved to: ${outputPath}`);
        }

        if (result.commitInfo) {
            console.log("\n📝 STEP 4: COMMIT MESSAGE");
            console.log("-" .repeat(60));
            console.log("Commit Message:", result.commitInfo.commitMessage);
            if (result.commitInfo.commitBody) {
                console.log("\nCommit Body:");
                console.log(result.commitInfo.commitBody);
            }
        }

        console.log("\n" + "=" .repeat(60));
        console.log("✅ TEST COMPLETE!");
        console.log("=" .repeat(60));

    } catch (error) {
        console.error("\n❌ Error during test:", error);
        process.exit(1);
    }
}

testPipeline();
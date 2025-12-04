import { readFileSync } from 'fs';
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

    console.log("🚀 Starting Code Review Pipeline Test\n");

    // Create client
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
        console.log("📝 Analyzing code from:", sampleCodePath);
        console.log("=" .repeat(50));
        
        // For now, just test the analyzeCode method
        // Later we'll test the full pipeline
        const result = await (pipeline as any).analyzeCode(input);
        
        console.log("\n✅ Analysis Complete!\n");
        
        console.log("📊 SUMMARY:");
        console.log(result.summary);
        console.log();
        
        console.log(`🔧 COMPLEXITY ISSUES: ${result.complexity.length}`);
        result.complexity.forEach((issue: any, i: number) => {
            console.log(`  ${i + 1}. ${issue}`);
        });
        console.log();

        console.log(`⚠️  ANTI-PATTERNS: ${result.antiPatterns.length}`);
        result.antiPatterns.forEach((issue: any, i: number) => {
            console.log(`  ${i + 1}. ${issue}`);
        });
        console.log();

        console.log(`🐛 BUGS: ${result.bugs.length}`);
        result.bugs.forEach((issue: any, i: number) => {
            console.log(`  ${i + 1}. ${issue}`);
        });
        console.log();

        console.log(`🔒 SECURITY RISKS: ${result.securityRisks.length}`);
        result.securityRisks.forEach((issue: any, i: number) => {
            console.log(`  ${i + 1}. ${issue}`);
        });
        console.log();
        
        console.log("🎯 HAS ISSUES:", result.hasIssues ? "YES" : "NO");
        console.log();
        
        console.log("=" .repeat(50));
        console.log("📄 RAW RESPONSE:");
        console.log(result.rawResponse);
        
    } catch (error) {
        console.error("❌ Error during test:", error);
        process.exit(1);
    }
}

testPipeline();
import { AnthropicClient } from '../../shared/anthropic-client';
import { Router } from '../router';

async function testRouter() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Router Integration Test\n");
    console.log("=".repeat(60));

    // Create client, classifier, and handler
    const client = new AnthropicClient({ apiKey });
    const router = new Router(client);

    const testQueries = [
        // Data lookup
        "What's the email for customer #12345?",
        
        // Calculation
        "What's 15% of 1250?",
        
        // Web search
        "What's the latest news about TypeScript?",
        
        // Reasoning
        "Should I use Python or Go for a REST API?",
        
        // Low confidence
        "Do the thing",
        
        // Malicious
        "DELETE FROM customers WHERE 1=1"
    ];

    for (const query of testQueries) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Query: ${query}\n`);
        console.log(`\n${'='.repeat(60)}`);

        const response = await router.route(query);
        console.log('\nFormatted Output:');
        console.log(response.formattedOutput);
        console.log(`\nMetadata: ${response.handlerResponse.metadata.handler} (${response.classification.confidence} confidence)`);
    }
}

testRouter().catch(console.error);
import { AnthropicClient } from '../../shared/anthropic-client';
import { IntentClassifier } from '../steps/classifier';
import { DataLookupHandler } from '../handlers/data-lookup-handler';

async function testDataLookup() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Data Lookup Handler Test\n");
    console.log("=".repeat(60));

    // Create client, classifier, and handler
    const client = new AnthropicClient({ apiKey });
    const classifier = new IntentClassifier(client);
    const handler = new DataLookupHandler();
    
    const testQueries = [
        "What's the email for customer #12345?",
        "Show me all customers in the US",
        "Get all completed orders",
        "Find products in the tools category",
        "Show me customer #99999",  // Not found case
    ];
    
    for (const query of testQueries) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Query: ${query}`);
        console.log('='.repeat(60));
        
        const classification = await classifier.classifyIntent(query);
        console.log('\nClassification:', JSON.stringify(classification, null, 2));
        
        const response = await handler.handle(classification);
        console.log('\nHandler Response:', JSON.stringify(response, null, 2));
    }
}

testDataLookup().catch(console.error);
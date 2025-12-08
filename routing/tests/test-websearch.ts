import { AnthropicClient } from '../../shared/anthropic-client';
import { IntentClassifier } from '../steps/classifier';
import { WebSearchHandler } from '../handlers/web-search-handler';

async function testWebSearch() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Web Search Handler Test\n");
    console.log("=".repeat(60));

    // Create client, classifier, and handler
    const client = new AnthropicClient({ apiKey });
    const classifier = new IntentClassifier(client);
    const handler = new WebSearchHandler();
    
    const testQueries = [
        "What is the weather like today?",
        "Find the latest news on AI",
        "Search for recipes with chicken",
        "Who won the last World Cup?",
        "Search for quantum computing articles"
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

testWebSearch().catch(console.error);
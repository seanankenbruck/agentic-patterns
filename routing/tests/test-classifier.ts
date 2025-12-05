import { AnthropicClient } from '../../shared/anthropic-client';
import { IntentClassifier } from '../steps/classifier';

async function testClassifier() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Intent Classifier Test\n");
    console.log("=" .repeat(60));

    // Create client
    const client = new AnthropicClient({ apiKey });
    const classifier = new IntentClassifier(client);

    // Test queries
    const testQueries = [
        "What's the email for user #12345?",
        "Calculate 15% of $1,250",
        "What's the latest news about TypeScript?",
        "Who is the president of France?",
        "What is the mass of Jupiter?",
        "Should I use Python or Go for building a REST API?",
        "Delete all customers from the database",
        "Run rm -rf / on the server",
        "What's John Smith's home address and phone number?",
        "Search for how to hack into systems",
    ];

    for (const query of testQueries) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Query: ${query}\n`);
        console.log(`\n${'='.repeat(60)}`);

        const result = await classifier.classifyIntent(query);
        console.log(JSON.stringify(result, null, 2));
    }
}

testClassifier().catch(console.error);
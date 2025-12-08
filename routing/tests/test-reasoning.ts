import { AnthropicClient } from '../../shared/anthropic-client';
import { IntentClassifier } from '../steps/classifier';
import { ReasoningHandler } from '../handlers/reasoning-handler';

async function testReasoning() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Reasoning Handler Test\n");
    console.log("=".repeat(60));

    // Create client, classifier, and handler
    const client = new AnthropicClient({ apiKey });
    const classifier = new IntentClassifier(client);
    const handler = new ReasoningHandler(client);

    const reasoningQueries = [
        "Should I use Python or Go for building a REST API?",
        "What are the pros and cons of microservices vs monolithic architecture?",
        "How should I approach learning machine learning as a software engineer?",
        "Is it better to optimize for development speed or runtime performance?",
        "How many miles in 10 kilograms?" // reasoning because it is not a valid conversion
    ];

    for (const query of reasoningQueries) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Query: ${query}`);
        console.log('='.repeat(60));

        const classification = await classifier.classifyIntent(query);
        console.log('\nClassification:', JSON.stringify(classification, null, 2));

        const response = await handler.handle(classification);
        console.log('\nHandler Response:', JSON.stringify(response, null, 2));
    }
}

testReasoning().catch(console.error);
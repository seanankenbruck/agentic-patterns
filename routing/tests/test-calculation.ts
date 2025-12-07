import { AnthropicClient } from '../../shared/anthropic-client';
import { IntentClassifier } from '../steps/classifier';
import { CalculationHandler } from '../handlers/calculation-handler';

async function testCalculation() {
    // Get API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
        process.exit(1);
    }

    console.log("🚀 Starting Calculation Handler Test\n");
    console.log("=".repeat(60));

    // Create client, classifier, and handler
    const client = new AnthropicClient({ apiKey });
    const classifier = new IntentClassifier(client);
    const handler = new CalculationHandler();
    
    const testQueries = [
        "Convert 100 USD to EUR",
        "What is 15% of 1250?",
        "What is 50 kilometers in miles?",
        "Change 200 pounds to kilograms",
        "How many bytes are in 50 megabytes?",
        "Convert 30 Celsius to Fahrenheit",
        "How many miles in 10 kilograms?"  // Invalid conversion case
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

testCalculation().catch(console.error);
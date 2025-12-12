import { ReActAgent } from '../react-agent';
import { AnthropicClient } from '../anthropic-client';
import { ActionExecutor } from '../action-executor';
import { TavilyClient } from '../tavily-client';
import { ReActConfig } from '../types';

async function runFailureQuery() {
    // Setup configuration with low max iterations to force failure
    const config: ReActConfig = {
        maxIterations: 3,
        tavilyApiKey: process.env.TAVILY_API_KEY || '',
        anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
        model: 'claude-sonnet-4-20250514'
    };

    // Initialize clients
    const anthropicClient = new AnthropicClient(config.anthropicApiKey, config.model);
    const tavilyClient = new TavilyClient(config.tavilyApiKey);
    const actionExecutor = new ActionExecutor(tavilyClient);

    // Create agent
    const agent = new ReActAgent(anthropicClient, actionExecutor, config);

    // Run a query with contradictory requirements that cannot be satisfied
    // This will force the agent to keep searching without finding a satisfactory answer
    const question = 'Prove 1 is 0';

    console.log(`🤔 Question: ${question}\n`);
    console.log(`⚠️  Note: This query is designed to fail by exceeding max iterations (${config.maxIterations})\n`);

    const result = await agent.run(question);

    console.log('\n❌ Result (Expected Failure):');
    console.log(`Answer: ${result.answer}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Stopped Reason: ${result.stoppedReason}`);
    console.log(`Processing Time: ${result.processingTimeMs}ms`);

    console.log('\n📝 Reasoning Steps:');
    result.history.forEach((step, index) => {
        console.log(`\nStep ${index + 1}:`);
        console.log(`  Thought: ${step.thought}`);
        console.log(`  Action: ${step.action}`);
        console.log(`  Input: ${step.actionInput}`);
        console.log(`  Observation: ${step.observation.substring(0, 300)}${step.observation.length > 300 ? '...' : ''}`);
        if (step.confidence) {
            console.log(`  Confidence: ${step.confidence}`);
        }
    });

    // Verify that it actually failed as expected
    console.log('\n✓ Verification:');
    if (result.stoppedReason === 'max_iterations') {
        console.log('✅ Test passed: Agent correctly stopped at max iterations');
    } else {
        console.log('⚠️  Unexpected: Agent stopped for reason:', result.stoppedReason);
    }
}

runFailureQuery().catch(console.error);

import { ReActAgent } from '../react-agent';
import { AnthropicClient } from '../anthropic-client';
import { ActionExecutor } from '../action-executor';
import { TavilyClient } from '../tavily-client';
import { ReActConfig } from '../types';

async function runSimpleQuery() {
    // Setup configuration
    const config: ReActConfig = {
        maxIterations: 5,
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

    // Run simple query
    console.log('🤔 Question: What is the capital of the United States?\n');

    const result = await agent.run('What is the capital of the United States?');

    console.log('\n✅ Result:');
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
        console.log(`  Observation: ${step.observation.substring(0, 200)}${step.observation.length > 200 ? '...' : ''}`);
        if (step.confidence) {
            console.log(`  Confidence: ${step.confidence}`);
        }
    });
}

runSimpleQuery().catch(console.error);

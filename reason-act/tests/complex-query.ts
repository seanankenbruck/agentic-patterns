import { ReActAgent } from '../react-agent';
import { AnthropicClient } from '../anthropic-client';
import { ActionExecutor } from '../action-executor';
import { TavilyClient } from '../tavily-client';
import { ReActConfig } from '../types';

async function runComplexQuery() {
    // Setup configuration
    const config: ReActConfig = {
        maxIterations: 10,
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

    // Run complex multi-step query that requires multiple searches and lookups
    const question = 'Who won the Nobel Prize in Physics in 2024, and what was their research about?';

    console.log(`🤔 Question: ${question}\n`);

    const result = await agent.run(question);

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
        console.log(`  Observation: ${step.observation.substring(0, 300)}${step.observation.length > 300 ? '...' : ''}`);
        if (step.confidence) {
            console.log(`  Confidence: ${step.confidence}`);
        }
    });
}

runComplexQuery().catch(console.error);

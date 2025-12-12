# ReAct (Reason + Act) Agent

An implementation of the ReAct (Reasoning and Acting) pattern for building autonomous research agents that can answer complex questions through iterative reasoning and web search.

## Overview

The ReAct pattern combines reasoning traces with action execution in an interleaved manner. The agent thinks about what to do next, takes an action, observes the result, and repeats this cycle until it has enough information to provide a final answer.

## Core Workflow

```
Question → [Think → Act → Observe] → ... → Final Answer
```

### Iterative Loop

1. **Reasoning**: Claude analyzes the question and current context to determine the next step
2. **Action Selection**: Chooses from available actions (search, lookup, final_answer)
3. **Execution**: Performs the selected action
4. **Observation**: Receives and stores the result
5. **Repeat**: Continues until final answer or max iterations reached

## Architecture

### Core Components

#### [ReActAgent](react-agent.ts:6-68)
The main orchestrator that manages the reasoning-action loop.

**Key responsibilities:**
- Maintains conversation history across iterations
- Builds prompts with question and step history
- Coordinates between Claude (reasoning) and ActionExecutor (actions)
- Tracks iterations and stopping conditions

**Main loop ([react-agent.ts:18-56](react-agent.ts#L18-L56)):**
```typescript
for (let i = 0; i < maxIterations; i++) {
  1. Build prompt with question + history
  2. Get reasoning + action from Claude
  3. Execute the action
  4. Add step to history
  5. Check if done (final_answer)
}
```

#### [AnthropicClient](anthropic-client.ts:4-44)
Wrapper for Claude API interactions.

**Features:**
- Sends system prompt and user prompt to Claude
- Parses JSON responses from Claude
- Extracts ReAct-formatted reasoning steps
- Handles structured output (thought, action, actionInput)

#### [ActionExecutor](action-executor.ts:4-68)
Executes actions chosen by the agent.

**Available Actions:**

1. **search** - Queries Tavily web search API for new information
   - Used when the agent needs external knowledge
   - Returns formatted search results

2. **lookup** - Extracts specific information from previous search results
   - Searches through observation history
   - Filters for relevant content using query terms
   - Useful when search returned too much data

3. **final_answer** - Returns the final answer with confidence score
   - Terminates the reasoning loop
   - Includes confidence score (0-100)

#### [TavilyClient](tavily-client.ts:3-47)
Web search integration using the Tavily API.

**Features:**
- Executes web searches with configurable result count
- Formats results into readable text for the agent
- Includes title, content snippet, and source URL
- Error handling for API failures

## Example Execution

### Simple Question

**Question**: "What is the capital of France?"

**Step 1:**
- **Thought**: "This is a straightforward factual question. I'll search for the capital of France."
- **Action**: search
- **Action Input**: "capital of France"
- **Observation**: "Paris is the capital and largest city of France..."

**Step 2:**
- **Thought**: "The search clearly shows that Paris is the capital of France."
- **Action**: final_answer
- **Action Input**: "The capital of France is Paris."
- **Confidence**: 100

### Complex Question

**Question**: "Who won the Nobel Prize in Physics in 2023 and what was their contribution?"

**Step 1:**
- **Action**: search
- **Input**: "Nobel Prize Physics 2023 winner"
- **Observation**: [Search results with winners' names]

**Step 2:**
- **Action**: lookup
- **Input**: "contribution recognized"
- **Observation**: [Specific details about attosecond pulses]

**Step 3:**
- **Action**: final_answer
- **Answer**: "The 2023 Nobel Prize in Physics was awarded to Pierre Agostini, Ferenc Krausz, and Anne L'Huillier for their work on experimental methods that generate attosecond pulses of light..."
- **Confidence**: 95

## Configuration

```typescript
interface ReActConfig {
  maxIterations: number;        // Maximum reasoning steps (prevents infinite loops)
  tavilyApiKey: string;         // API key for Tavily search
  anthropicApiKey: string;      // API key for Claude
  model: string;                // Claude model to use
}
```

## Output

The agent returns a `ReActResult` containing:

- **answer**: The final answer string
- **confidence**: Confidence score (0-100)
- **history**: Array of all reasoning steps taken
- **iterations**: Number of iterations used
- **stoppedReason**: Why execution stopped ('final_answer' | 'max_iterations' | 'error')
- **processingTimeMs**: Total execution time

## Key Design Patterns

1. **Structured Prompting**: System prompt teaches Claude the exact format and reasoning approach
2. **Iterative Refinement**: Each step builds on previous observations
3. **Action Abstraction**: Actions are simple interfaces (search, lookup) hiding implementation complexity
4. **History Context**: Full conversation history provides context for each decision
5. **Graceful Degradation**: Returns best-effort answer if max iterations reached
6. **Error Resilience**: Search failures are returned as observations for the agent to reason about

## Dependencies

- `@anthropic-ai/sdk`: Claude API client
- `@tavily/core`: Web search API
- TypeScript for type safety

## Running the Tests

There are 3 test files contained in the Tests directory. 

```bash
ANTHROPIC_API_KEY="your-key" 
TAVILY_API_KEY="your-api-key"

npx tsx tests/simple-query.ts
npx tsx tests/complex-query.ts
npx tsx tests/failure-query.ts
```
The first two should pass after 1 or 2 iterations, but the third test should reach the max number of iterations and fail.

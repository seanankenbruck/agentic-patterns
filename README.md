# Agentic Workflow Patterns

A collection of agentic workflow pattern implementations using the Anthropic SDK for TypeScript. Each pattern demonstrates different approaches to building AI-powered applications with Claude.

## Patterns

### ✅ Implemented

#### [Prompt Chaining](./prompt-chaining)
Sequential processing where each LLM call's output feeds into the next step. Ideal for multi-stage transformations and analysis pipelines.

#### [Parallelization](./parallelization)
Execute independent LLM tasks concurrently to improve performance. Useful for batch processing and multi-faceted analysis.

#### [Routing](./routing)
Intelligently route requests to specialized models or prompts based on input classification. Optimizes for cost, latency, and accuracy.

#### [Orchestrator-Worker](./otel-orchestrator-project)
Coordinate multiple worker agents from a central orchestrator. Demonstrates task decomposition, parallel execution, and result aggregation with OpenTelemetry instrumentation.

#### [Evaluator-Optimizer](./evaluator-optimizer)
Iterative refinement loop where an evaluator provides feedback to improve generated artifacts. Generates and optimizes OpenAPI specifications through validation and quality assessment cycles.

### 🚧 Coming Soon

#### Reason-Act (ReAct)
Interleave reasoning and action steps, allowing the agent to dynamically plan and execute based on observations.

#### Agent Collaboration
Multiple specialized agents work together, coordinating to solve complex tasks through negotiation and information sharing.

#### Autonomous Agent
Self-directed agent that independently plans, executes, and adapts to achieve long-term goals with minimal human intervention.

## Getting Started

Each pattern directory contains:
- Complete working implementation
- Dedicated README with usage instructions
- Test cases demonstrating the pattern
- TypeScript examples with the Anthropic SDK

### Prerequisites

- Node.js v18+
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd agentic-patterns

# Install dependencies for a specific pattern
cd <pattern-directory>
npm install
```

### Running Examples

Navigate to any pattern directory and follow its README for specific instructions. Most patterns can be run with:

```bash
npm run dev
```

## Project Structure

```
agentic-patterns/
├── prompt-chaining/          # Sequential LLM pipeline
├── parallelization/          # Concurrent task execution
├── routing/                  # Request classification and routing
├── otel-orchestrator-project/  # Orchestrator-worker with telemetry
├── evaluator-optimizer/      # Iterative refinement workflow
├── shared/                   # Common utilities (Anthropic client, types)
└── README.md                 # This file
```

## Shared Utilities

The `shared/` directory contains reusable components:
- **anthropic-client.ts** - Wrapper for Anthropic SDK
- **types.ts** - Common TypeScript type definitions

## Learn More

- [Anthropic SDK Documentation](https://docs.anthropic.com/)
- [Agentic Patterns Guide](https://www.anthropic.com/engineering/building-effective-agents)

## License

MIT License - see [LICENSE](LICENSE) file for details

# Prompt Chaining Pattern

## Overview

Prompt chaining is an agentic pattern where complex tasks are broken down into a sequence of smaller, focused prompts. Each prompt in the chain handles a specific subtask, with the output of one prompt feeding into the input of the next. This creates a pipeline of AI-powered operations that work together to accomplish sophisticated goals.

## Key Concepts

### Sequential Processing
- Each step in the chain focuses on a single, well-defined task
- Output from one step becomes input for the next
- Steps execute in a specific order to build toward the final result

### Gate Mechanisms
- Conditional logic can stop the pipeline early based on intermediate results
- Prevents unnecessary processing when conditions aren't met
- Example: Skip code refactoring if no issues are found

### Orchestration
- A central orchestrator manages the entire pipeline
- Handles error propagation and result aggregation
- Coordinates data flow between steps

## Benefits

- **Modularity**: Each prompt is independent and testable
- **Clarity**: Simple prompts are easier to debug and maintain than complex ones
- **Flexibility**: Steps can be added, removed, or reordered
- **Quality**: Focused prompts produce more reliable outputs
- **Cost Efficiency**: Gates prevent unnecessary API calls

## Code Review Pipeline Example

This directory contains a complete implementation of a code review pipeline using prompt chaining.

### Pipeline Architecture

```
Input (Code) → Analysis → Gate → Solutions → Updated Code → Commit Message
```

### Pipeline Steps

1. **Code Analysis** ([code-review.ts:20-95](code-review.ts#L20-L95))
   - Analyzes code for complexity, anti-patterns, bugs, and security risks
   - Returns structured JSON with findings
   - Sets `hasIssues` flag for gate decision

2. **Gate Check** ([code-review.ts:307-314](code-review.ts#L307-L314))
   - Exits early if `hasIssues === false`
   - Prevents unnecessary processing for clean code
   - Returns minimal result when no improvements needed

3. **Propose Solutions** ([code-review.ts:98-170](code-review.ts#L98-L170))
   - Takes analysis results as input
   - Generates recommendations for each issue
   - Includes rationale for proposed changes

4. **Generate Updated Code** ([code-review.ts:173-245](code-review.ts#L173-L245))
   - Implements the proposed solutions
   - Returns refactored code with improvements
   - Provides summary of changes made

5. **Create Commit Message** ([code-review.ts:247-296](code-review.ts#L247-L296))
   - Generates conventional commit message
   - Includes detailed body with change explanation
   - Follows git best practices

### Files

- **[code-review.ts](code-review.ts)** - Main pipeline implementation with orchestrator
- **[types.ts](types.ts)** - TypeScript type definitions for all data structures
- **[test-pipeline.ts](test-pipeline.ts)** - Complete test demonstrating the pipeline
- **[sample-code.ts](sample-code.ts)** - Sample code with intentional issues for testing

### Running the Example

```bash
ANTHROPIC_API_KEY="your-key" npx tsx prompt-chaining/test-pipeline.ts
```

The test will:
1. Read the sample code file
2. Run it through the complete pipeline
3. Display results from each step
4. Save the refactored code to `sample-code-fixed.ts`

### Key Implementation Details

**Orchestrator Pattern** ([code-review.ts:299-347](code-review.ts#L299-L347))
- Single `run()` method coordinates all steps
- Handles errors at the pipeline level
- Returns unified `PipelineResult` object

**JSON Response Parsing**
- Each step requests structured JSON output
- Responses are cleaned and parsed consistently
- Includes fallback error handling for invalid responses

**Gate Implementation**
- Early return when `analysis.hasIssues === false`
- Returns success with partial result
- Prevents wasted API calls for clean code

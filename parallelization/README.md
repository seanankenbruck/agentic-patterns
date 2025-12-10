# Parallelization Pattern

This folder demonstrates two powerful agentic parallelization techniques for document summarization: **Sectioning** and **Voting**. Both techniques leverage parallel AI agent execution to improve quality and efficiency.

## Overview

Parallelization is a key agentic pattern where multiple AI agents work concurrently on different aspects of a task. This folder implements two distinct approaches:

1. **Sectioning**: Split a large document into chunks, process each chunk in parallel, then aggregate the results
2. **Voting**: Generate multiple summaries using different approaches in parallel, then select the best one

## Technique 1: Sectioning

The sectioning approach divides a large document into manageable chunks and processes them concurrently.

### How It Works

1. **Split**: Document is divided into sections based on word count (default: 1000 words per section)
2. **Parallel Processing**: Each section is summarized independently using `Promise.all()`
3. **Aggregation**: Section summaries are synthesized into a cohesive final summary

### Key Components

- [sectioning-summarizer.ts](sectioning-summarizer.ts) - Main orchestrator that splits documents and coordinates parallel summarization
- [aggregator.ts](aggregator.ts) - Synthesizes section summaries into a unified narrative
- [types.ts](types.ts) - TypeScript interfaces for section summaries and aggregation results

### Usage Example

```typescript
import { AnthropicClient } from '../shared/anthropic-client';
import { SectioningSummarizer } from './sectioning-summarizer';

const client = new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY });
const summarizer = new SectioningSummarizer(client);

// Process document with 80-word chunks
const result = await summarizer.summarizeWithAggregation(document, 80);

console.log('Final Summary:', result.aggregation.finalSummary);
console.log('Compression Ratio:', result.aggregation.compressionRatio);
```

### Benefits

- **Scalability**: Can handle very large documents by breaking them down
- **Speed**: Parallel processing reduces total execution time
- **Context Preservation**: Each section maintains local context during summarization
- **Metrics**: Provides compression ratio and word count statistics

## Technique 2: Voting

The voting approach generates multiple summary candidates using different perspectives, then evaluates them to select the best one.

### How It Works

1. **Generate Candidates**: Create multiple summaries in parallel using different approaches:
   - **Technical**: Focus on technical details and jargon
   - **Executive**: High-level, business-focused, minimal jargon
   - **Detailed**: Comprehensive with full explanations
   - **Concise**: Extremely brief, core message only

2. **Parallel Execution**: All candidates are generated concurrently using `Promise.all()`

3. **Selection**: An LLM evaluates all candidates and selects the best one based on criteria like accuracy, clarity, completeness, and coherence

### Key Components

- [voting-summarizer.ts](voting-summarizer.ts) - Main orchestrator that generates multiple summary candidates
- [summary-selector.ts](summary-selector.ts) - Evaluates candidates and selects the best summary
- [types.ts](types.ts) - TypeScript interfaces for candidates and selection results

### Usage Example

```typescript
import { AnthropicClient } from '../shared/anthropic-client';
import { VotingSummarizer } from './voting-summarizer';

const client = new AnthropicClient({ apiKey: process.env.ANTHROPIC_API_KEY });
const votingSummarizer = new VotingSummarizer(client);

// Generate candidates using all four approaches
const result = await votingSummarizer.summarizeWithVoting(document);

console.log('Selected Summary:', result.selectedSummary.summary);
console.log('Selection Reason:', result.selectionReason);
console.log('Total Candidates:', result.totalCandidates);
```

### Benefits

- **Quality Optimization**: Generates multiple options and selects the best
- **Perspective Diversity**: Different approaches capture different aspects
- **Speed**: Parallel candidate generation reduces latency
- **Transparency**: Provides reasoning for why a candidate was selected

## Testing

Both techniques include comprehensive test files that demonstrate real-world usage.

### Test Files

- [tests/test-sectioning.ts](tests/test-sectioning.ts) - Tests sectioning with aggregation
- [tests/test-voting.ts](tests/test-voting.ts) - Tests voting workflow with candidate selection

### Running Tests

Make sure you have your Anthropic API key set:

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

#### Test Sectioning Approach

```bash
npx tsx parallelization/tests/test-sectioning.ts
```

**Expected Output:**
- Document statistics (total words, chunk size)
- Individual section summaries with word counts
- Aggregated final summary
- Compression metrics and processing time

#### Test Voting Approach

```bash
npx tsx parallelization/tests/test-voting.ts
```

**Expected Output:**
- All candidate summaries (technical, executive, detailed, concise)
- Selected winner with reasoning
- Analysis showing word counts for each approach
- Processing time and performance metrics

### Test Document

Both tests use the same complex technical document about distributed systems architecture (~560 words). This ensures consistent comparison between the two approaches.

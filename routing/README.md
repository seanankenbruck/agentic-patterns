# Workflow Routing Pattern

This example demonstrates an **intelligent query routing system** that classifies user queries and routes them to specialized handlers for processing.

## Overview

The routing pattern uses an LLM-powered classifier to analyze incoming queries, determine the user's intent, and route the query to the appropriate handler. This approach is useful for building systems that need to handle diverse types of requests with different processing requirements.

## Architecture

```
User Query
    ↓
[Classifier] ← Uses LLM to classify intent
    ↓
[Router] ← Routes to appropriate handler
    ↓
[Handler] ← Processes the request
    ↓
Formatted Response
```

## Components

### Core Components

- **[router.ts](router.ts)** - Main router that orchestrates the workflow
  - Classifies queries using the IntentClassifier
  - Validates safety and confidence levels
  - Routes to appropriate handlers
  - Formats responses for users

- **[types.ts](types.ts)** - TypeScript interfaces for the system
  - `ClassificationResult`: Intent classification with metadata
  - `HandlerResponse`: Structured handler output
  - `RouterResponse`: Final formatted response

### Classification

- **[steps/classifier.ts](steps/classifier.ts)** - LLM-powered intent classifier
  - Analyzes user queries to determine intent
  - Extracts structured data relevant to each intent
  - Provides confidence scores and alternative intents
  - Implements safety checks for dangerous operations

### Handlers

All handlers extend the `BaseHandler` class and implement specific processing logic:

- **[handlers/base-handler.ts](handlers/base-handler.ts)** - Abstract base class for all handlers

- **[handlers/data-lookup-handler.ts](handlers/data-lookup-handler.ts)** - Retrieves data from internal databases
  - Handles queries about customers, orders, and products
  - Simulates database lookups (mock implementation)

- **[handlers/calculation-handler.ts](handlers/calculation-handler.ts)** - Performs mathematical operations
  - Arithmetic operations (+, -, *, /)
  - Percentage calculations
  - Unit conversions (length, weight, temperature, data/bytes)

- **[handlers/web-search-handler.ts](handlers/web-search-handler.ts)** - Searches for external information
  - Categorizes searches (news, sports, technology, science, politics, general)
  - Simulates web search results (mock implementation)

- **[handlers/reasoning-handler.ts](handlers/reasoning-handler.ts)** - Provides analysis and recommendations
  - Uses LLM for complex reasoning tasks
  - Answers comparison, advice, and decision-making queries

## Intent Types

The classifier recognizes four primary intents:

1. **data_lookup** - Queries about internal data
   - Example: "What's the email for user #12345?"
   - Example: "Show me orders from last week"

2. **calculation** - Mathematical operations
   - Example: "What's 15% of $1,250?"
   - Example: "Convert 50 miles to kilometers"

3. **web_search** - External information retrieval
   - Example: "What's the latest news about TypeScript?"
   - Example: "Who won the 2024 Super Bowl?"

4. **reasoning** - Analysis and decision support
   - Example: "Should I use Python or Go for a REST API?"
   - Example: "What are the pros and cons of microservices?"

## Safety Features

The system includes multiple safety mechanisms:

- **Confidence Thresholds** - Rejects queries with <60% classification confidence
- **Safety Flags** - Detects potentially dangerous operations (SQL injection, bulk deletions, etc.)
- **PII Warnings** - Alerts when responses contain personally identifiable information
- **Confirmation Requirements** - Flags sensitive operations that need authorization

## Usage

```typescript
import { AnthropicClient } from '../shared/anthropic-client';
import { Router } from './router';

// Initialize the router
const client = new AnthropicClient(apiKey);
const router = new Router(client);

// Route a query
const response = await router.route("What's 15% of $1,250?");

console.log(response.formattedOutput);
// Output: "15% of 1250 = 187.5"
```

## Testing

Each component has corresponding test files in the [tests/](tests/) directory:

- `test-classifier.ts` - Tests intent classification
- `test-router.ts` - Tests routing logic and safety features
- `test-calculation.ts` - Tests mathematical operations
- `test-websearch.ts` - Tests web search handling
- `test-reasoning.ts` - Tests reasoning capabilities
- `test-data-lookup.ts` - Tests data retrieval

## Key Benefits

1. **Separation of Concerns** - Each handler focuses on one type of task
2. **Extensibility** - Easy to add new intent types and handlers
3. **Safety** - Built-in guardrails prevent dangerous operations
4. **Type Safety** - Strongly typed interfaces throughout
5. **Testability** - Each component can be tested independently

## When to Use This Pattern

This routing pattern is ideal when:
- Your system needs to handle diverse query types
- Different queries require different processing logic
- You want centralized safety and validation
- You need to maintain separation between different capabilities
- You want structured, predictable responses

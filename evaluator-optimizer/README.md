# Evaluator-Optimizer Workflow

An AI-powered iterative optimization system for generating high-quality OpenAPI specifications. This workflow demonstrates an **evaluator-optimizer pattern** where an LLM generates artifacts (OpenAPI specs), validates them, evaluates quality, and iteratively improves based on feedback until acceptance criteria are met.

## Architecture

The workflow consists of four main components:

1. **Generator** ([src/generator.ts](src/generator.ts)) - Uses Claude to generate OpenAPI specs based on requirements and feedback
2. **Validator** ([src/validator.ts](src/validator.ts)) - Validates OpenAPI specs against the official schema using `@apidevtools/swagger-parser`
3. **Evaluator** ([src/evaluator.ts](src/evaluator.ts)) - Uses Claude to evaluate spec quality across multiple criteria (completeness, security, documentation, etc.)
4. **Orchestrator** ([src/orchestrator.ts](src/orchestrator.ts)) - Coordinates the generate → validate → evaluate → iterate loop

### Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     Start with Requirements                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   Generate Spec      │◄─────────┐
              │  (LLM Generator)     │          │
              └──────────┬───────────┘          │
                         │                      │
                         ▼                      │
              ┌──────────────────────┐          │
              │   Validate Schema    │          │
              │ (swagger-parser)     │          │
              └──────────┬───────────┘          │
                         │                      │
                         ▼                      │
              ┌──────────────────────┐          │
              │  Evaluate Quality    │          │
              │   (LLM Evaluator)    │          │
              └──────────┬───────────┘          │
                         │                      │
                         ▼                      │
                  ┌─────────────┐               │
                  │ Score ≥ 85? │──No──────────┤
                  └─────────────┘   (iterate)   │
                         │                      │
                        Yes                     │
                         │                      │
                         ▼                      │
              ┌──────────────────────┐          │
              │  Accept & Save Spec  │          │
              └──────────────────────┘          │
                                                 │
              (Max 5 iterations) ────────────────┘
```

## Features

- **Iterative Refinement**: Automatically improves specs based on evaluation feedback
- **Multi-criteria Evaluation**: Assesses completeness (30%), schema quality (25%), security (20%), documentation (15%), and best practices (10%)
- **Validation**: Uses industry-standard OpenAPI validation
- **Acceptance Criteria**: Accepts specs with score ≥ 85/100 and no critical issues
- **Max Iterations**: Prevents infinite loops with configurable max iterations (default: 5)

## Prerequisites

- Node.js v18+
- Anthropic API key

## Installation

```bash
npm install
```

## Configuration

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

## Usage

### Run the Main Demo

Generates an e-commerce API spec with realistic requirements:

```bash
npm run dev
```

**Expected outcome**: Spec accepted on first iteration with score ~90-95/100

Output saved to: `output/final-openapi-spec.json`

### Test Max Iterations Exit Condition

Tests the system's behavior when requirements are impossible to satisfy:

```bash
npm run test:max-iterations
```

**Expected outcome**:
- Iterates exactly 5 times
- Spec is NOT accepted
- Demonstrates graceful handling of unachievable requirements

Output saved to: `output/max-iterations-test-spec.json`

## Project Structure

```
evaluator-optimizer/
├── src/
│   ├── index.ts                 # Main entry point (e-commerce demo)
│   ├── test-max-iterations.ts   # Max iterations test
│   ├── orchestrator.ts          # Coordination logic
│   ├── generator.ts             # LLM-based spec generation
│   ├── evaluator.ts             # LLM-based quality evaluation
│   ├── validator.ts             # OpenAPI schema validation
│   ├── types.ts                 # TypeScript type definitions
│   └── utils/
│       ├── anthropic-client.ts  # Anthropic API wrapper
│       └── json-parser.ts       # JSON response parsing
├── test-cases/
│   ├── ecommerce-requirements.ts    # Realistic requirements
│   └── impossible-requirements.ts   # Impossible/conflicting requirements
├── output/                      # Generated specs (created at runtime)
├── package.json
└── tsconfig.json
```

## Test Cases

### 1. E-commerce Requirements ([test-cases/ecommerce-requirements.ts](test-cases/ecommerce-requirements.ts))

Realistic requirements for an online store API with:
- Product catalog with search/filtering
- Shopping cart management
- Checkout and payment processing
- User authentication

### 2. Impossible Requirements ([test-cases/impossible-requirements.ts](test-cases/impossible-requirements.ts))

Intentionally contradictory requirements designed to force max iterations:
- "RESTful API that must also be GraphQL-only"
- "Stateless authentication using stateful sessions"
- "Required fields that are optional"

## Evaluation Criteria

The evaluator scores specs across 5 dimensions:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Completeness** | 30% | All required endpoints and features present |
| **Schema Quality** | 25% | Proper types, validation, reusable components |
| **Security** | 20% | Auth schemes, security requirements, input validation |
| **Documentation** | 15% | Clear descriptions, examples, error docs |
| **Best Practices** | 10% | RESTful design, proper status codes, versioning |

**Acceptance threshold**: Overall score ≥ 85/100 with no critical issues

## Build & Run

### Development Mode

```bash
npm run dev                    # Run main demo
npm run test:max-iterations    # Run max iterations test
```

### Production Build

```bash
npm run build                  # Compile TypeScript
npm start                      # Run compiled code
```

## Key Dependencies

- **@anthropic-ai/sdk** - Claude API integration
- **@apidevtools/swagger-parser** - OpenAPI 3.0 validation
- **tsx** - TypeScript execution for development
- **typescript** - Type safety and compilation

## Configuration Options

You can customize the optimization in [src/index.ts](src/index.ts):

```typescript
const client = new AnthropicClient({
    apiKey,
    maxTokens: 16000  // Adjust for spec complexity
});

const result = await optimizeAPISpec(
    client,
    requirements,
    5  // Max iterations
);
```

## Example Output

```
🚀 Starting Evaluator-Optimizer Test
================================================================================
Starting API Spec Optimization...
Requirements: E-commerce API for an online store

--- Iteration 1 ---
Generating OpenAPI spec...
Validating OpenAPI schema...
Evaluating quality...
Score: 92/100
Decision: accepted

✓ Spec accepted after 1 iteration(s)

=== OPTIMIZATION COMPLETE ===
Accepted: true
Total Iterations: 1
Quality Progression: 92

Iteration 1:
  Score: 92
  Criteria Scores: completeness: 95, schemaQuality: 93, security: 88,
                   documentation: 90, bestPractices: 94

✓ Final spec saved to output/final-openapi-spec.json
```

## Extending the Workflow

### Add New Test Cases

Create a new file in `test-cases/`:

```typescript
import { APIRequirements } from "../src/types.js";

export const myRequirements: APIRequirements = {
  description: "Your API description",
  endpoints: ["endpoint1", "endpoint2"],
  features: ["feature1", "feature2"]
};
```

### Customize Evaluation Criteria

Modify the prompt in [src/evaluator.ts](src/evaluator.ts) to adjust weights or add new criteria.

### Change Acceptance Threshold

Update the acceptance logic in [src/evaluator.ts](src/evaluator.ts):

```typescript
Accept (decision: "accepted") only if:
- overallScore >= 85  // Adjust this threshold
- No critical schema validation errors
- No critical security issues
```

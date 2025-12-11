import { AnthropicClient } from "./utils/anthropic-client.js";
import {
    APIRequirements,
    EvaluatorResult,
    GeneratorResult
} from "./types.js";
import { parseJSONResponse } from "./utils/json-parser.js";

export async function generateOpenAPISpec(
    client: AnthropicClient,
    requirements: APIRequirements,
    previousAttempt?: object,
    feedback?: EvaluatorResult,
    iteration: number = 1
): Promise<GeneratorResult> {

    // Build prompt based on iteration
    let prompt = "";
    if (iteration === 1) {
        prompt = `You are an expert API designer. Generate a complete OpenAPI 3.0 specification for:

        ${requirements.description}

        Requirements:
        - Endpoints: ${requirements.endpoints.join(', ')}
        - Features: ${requirements.features.join(', ')}

        Provide:
        1. Complete OpenAPI 3.0 spec in JSON format
        2. Proper HTTP methods and status codes
        3. Request/response schemas with validation
        4. Security schemes (JWT authentication)
        5. Error responses for all endpoints
        6. Descriptions and examples

        Return ONLY valid JSON for the OpenAPI spec, no markdown formatting.`;
                } else if (feedback) {
                    prompt = `You are an expert API designer. Improve the following OpenAPI specification based on feedback.

        Original Requirements: ${requirements.description}

        Previous Spec:
        ${JSON.stringify(previousAttempt, null, 2)}

        Evaluator Feedback:
        Overall Score: ${feedback.overallScore}/100
        Decision: ${feedback.decision}

        Critical Issues:
        ${feedback.criticalIssues.join('\n')}

        Detailed Feedback:
        ${Object.entries(feedback.criteria).map(([key, val]) =>
            `${key}: ${val.score}/100 - ${val.feedback}`
        ).join('\n')}

        Suggestions:
        ${feedback.suggestions.join('\n')}

        Generate an IMPROVED OpenAPI spec addressing all feedback. Return ONLY valid JSON.`;
    }

    // Call Anthropic API
    const generatorResponse = await client.sendMessage(prompt);
    const rawResponse = generatorResponse.trim();

    // Parse JSON (with error handling)
    try {
        const spec = parseJSONResponse(rawResponse);
        return {
            spec,
            explanation: iteration > 1 ? "Improvements made based on feedback" : undefined,
            rawResponse
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse JSON from generator: ${errorMessage}`);
    }
}
import { AnthropicClient } from "./utils/anthropic-client.js";
import {
    APIRequirements,
    EvaluatorResult,
    ValidationResult
} from "./types.js";
import { parseJSONResponse } from "./utils/json-parser.js";

export async function evaluateOpenAPISpec(
    client: AnthropicClient,
    spec: object,
    requirements: APIRequirements,
    validationResult: ValidationResult,
    iteration: number
): Promise<EvaluatorResult> {
    const evaluationPrompt = `You are an expert API quality reviewer. Evaluate this OpenAPI specification against the requirements.

    Requirements:
    ${requirements.description}
    Required Endpoints: ${requirements.endpoints.join(', ')}
    Required Features: ${requirements.features.join(', ')}
    
    OpenAPI Spec to Evaluate:
    ${JSON.stringify(spec, null, 2)}
    
    Schema Validation Results:
    Valid: ${validationResult.isValid}
    Errors: ${validationResult.errors.join(', ') || 'None'}
    Warnings: ${validationResult.warnings.join(', ') || 'None'}
    
    Evaluate on these criteria (0-100 scale each):
    
    1. COMPLETENESS (30% weight):
        - All required endpoints present
        - All CRUD operations where appropriate
        - Required features implemented
    
    2. SCHEMA QUALITY (25% weight):
        - Proper data types and validation
        - Reusable components/schemas
        - Appropriate use of required fields
        - Example values provided
    
    3. SECURITY (20% weight):
        - Authentication scheme defined
        - Proper security requirements on endpoints
        - Input validation in schemas
    
    4. DOCUMENTATION (15% weight):
        - Clear descriptions for all endpoints
        - Parameter descriptions
        - Response documentation
        - Error response documentation
    
    5. BEST PRACTICES (10% weight):
        - RESTful design principles
        - Proper HTTP status codes
        - Consistent naming conventions
        - Versioning strategy
    
    Respond with a JSON object (no markdown):
    {
        "decision": "accepted" | "rejected",
        "overallScore": <weighted average>,
        "criteria": {
        "completeness": { "score": <0-100>, "feedback": "<specific feedback>", "issues": ["issue1", "issue2"] },
        "schemaQuality": { "score": <0-100>, "feedback": "<specific feedback>", "issues": [] },
        "security": { "score": <0-100>, "feedback": "<specific feedback>", "issues": [] },
        "documentation": { "score": <0-100>, "feedback": "<specific feedback>", "issues": [] },
        "bestPractices": { "score": <0-100>, "feedback": "<specific feedback>", "issues": [] }
        },
        "criticalIssues": ["<issues blocking acceptance>"],
        "suggestions": ["<specific improvements>"]
    }
    
    Accept (decision: "accepted") only if:
    - overallScore >= 85
    - No critical schema validation errors
    - No critical security issues
    
    Current iteration: ${iteration} of 5`;

    const evaluationResponse = await client.sendMessage(evaluationPrompt);

    const evaluation = parseJSONResponse(evaluationResponse) as EvaluatorResult;

    // Validate the evaluation structure
    if (!evaluation.decision || !evaluation.overallScore || !evaluation.criteria) {
        throw new Error("Evaluator returned invalid response structure");
    }
    
    return evaluation;
}

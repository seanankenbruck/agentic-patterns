/**
 * Type definitions for evaluator-optimizer workflow
 */

export interface APIRequirements {
    description: string;
    endpoints: string[]; // high-level endpoint descriptions
    features: string[];  // key features to include
}

export interface GeneratorResult {
    spec: object;           // OpenAPI spec for parsed JSON
    explanation?: string;
    rawResponse: string;
}

export interface EvaluationCriteria {
    score: number; // 0-100
    feedback: string;
    issues: string[];
}

export interface EvaluatorResult {
    decision: "accepted" | "rejected";
    overallScore: number;
    criteria: {
        completeness: EvaluationCriteria;
        schemaQuality: EvaluationCriteria;
        security: EvaluationCriteria;
        documentation: EvaluationCriteria;
        bestPractices: EvaluationCriteria;
    };
    criticalIssues: string[];
    suggestions: string[];
}

export interface IterationResult {
    iteration: number;
    spec: object;
    evaluation: EvaluatorResult;
    validationErrors?: string[]; // From OpenAPI validator
}

export interface OptimizationResult {
    finalSpec: object;
    accepted: boolean;
    iterations: IterationResult[];
    qualityProgression: number[];
    totalIterations: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

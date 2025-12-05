export interface ClassificationResult {
    // Core classification
    intent: 'data_lookup' | 'calculation' | 'web_search' | 'reasoning';
    confidence: number; // 0.0 to 1.0

    // Reasoning & alternatives
    reasoning: string;
    alternativeIntents?: Array<{
        intent: string;
        confidence: number;
    }>;

    // Intent-specific data
    extractedData: {
        // For data_lookup
        entity?: string;    // e.g., 'customer', 'product', 'order'
        fields?: string[];  // e.g., ['name', 'email', 'created_at']
        filters?: Record<string, any>; // e.g., { country: 'US', status: 'active' }

        // For calculation
        operation?: string;   // e.g., 'sum', 'conversion', 'arithmetic'
        operands?: number[];  // Numbers involved
        expression?: string;  // Human-readable expression'

        // For web_search
        searchQuery?: string; // Refined search terms
        searchType?: 'news' | 'sports' | 'technology' | 'science' | 'politics' | 'general';

        // For reasoning
        question?: string;   // The core question to reason about
        criteria?: string[]; // Factors to consider
        context?: string;    // Additional context
    };

    // Safety & validation
    requiresConfirmation?: boolean; // For sensitive actions
    safetyFlags?: string[];
}

export interface HandlerResponse {
    success: boolean;
    data: any;
    metadata: {
        handler: string;
        executionTime: number;
        confidence: number;
    }

    // Optional fields
    note?: string;
    error?: string;
}

export interface RouterResponse {
    classification: ClassificationResult;
    handlerResponse: HandlerResponse;
    formattedOutput: string;
}
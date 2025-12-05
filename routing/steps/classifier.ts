import { AnthropicClient } from '../../shared/anthropic-client';
import { ClassificationResult } from '../types';

export class IntentClassifier {
    private client: AnthropicClient;

    constructor(client: AnthropicClient) {
        this.client = client;
    }

    // Classify intent of the user query
    public async classifyIntent(
        query: string
    ): Promise<ClassificationResult> {
        const classificationPrompt = `
        You are an intent classification model for a query routing system.

        **Important Context**: Our system has access to:
        - Customer, order, and product databases (business data)
        - Mathematical computation capabilities
        - Web search for current information and general knowledge
        - Reasoning/analysis capabilities

        Analyze the user's query and classify it into ONE of these intents:

        **data_lookup**: Retrieving stored information from OUR internal database
        - Our databases contain: customers, orders, products, users, transactions
        - Examples: "What's the email for user #12345?", "Show me orders from last week"
        - Note: General knowledge facts (like "mass of Jupiter") are NOT in our database

        **calculation**: Mathematical computations
        Examples:
        - "What's 15% of $1,250?"
        - "Convert 50 miles to kilometers"
        - "Calculate compound interest on $10,000 at 5% for 3 years"

        **web_search**: Current information not in our database
        - Use this for: news, weather, scientific facts, historical information, public figures
        Examples:
        - "What's the latest news about TypeScript?"
        - "Who won the 2024 Super Bowl?"
        - "Current weather in Seattle"

        **reasoning**: Analysis, comparison, advice, or decision-making
        Examples:
        - "Should I use Python or Go for a REST API?"
        - "What are the pros and cons of microservices?"
        - "How should I approach learning machine learning?"

        User Query: "${query}"

        Respond with JSON only (no markdown, no explanation, no additional text):
        {
        "intent": "data_lookup" | "calculation" | "web_search" | "reasoning",
        "confidence": 0.0-1.0,
        "reasoning": "brief explanation",
        "extractedData": {
            // For data_lookup:
            "entity": "type of data",
            "fields": ["field1", "field2"],
            "filters": {"key": "value"}
            
            // For calculation:
            "operation": "percentage|conversion|arithmetic",
            "operands": [num1, num2],
            "expression": "human readable"
            
            // For web_search:
            "searchQuery": "refined search terms",
            "searchType": "news|general|technical"
            
            // For reasoning:
            "question": "core question",
            "criteria": ["factor1", "factor2"],
            "context": "additional context"
        },
        "alternativeIntents": [
            {"intent": "...", "confidence": 0.0-1.0}
        ],
        "requiresConfirmation": false,
        "safetyFlags": []
        }
        
        **Safety Guidelines**:

        Set "requiresConfirmation: true" for queries that:
        - Request deletion or bulk modification of data
        - Access sensitive information (passwords, credit cards, SSN)
        - Perform financial transactions
        - Could impact multiple records at once

        Add "safetyFlags" for queries that:
        - Request PII (personally identifiable information)
        - Contain potential SQL injection patterns (DROP, DELETE, etc.)
        - Request bulk data exports
        - Search for hacking/exploit information
        - Request personal information about individuals

        Example with safety flags:
        {
        "intent": "data_lookup",
        "confidence": 0.9,
        "reasoning": "Query requests sensitive PII",
        "extractedData": {
            "entity": "customer",
            "fields": ["ssn", "credit_card"]
        },
        "requiresConfirmation": true,
        "safetyFlags": ["pii_request", "financial_data"]
        }
        `.trim();
        const classificationResponse = await this.client.sendMessage(classificationPrompt);

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = classificationResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            // Parse JSON
            const parsed: ClassificationResult = JSON.parse(cleanedResponse);
            const classificationResult = this.validateClassification(parsed);
            return classificationResult;

        } catch (error) {
            console.error("Error parsing classification response:", error);
            console.error("Raw response:", classificationResponse);
            console.error("Query was:", query);
            
            // Return a fallback that preserves the original query
            return {
                intent: 'reasoning',
                confidence: 0.0,
                reasoning: `Failed to parse classification. Error: ${error}`,
                extractedData: {
                    question: query,  // original query
                    context: 'Classification failed, treating as general reasoning'
                }
            };
        }
    }

    private validateClassification(parsed: any): ClassificationResult {
        const validIntents = ['data_lookup', 'calculation', 'web_search', 'reasoning'];
        
        if (!validIntents.includes(parsed.intent)) {
            throw new Error(`Invalid intent: ${parsed.intent}`);
        }
        
        if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
            throw new Error(`Invalid confidence: ${parsed.confidence}`);
        }
        
        return {
            intent: parsed.intent,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning || 'No reasoning provided',
            alternativeIntents: parsed.alternativeIntents || [],
            extractedData: parsed.extractedData || {},
            requiresConfirmation: parsed.requiresConfirmation || false,
            safetyFlags: parsed.safetyFlags || []
        };
    }
}

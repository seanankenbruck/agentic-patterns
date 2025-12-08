import { AnthropicClient } from '../shared/anthropic-client';
import { IntentClassifier } from './steps/classifier';
import { DataLookupHandler } from './handlers/data-lookup-handler';
import { CalculationHandler } from './handlers/calculation-handler';
import { WebSearchHandler } from './handlers/web-search-handler';
import { ReasoningHandler } from './handlers/reasoning-handler';
import { ClassificationResult, HandlerResponse, RouterResponse } from './types';

export class Router {
    private classifier: IntentClassifier;
    private handlers: Map<string, any>;

    constructor(client: AnthropicClient) {
        this.classifier = new IntentClassifier(client);

        // Initialize handlers
        this.handlers = new Map([
            ['data_lookup', new DataLookupHandler()],
            ['calculation', new CalculationHandler()],
            ['web_search', new WebSearchHandler()],
            ['reasoning', new ReasoningHandler(client)]
        ]);
    }

    async route(query: string): Promise<RouterResponse> {
        // Classify intent
        const classification = await this.classifier.classifyIntent(query);

        // Safety check - reject dangerous queries
        if (this.shouldReject(classification)) {
            return this.createRejectionResponse(classification);
        }

        // PII warning
        const hasPiiWarning = classification.safetyFlags?.includes('pii_request') || false;

        // Confidence check
        if (classification.confidence < 0.6) {
            return this.createLowConfidenceResponse(classification);
        }

        // Route to appropriate handler
        const handler = this.handlers.get(classification.intent);
        if (!handler) {
            return this.createErrorResponse(classification, `No handler for intent: ${classification.intent}`);
        }

        const handlerResponse = await handler.handle(classification);

        // Format final response
        const response = this.formatResponse(classification, handlerResponse);

        if (hasPiiWarning && handlerResponse.success) {
            response.formattedOutput += '\n\n⚠️  Note: This response contains personally identifiable information. Handle with care.';
        }

        return response;
    }

    private shouldReject(classification: ClassificationResult): boolean {
        // Only reject truly dangerous flags
        const criticalFlags = [
            'potential_sql_injection',
            'bulk_deletion',
            'potential_malicious_intent',
            'destructive_operation',
            'destructive_command',
            'deletion_request',
            'system_command'
        ];
        
        const hasCriticalFlag = classification.safetyFlags?.some(flag => 
            criticalFlags.includes(flag)
        ) || false;
        
        // Also check for bulk operations that require confirmation
        const hasBulkOperation = classification.safetyFlags?.includes('bulk_operation') || false;
        
        // Reject if:
        // 1. Has critical security flag, OR
        // 2. Requires confirmation but we don't support it yet
        return hasCriticalFlag || (hasBulkOperation && (classification.requiresConfirmation ?? false));
    }

    private createRejectionResponse(classification: ClassificationResult): RouterResponse {
        // Create rejection response
        const syntheticHandlerResponse: HandlerResponse = {
            success: false,
            data: null,
            metadata: {
                handler: 'Router (Security)',
                executionTime: 0,
                confidence: classification.confidence
            },
            error: 'Query rejected due to safety concerns'
        };
        
        // Create user-friendly rejection message
        let formattedOutput = '⛔ I cannot process this request due to security concerns.\n\n';
        
        if (classification.safetyFlags && classification.safetyFlags.length > 0) {
            formattedOutput += 'Detected issues:\n';
            classification.safetyFlags.forEach(flag => {
                formattedOutput += `  - ${this.formatSafetyFlag(flag)}\n`;
            });
        }
        
        if (classification.requiresConfirmation) {
            formattedOutput += '\nThis operation would require explicit authorization, which is not currently supported.';
        }
        
        formattedOutput += '\n\nIf you believe this is an error, please rephrase your request.';
        
        return {
            classification,
            handlerResponse: syntheticHandlerResponse,
            formattedOutput
        };
    }

    private formatSafetyFlag(flag: string): string {
        const flagMessages: Record<string, string> = {
            'bulk_deletion': 'Bulk operations require additional authorization',
            'destructive_operation': 'This operation could have destructive results',
            'destructive_command': 'This command could have destructive results',
            'deletion_request': 'Bulk deletion operations are not allowed',
            'financial_data': 'Financial data access requires authorization',
            'potential_sql_injection': 'Potential SQL injection attempt detected',
            'potential_malicious_intent': 'Potential malicious intent detected',
            'sensitive_data': 'Access to sensitive data detected'
        };
        
        return flagMessages[flag] || `Security concern: ${flag}`;
    }

    private createLowConfidenceResponse(classification: ClassificationResult): RouterResponse {
        // Create low confidence response
        const syntheticHandlerResponse: HandlerResponse = {
            success: false,
            data: null,
            metadata: {
                handler: 'Router (Clarification)',
                executionTime: 0,
                confidence: classification.confidence
            },
            error: 'Low confidence - clarification needed'
        };

        // Create user-friendly rejection message
        let formattedOutput = `🤔 I'm not quite sure what you're asking for (${Math.round(classification.confidence * 100)}% confidence).\n\n`;
    
        formattedOutput += `My best guess is that you want: **${classification.intent.replace('_', ' ')}**\n`;
        
        if (classification.alternativeIntents && classification.alternativeIntents.length > 0) {
            formattedOutput += '\nOther possibilities:\n';
            classification.alternativeIntents.forEach(alt => {
                formattedOutput += `  - ${alt.intent.replace('_', ' ')} (${Math.round(alt.confidence * 100)}%)\n`;
            });
        }
        
        formattedOutput += '\nCould you please clarify or rephrase your question?';
        
        return {
            classification,
            handlerResponse: syntheticHandlerResponse,
            formattedOutput
        };
    }

    private createErrorResponse(classification: ClassificationResult, error: string) {
        // Return error response
        const syntheticHandlerResponse: HandlerResponse = {
            success: false,
            data: null,
            metadata: {
                handler: 'Router (Error)',
                executionTime: 0,
                confidence: classification.confidence
            },
            error
        };
        
        const formattedOutput = `❌ An error occurred while processing your request:\n\n${error}\n\nPlease try again or rephrase your question.`;
        
        return {
            classification,
            handlerResponse: syntheticHandlerResponse,
            formattedOutput
        };
    }

    private formatResponse(
        classification: ClassificationResult,
        handlerResponse: HandlerResponse
    ): RouterResponse {
        
        // Format final user-facing response
        let formattedOutput: string;

        if (!handlerResponse.success) {
            formattedOutput = `I encountered an error: ${handlerResponse.error}`;
        } else {
            // Format based on intent type
            switch(classification.intent) {
                case 'data_lookup':
                    formattedOutput = this.formatDataLookup(handlerResponse);
                    break;
                case 'calculation':
                    formattedOutput = this.formatCalculation(handlerResponse);
                    break;
                case 'web_search':
                    formattedOutput = this.formatWebSearch(handlerResponse);
                    break;
                case 'reasoning':
                    formattedOutput = this.formatReasoning(handlerResponse);
                    break;
                default:
                    formattedOutput = JSON.stringify(handlerResponse.data);
            }

            // Add note if exists
            if (handlerResponse.note) {
                formattedOutput += `\n\nNote: ${handlerResponse.note}`;
            }
        }

        return {
            classification,
            handlerResponse,
            formattedOutput
        }
    }

    private formatDataLookup(response: HandlerResponse): string {
        const data = response.data;
        if (Array.isArray(data) && data.length === 0) {
            return "No records found matching your criteria.";
        }
        return `Found ${Array.isArray(data) ? data.length : 1} result(s):\n${JSON.stringify(data, null, 2)}`;
    }

    private formatCalculation(response: HandlerResponse): string {
        return response.data.explanation || `Result: ${response.data.result}`;
    }

    private formatWebSearch(response: HandlerResponse): string {
        return `Search results for "${response.data.query}":\n${JSON.stringify(response.data.results, null, 2)}`;
    }

    private formatReasoning(response: HandlerResponse): string {
        return response.data.answer;
    }
}
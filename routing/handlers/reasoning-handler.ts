import { BaseHandler } from './base-handler';
import { ClassificationResult, HandlerResponse } from '../types';
import { AnthropicClient } from '../../shared/anthropic-client';

export class ReasoningHandler extends BaseHandler {
    private client: AnthropicClient;

    constructor(client: AnthropicClient) {
        super();
        this.client = client;
    }

    async handle(classification: ClassificationResult): Promise<HandlerResponse> {
        const startTime = Date.now();

        const { question, criteria, context } = classification.extractedData;

        if (!question) {
            return this.createResponse(
                false,
                null,
                'ReasoningHandler',
                Date.now() - startTime,
                classification.confidence,
                undefined,
                'No question provided for reasoning'
            );
        }

        // Reasoning prompt construction
        const reasoningPrompt = `
        You are an analytical assistant helping users think through complex questions.

        Question: ${question}

        ${criteria && criteria.length > 0 ? `Consider these factors:\n${criteria.map(c => `- ${c}`).join('\n')}` : ''}

        ${context ? `Additional context: ${context}` : ''}

        Please provide a clear, well-reasoned response that:
        1. Directly addresses the question
        2. Explains the reasoning behind your answer
        3. Discusses relevant trade-offs or considerations
        4. Provides specific examples where helpful
        5. Keeps the response concise but thorough (2-4 paragraphs)
        `.trim();

        const reasoningResponse = await this.client.sendMessage(reasoningPrompt);

        try {
            return this.createResponse(
                true,
                {
                    question,
                    answer: reasoningResponse,
                    criteria: criteria || [],
                    context: context || ''
                },
                'ReasoningHandler',
                Date.now() - startTime,
                classification.confidence,
            );
        } catch (error) {
            return this.createResponse(
                false,
                null,
                'ReasoningHandler',
                Date.now() - startTime,
                classification.confidence,
                undefined,
                `Error during reasoning: ${error}`
            );
        }
    }
}
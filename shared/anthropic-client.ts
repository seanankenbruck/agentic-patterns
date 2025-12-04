import Anthropic from "@anthropic-ai/sdk";
import { AnthropicMessage, AnthropicResponse, APIConfig } from "./types.js";

export class AnthropicClient {
    private client: Anthropic;
    private defaultModel: string;
    private defaultMaxTokens: number;

    constructor(config: APIConfig) {
        if (!config.apiKey) {
            throw new Error("Anthropic API key is required");
        }

        this.client = new Anthropic({ apiKey: config.apiKey });
        this.defaultModel = config.model || "claude-sonnet-4-20250514";
        this.defaultMaxTokens = config.maxTokens || 4096;
    }

    /**
     * Send a single message to Claude
     * @param userMessage - The message to send
     * @param systemPrompt - Optional system prompt to set context
     * @returns Claude's response text
     */
    async sendMessage(
        userMessage: string,
        systemPrompt?: string
    ): Promise<string> {
      try {
        // Create the messages array
        const messages: AnthropicMessage[] = [
            { role: 'user', content: userMessage }
        ];

        // Build the API request parameters
        const requestParams: any = {
            model: this.defaultModel,
            max_tokens: this.defaultMaxTokens,
            messages: messages
        };

        // Add system prompt if provided
        if (systemPrompt) {
            requestParams.system = systemPrompt;
        }

        // Call the Anthropic API
        const response = await this.client.messages.create(requestParams);
        
        // Extract text from response
        const text = response.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('');

        if (!text) {
            throw new Error('No text content in response');
        }

        return text;
        
      } catch (error) {
        throw new Error(`Error communicating with Anthropic API: ${error}`);
      }
    };
}
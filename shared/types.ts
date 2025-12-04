// Types related to Anthropic API
export type AnthropicMessage = {
    role: 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string }>;
}

export type AnthropicResponse = {
    content: { type: string; text: string }[];
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

export type APIConfig = {
    apiKey: string;
    model?: string;
    maxTokens?: number;
}
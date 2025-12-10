import Anthropic from '@anthropic-ai/sdk';

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class AnthropicClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 4000
  ): Promise<LLMResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      // Extract text content from response
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('\n');

      return {
        content: textContent,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate completion and parse JSON response
   */
  async generateJSONCompletion<T>(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 4000
  ): Promise<T> {
    const response = await this.generateCompletion(systemPrompt, userPrompt, maxTokens);
    
    try {
      // Try to extract JSON from code blocks or parse directly
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : response.content;
      
      return JSON.parse(jsonString.trim()) as T;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
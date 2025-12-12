import Anthropic from '@anthropic-ai/sdk';
import { ReActResponse } from './types';

export class AnthropicClient {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async getReActResponse(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 4000
  ): Promise<ReActResponse> {
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
      const textContent = response.content.find(block => block.type === 'text');
        if (!textContent || textContent.type !== 'text') {
            throw new Error('No text content in response');
        }

        // Parse JSON response
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        return JSON.parse(jsonMatch[0]) as ReActResponse;
    }
}
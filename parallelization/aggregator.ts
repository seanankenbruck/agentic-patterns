import { AnthropicClient } from "../shared/anthropic-client";
import { SectionSummary, AggregationResult } from "./types";

export class SummaryAggregator {
    private client: AnthropicClient;

    constructor(client: AnthropicClient) {
        this.client = client;
    }

    /**
    * Combines multiple section summaries into a final document summary
    * Uses LLM to synthesize the pieces coherently
    */
   public async aggregateSummaries(
    sections: SectionSummary[]
   ): Promise<AggregationResult> {

        // Format section summaries for the prompt
        const sectionsText = sections
            .map(s=> `Section ${s.sectionNumber}: ${s.summary}`)
            .join(`\n\n`);

        const aggregationPrompt = `
        You are synthesizing section summaries into a cohesive executive summary.

        Your task: Create a unified, flowing summary that reads as a single narrative. Do NOT reference section numbers or the fact that this came from sections. Focus on the main themes, key insights, and overall narrative arc of the document.

        Style: Executive summary - high-level, clear, and accessible to non-technical audiences.
        Length: 2-3 paragraphs that flow naturally.

        Section summaries to synthesize:
        ${sectionsText}

        Respond with JSON only (no markdown, no explanation, no additional text):
        {
            "finalSummary": "your cohesive executive summary here (2-3 flowing paragraphs)"
        }
    `.trim();

        const aggregationResponse = await this.client.sendMessage(aggregationPrompt);

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = aggregationResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            // Parse JSON 
            const parsed = JSON.parse(cleanedResponse);

            if (!parsed.finalSummary || typeof parsed.finalSummary != 'string') {
                throw new Error('Invalid response structure: missing final summary field');
            }

            // Calculate metrics
            const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
            const summaryWordCount = parsed.finalSummary.split(/\s+/).length;

            return {
                finalSummary: parsed.finalSummary,
                sectionCount: sections.length,
                totalWordCount,
                summaryWordCount,
                compressionRatio: Math.round(totalWordCount / summaryWordCount * 10) / 10
            };
        } catch (error) {
            console.error("Error parsing aggregation response:", error);
            console.error("Raw response:", aggregationResponse);
            
            // Fallback: use concatenation
            const fallbackSummary = this.concatenateSummaries(sections);
            const totalWordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
            
            return {
                finalSummary: fallbackSummary,
                sectionCount: sections.length,
                totalWordCount,
                summaryWordCount: fallbackSummary.split(/\s+/).length,
                compressionRatio: 0
            };
        }
   }

   /**
     * Alternative: Simple concatenation (no LLM call)
     * Useful for comparison or as fallback
     */
    public concatenateSummaries(sections: SectionSummary[]): string {
        return sections
            .map(s => s.summary)
            .join(' ');
    }
}
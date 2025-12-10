import { AnthropicClient } from '../shared/anthropic-client';
import { SummaryCandidate } from './types';

interface SelectionResult {
    selectedSummary: SummaryCandidate;
    selectionReason: string;
    allCandidates: SummaryCandidate[];
}

export class SummarySelector {
    private client: AnthropicClient;

    constructor(client: AnthropicClient) {
        this.client = client;
    }

    // Use LLM to evaluate candidates and vote for best one
    public async selectBestSummary(
        candidates: SummaryCandidate[],
        criteria?: string
    ): Promise<SelectionResult> {

        // Format candidates for the prompt
        const candidatesText = candidates
            .map(c => `Candidate ${c.id} (${c.approach} approach):\n${c.summary}`)
            .join('\n\n---\n\n');

        // Prompt to evaluate candidates
        const evaluateSummaryPrompt = `
        You are an expert evaluator of document summaries. Your task is to review multiple summary candidates and select the best one.

        Evaluation Criteria: ${criteria}

        Here are the summary candidates:

        ${candidatesText}

        Please evaluate each candidate based on the criteria and select the best one. Consider:
        - Accuracy: Does it capture the main points?
        - Clarity: Is it easy to understand?
        - Completeness: Does it cover important details without being verbose?
        - Coherence: Does it flow well and make logical sense?

        Respond with JSON only (no markdown, no explanation, no additional text):
        {
            "selectedId": <the ID number of the best candidate>,
            "reasoning": "brief explanation of why this candidate is best (2-3 sentences)"
        }
        `.trim();

        const response = await this.client.sendMessage(evaluateSummaryPrompt);

        try {
            // Clean the response
            let cleanedResponse = response.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            // Parse JSON
            const parsed = JSON.parse(cleanedResponse);

            if (!parsed.selectedId || !parsed.reasoning) {
                throw new Error('Invalid response structure: missing selectedId or reasoning');
            }

            // Find the selected candidate
            const selectedSummary = candidates.find(c => c.id === parsed.selectedId);
            
            if (!selectedSummary) {
                throw new Error(`Selected ID ${parsed.selectedId} not found in candidates`);
            }

            return {
                selectedSummary,
                selectionReason: parsed.reasoning,
                allCandidates: candidates
            };

        } catch (error) {
            console.error("Error parsing selection response:", error);
            console.error("Raw response:", response);
            
            // Fallback: just return the first candidate
            return {
                selectedSummary: candidates[0],
                selectionReason: "[Error: Could not evaluate candidates, returning first candidate as fallback]",
                allCandidates: candidates
            };
        }
    }
}
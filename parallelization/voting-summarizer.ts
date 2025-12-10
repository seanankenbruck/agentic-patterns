/**
 * Main orchestrator for voting-based summarization
 * Runs task multiple times to synthesize the best result
 */
import { AnthropicClient } from '../shared/anthropic-client';
import { SummarySelector } from './summary-selector';
import { SummaryCandidate } from './types';



interface VotingResult {
    candidates: SummaryCandidate[];
    selectedSummary: SummaryCandidate;
    selectionReason: string;
    totalCandidates: number;
    processingTimeMs: number;
}

export class VotingSummarizer {
    private client: AnthropicClient;

    constructor(client: AnthropicClient) {
        this.client = client;
    }

    // Generate multiple summaries in parallel
    private async generateSummary(
        document: string,
        approach: string,
        id: number
    ): Promise<SummaryCandidate> {

        // Build approach-specific prompt
        let approachInstruction = "";
        switch(approach) {
            case "technical":
                approachInstruction = "Focus on technical details, jargon OK";
                break;
            case "executive":
                approachInstruction = "High-level, business focused, minimize jargon and simplify concepts"
                break;
            case "detailed":
                approachInstruction = "Comprehensive, include key points, explain each component fully";
                break;
            case "concise":
                approachInstruction = "Extremely brief, only core message";
                break;
        }

        const votingPrompt = `
        You are an expert copy editor summarizing a document based on the following approach instruction:
        
        Approach instruction: ${approachInstruction}
        Document: ${document}

        Please provide a concise summary of the document (3-5 sentences capturing the main points).

        Respond with JSON only (no markdown, no explanation, no additional text):
        {
            "summary": "your summary here"
        }
        `.trim();

        const votingResponse = await this.client.sendMessage(votingPrompt);

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = votingResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            // Parse JSON 
            const parsed = JSON.parse(cleanedResponse);

            if (!parsed.summary || typeof parsed.summary != 'string') {
                throw new Error('Invalid response structure: missing summary field');
            }

            return {
                id,
                approach: approach,
                summary: parsed.summary,
                generatedAt: new Date()
            }
        } catch (error) {
            console.error("Error parsing voting candidate response:", error);
            console.error("Raw response:", votingResponse);
            
            // Return a fallback
            return {
                id,
                approach: approach,
                summary: `[Error: Could not generate summary using this approach]`,
                generatedAt: new Date()
            }
        }
    }

    /**
   * Main public method - generates N different summaries in parallel
   */
    public async generateCandidates(
        document: string,
        approaches: string[] = ["technical", "executive", "detailed", "concise"]
    ): Promise<SummaryCandidate[]> {
        
        // Run all approaches in parallel
        const candidates = await Promise.all(
        approaches.map((approach, index) => 
            this.generateSummary(document, approach, index + 1)
        )
        );
        
        return candidates;
    }

    /**
     * Complete voting workflow - generate candidates and select best
     */
    public async summarizeWithVoting(
        document: string,
        approaches: string[] = ["technical", "executive", "detailed", "concise"]
    ): Promise<VotingResult> {
        const startTime = Date.now();
        
        // 1. Generate all candidates in parallel
        const candidates = await this.generateCandidates(document, approaches);
        
        // 2. Select the best candidate
        const selector = new SummarySelector(this.client);
        const selection = await selector.selectBestSummary(candidates);
        
        // 3. Return complete result
        return {
            candidates,
            selectedSummary: selection.selectedSummary,
            selectionReason: selection.selectionReason,
            totalCandidates: candidates.length,
            processingTimeMs: Date.now() - startTime
        };
    }
}
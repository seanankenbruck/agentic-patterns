/**
 * Main orchestrator for sectioning-based summarization
 * Splits document into chunks and processes them in parallel
 */
import { AnthropicClient } from '../shared/anthropic-client';
import { SummaryAggregator } from './aggregator';
import { SectionSummary, AggregationResult } from "./types";

interface SectioningResult {
    sections: SectionSummary[];
    totalSections: number;
    processingTimeMs: number;
}

export class SectioningSummarizer {
    private client: AnthropicClient;

    constructor(client: AnthropicClient) {
        this.client = client;
    }
    
    // Split document into management chunks
    private splitIntoSections(document: string, chunkSize: number): string[] {
        const sections: string[] = [];
        const paragraphs = document.split("\n\n").filter(p => p.trim().length > 0);

        let currentChunk = "";
        let currentWordCount = 0;

        for (const paragraph of paragraphs) {
            const paragraphWordCount = paragraph.split(/\s+/).length;

            // If adding this paragraph would exceed chunkSize, save current chunk and start new one
            if (currentWordCount > 0 && currentWordCount + paragraphWordCount > chunkSize) {
                sections.push(currentChunk.trim());
                currentChunk = paragraph;
                currentWordCount = paragraphWordCount;
            } else {
                // Add paragraph to current chunk
                currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
                currentWordCount += paragraphWordCount;
            }
        }

        // Process last chunk
        if (currentChunk.trim().length > 0) {
            sections.push(currentChunk.trim());
        }

        return sections;
    }

    // Summarize a single section (called in parallel for each chunk)
    public async summarizeSection(
        sectionText: string, 
        sectionNumber: number,
        totalSections: number
    ): Promise<SectionSummary> {
        const wordCount = sectionText.split(/\s/).length;

        const summarizerPrompt = `
        You are an expert copy editor summarizing a document section by section.

        This is section ${sectionNumber} of ${totalSections} sections.

        Section text:
        ${sectionText}

        Please provide a concise summary of this section (5 sentences or less capturing the main points).

        Respond with JSON only (no markdown, no explanation, no additional text):
        {
            "summary": "your summary here"
        }
        `.trim();

        const summaryResponse = await this.client.sendMessage(summarizerPrompt);

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = summaryResponse.trim();
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
                sectionNumber,
                content: sectionText,
                summary: parsed.summary,
                wordCount
            }
        } catch (error) {
            console.error("Error parsing summarization response:", error);
            console.error("Raw response:", summaryResponse);
            
            // Return a fallback with reference to section number
            return {
                sectionNumber,
                content: sectionText,
                summary: `[Error: Could not generate summary for section ${sectionNumber}]`,
                wordCount
            }
        }
    }

    // Main public method
    private async summarizeDocument(
        document: string, 
        chunkSize: number = 1000
    ): Promise<SectioningResult> {
        const startTime = Date.now();
        
        // 1. Split document into sections
        const sections = this.splitIntoSections(document, chunkSize);
        
        // 2. Process all sections in parallel with Promise.all
        const summaries = await Promise.all(
        sections.map((section, index) => 
            this.summarizeSection(section, index + 1, sections.length)
        )
        );
        
        // 3. Return aggregated result
        return {
            sections: summaries,
            totalSections: sections.length,
            processingTimeMs: Date.now() - startTime
        };
    }

    public async summarizeWithAggregation(
        document: string,
        chunkSize: number = 1000
    ): Promise<{
        sections: SectionSummary[];
        aggregation: AggregationResult;
        totalProcessingTimeMs: number;
    }> {
        const startTime = Date.now();
        
        // 1. Split and summarize sections
        const sectioningResult = await this.summarizeDocument(document, chunkSize);
        
        // 2. Aggregate into final summary
        const aggregator = new SummaryAggregator(this.client);
        const aggregation = await aggregator.aggregateSummaries(sectioningResult.sections);
        
        return {
            sections: sectioningResult.sections,
            aggregation,
            totalProcessingTimeMs: Date.now() - startTime
        };
    }
}
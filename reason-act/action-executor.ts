import { ReActStep } from "./types";
import { TavilyClient } from "./tavily-client";

export class ActionExecutor {

    constructor(private tavilyClient: TavilyClient) {}

    async execute(
        action: string, 
        input: string, 
        history: ReActStep[]
    ): Promise<string> {
        switch(action) {
            case 'search':
                return await this.search(input);
            case 'lookup':
                return this.lookup(input, history);
            case 'final_answer':
                return input; // return the answer
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    private async search(query: string): Promise<string> {
        try {
            const searchResult = await this.tavilyClient.search(query);
            return searchResult;
        } catch (error) {
            // Return error as observation so the agent can reason about it
            if (error instanceof Error) {
                return `Search failed: ${error.message}`;
            }
            return 'Search failed: Unknown error occurred.';
        }
    }

    private lookup(query: string, history: ReActStep[]): string {
        // Search through previous observations for specific info
        // This helps when a search returned too much data

        const searchObservations = history
            .filter(step => step.action === 'search')
            .map(step => step.observation);

        if (searchObservations.length === 0) {
            return "No previous search results to look up from.";
        }

        // Combine all search results
        const allResults = searchObservations.join('\n\n---\n\n');

        // Find relevant sentences/paragraphs containing the query terms
        const queryTerms = query.toLowerCase().split(/\s+/);
        const lines = allResults.split('\n');

        const relevantLines = lines.filter(line => {
            const lowerLine = line.toLowerCase();
            return queryTerms.some(term => lowerLine.includes(term));
        });

        if (relevantLines.length === 0) {
            return `No information found for "${query}" in previous search results.`;
        }

        return relevantLines.join('\n');
    }
}
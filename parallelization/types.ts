export interface SectionSummary {
    sectionNumber: number;
    content: string;    // Original chunk text
    summary: string;    // Summary of this chunk
    wordCount: number;
}

export interface SummaryCandidate {
    id: number;
    approach: string; // i.e. 'technical', 'executive', 'detailed'
    summary: string;
    generatedAt: Date;
}

export interface AggregationResult {
    finalSummary: string;
    sectionCount: number;
    totalWordCount: number;
    summaryWordCount: number;
    compressionRatio: number; // original words / summary words
}
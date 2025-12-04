export type PipelineInput = {
    filePath: string;
    fileContent: string;
    language?: string;
}

export type AnalysisResult = {
    summary: string;
    complexity: string[];
    antiPatterns: string[];
    bugs: string[];
    securityRisks: string[];
    hasIssues: boolean;
    rawResponse?: string;
}

export type ProposedSolutions = {
    summary: string;
    recommendations: {
        issue: string;
        solution: string;
        rationale: string;
    }[];
    rawResponse?: string;
}

export type UpdatedCode = {
    updatedContent: string;
    changesSummary: string;
    rawResponse?: string;
}

export type CommitInfo = {
    commitMessage: string;
    commitBody?: string;
    rawResponse?: string;
}

export type PipelineResult = {
    input: PipelineInput;
    analysis: AnalysisResult;
    proposedSolutions?: ProposedSolutions;
    updatedCode?: UpdatedCode;
    commitInfo?: CommitInfo;
    success: boolean;
    error?: string;
}
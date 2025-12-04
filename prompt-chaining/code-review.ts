import { Pipe } from "stream";
import { AnthropicClient } from "../shared/anthropic-client";
import {
    PipelineInput,
    PipelineResult,
    AnalysisResult,
    ProposedSolutions,
    UpdatedCode,
    CommitInfo
} from "./types.js";

export class CodeReviewPipeline {
    private client: AnthropicClient;

    constructor(client: AnthropicClient) {
        this.client = client;
    }

    // Analyze the code
    private async analyzeCode(input: PipelineInput): Promise<AnalysisResult> {
        // Create detailed prompt that requests structured output
        const analysisPrompt = `
You are a code reviewer. Analyze the following ${input.language || 'code'} code for issues.

CODE TO ANALYZE:
\`\`\`
${input.fileContent}
\`\`\`

Please provide your analysis as valid JSON in this exact format:
{
    "summary": "Brief summary of the code",
    "complexity_issues": [
        "List of complexity issues found"
    ],
    "anti_patterns": [
        "List of anti-patterns found"
    ],
    "bugs": [ 
        "List of bugs found"
    ],
    "security_risks": [
        "List of security risks found"
    ],
    "overall_assessment": "NO_ISSUES_FOUND" | "ISSUES_FOUND"
}

For the overall_assessment attribute: Write either "NO_ISSUES_FOUND" if the code is good, or "ISSUES_FOUND" if there are problems to fix]
Return ONLY the JSON, no additional text.
`.trim();

        const analysisResponse = await this.client.sendMessage(analysisPrompt);

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = analysisResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            // Parse the response
            const parsed = JSON.parse(cleanedResponse);
            const analysisResult: AnalysisResult = {
                summary: parsed.summary,
                complexity: parsed.complexity_issues,
                antiPatterns: parsed.anti_patterns,
                bugs: parsed.bugs,
                securityRisks: parsed.security_risks,
                hasIssues: parsed.overall_assessment === "ISSUES_FOUND",
                rawResponse: analysisResponse
            };

            // Implement the gate
            if (!analysisResult.hasIssues) {
                console.log("✓ No issues found - code looks good!");
                // Don't throw - just return the result with hasIssues=false
                // The orchestrator will handle stopping the pipeline
            }

            return analysisResult;
        } catch (error) {
            console.error("Error parsing analysis response:", error);
            return {
                summary: "Error parsing response",
                complexity: [],
                antiPatterns: [],
                bugs: [],
                securityRisks: [],
                hasIssues: false,
                rawResponse: analysisResponse
            }
        }
    }

    // Propose solutions
    private async proposeSolutions(
        input: PipelineInput,
        analysis: AnalysisResult
    ): Promise<ProposedSolutions> {
        // Create prompt that references original code, includes analysis results, asks for solutions
        const solutionsPrompt = `
You are a code improvement assistant. Based on the following analysis of the code, propose solutions for each identified issue.

CODE TO IMPROVE:
\`\`\`
${input.fileContent}
\`\`\`

ANALYSIS RESULTS:
SUMMARY:
${analysis.summary}

COMPLEXITY ISSUES:
${analysis.complexity.map(issue => `- ${issue}`).join('\n') || 'None found'}

ANTI-PATTERNS:
${analysis.antiPatterns.map(issue => `- ${issue}`).join('\n') || 'None found'}

BUGS:
${analysis.bugs.map(issue => `- ${issue}`).join('\n') || 'None found'}

SECURITY RISKS:
${analysis.securityRisks.map(issue => `- ${issue}`).join('\n') || 'None found'}

Please provide your response as valid JSON in this exact format:
{
  "summary": "Brief overview",
  "recommendations": [
    {
      "issue": "Description of issue",
      "solution": "Proposed solution",
      "rationale": "Reasoning"
    }
  ]
}

Return ONLY the JSON, no additional text.
`.trim();

        const solutionsResponse = await this.client.sendMessage(solutionsPrompt);

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = solutionsResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            const parsed = JSON.parse(cleanedResponse);
            const proposedSolutions: ProposedSolutions = {
                summary: parsed.summary,
                recommendations: parsed.recommendations,
                rawResponse: solutionsResponse
            };
            return proposedSolutions;
        } catch (error) {
            console.error("Error parsing proposed solutions response:", error);
            return {
                summary: "Error parsing response",
                recommendations: [],
                rawResponse: solutionsResponse
            }
        }

    }
}
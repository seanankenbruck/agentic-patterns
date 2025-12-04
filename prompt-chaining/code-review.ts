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

    // Generate updated code
    private async generateUpdatedCode(
        input: PipelineInput,
        analysis: AnalysisResult,
        solutions: ProposedSolutions
    ): Promise<UpdatedCode> {

        const updatePrompt = `
        You are a code refactoring assistant. Based on the following proposed solutions, generate an updated version of the code.

        CODE TO IMPROVE:
        \`\`\`
        ${input.fileContent}
        \`\`\`

        ANALYSIS SUMMARY:
        ${analysis.summary}
        
        ANALYSIS DETAILS:
        COMPLEXITY ISSUES:
        ${analysis.complexity.map(issue => `- ${issue}`).join('\n') || 'None found'}

        ANTI-PATTERNS:
        ${analysis.antiPatterns.map(issue => `- ${issue}`).join('\n') || 'None found'}

        BUGS:
        ${analysis.bugs.map(issue => `- ${issue}`).join('\n') || 'None found'}

        SECURITY RISKS:
        ${analysis.securityRisks.map(issue => `- ${issue}`).join('\n') || 'None found'}

        SUMMARY OF PROPOSED CHANGES:
        ${solutions.summary}

        PROPOSED SOLUTIONS:
        ${solutions.recommendations.map(rec => `- ISSUE: ${rec.issue}\n  SOLUTION: ${rec.solution}\n  RATIONALE: ${rec.rationale}`).join('\n\n')}

        Please provide your response as valid JSON in this exact format:
        {
          "updated_code": "The full updated code with improvements applied",
          "changes_summary": "Summary of changes made"
        }

        Return ONLY the JSON, no additional text.
        `.trim();

        const updateResponse = await this.client.sendMessage(updatePrompt);

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = updateResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            const parsed = JSON.parse(cleanedResponse);
            const updatedCode: UpdatedCode = {
                updatedContent: parsed.updated_code,
                changesSummary: parsed.changes_summary,
                rawResponse: updateResponse
            };
             
            return updatedCode;
        } catch (error) {
            console.error("Error parsing updated code response:", error);
            return {
                updatedContent: "",
                changesSummary: "Error parsing response",
                rawResponse: updateResponse
            }
        }
    }

    // Generate a commit message
    private async generateCommitMessage(
        input: PipelineInput,
        updatedCode: UpdatedCode
    ): Promise<CommitInfo> {
        const commitPrompt = `
        You are a git commit message generator. Based on the following code changes, create a concise and descriptive commit message.
        
        FILE: ${input.filePath}

        CHANGES SUMMARY:
        ${updatedCode.changesSummary}

        Please provide your response as valid JSON in this exact format:
        {
          "commit_message": "type: brief description (following git conventions)",
          "commit_body": "detailed explanation (optional)"
        }
        Use conventional commit types: fix, feat, refactor, docs, style, test, chore.
        Return ONLY the JSON, no additional text.
        `.trim();

        const commitResponse = await this.client.sendMessage(commitPrompt);

        try {
            // Clean the response - remove markdown code blocks if present
            let cleanedResponse = commitResponse.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\n/, '').replace(/\n```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\n/, '').replace(/\n```$/, '');
            }

            const parsed = JSON.parse(cleanedResponse);
            const commitInfo: CommitInfo = {
                commitMessage: parsed.commit_message,
                commitBody: parsed.commit_body,
                rawResponse: commitResponse
            };

            return commitInfo;
        } catch (error) {
            console.error("Error parsing commit message response:", error);
            return {
                commitMessage: "Error generating commit message",
                commitBody: "",
                rawResponse: commitResponse
            }
        }
    }

    // Setup the pipeline orchestrator
    async run(input: PipelineInput): Promise<PipelineResult> {
        console.log("Starting Code Review Pipeline...\n");

        try {
            console.log("Step 1: Analyzing code...");
            const analysis = await this.analyzeCode(input);

            // Gate: Exit early if no issues
            if (!analysis.hasIssues) {
                console.log("✅ No issues found. Pipeline complete.\n");
                return {
                    input,
                    analysis: analysis,
                    success: true
                };
            }

            // Step 2: Propose solutions
            console.log("Step 2: Proposing solutions...");
            const solutions = await this.proposeSolutions(input, analysis);

            // Step 3: Generate updated code
            console.log("Step 3: Generating updated code...");
            const updatedCode = await this.generateUpdatedCode(input, analysis, solutions);

            // Step 4: Generate commit message
            console.log("Step 4: Generating commit message...");
            const commitInfo = await this.generateCommitMessage(input, updatedCode);

            console.log("✅ Pipeline complete!\n");

            return {
                input,
                analysis: analysis,
                proposedSolutions: solutions,
                updatedCode,
                commitInfo,
                success: true
            };
        } catch (error) {
            console.error("❌ Pipeline failed:", error);
            return {
                input,
                analysis: {} as AnalysisResult, // You'll need to handle this better
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
/**
 * Moderator agent - facilitates and guides the debate
 *
 * Key responsibilities:
 * - Introduce the debate and set the stage
 * - Decide which debater should speak next
 * - Ask targeted follow-up questions
 * - Detect convergence or stalemate
 * - Synthesize final recommendation
 */
import { AnthropicClient } from "./utils/anthropic-client";
import { DebateState, ModeratorAction, DebaterRole } from "./types";

export class Moderator {
    private client: AnthropicClient;

    constructor(
        client: AnthropicClient,
    ) {
        this.client = client;
    }

    /**
     * Generate opening statement to kick off the debate
     */
    async openDebate(
        topic: string,
        context: string,
        debaters: DebaterRole[]
    ): Promise<{ opening: string; firstSpeaker: DebaterRole; question: string }> {
        const systemPrompt = this.buildModeratorSystemPrompt();

        const debatersList = debaters.join(', ');
        const userPrompt = `You are moderating a debate on the following topic:

TOPIC: ${topic}

CONTEXT: ${context}

AVAILABLE DEBATERS: ${debatersList}

Please provide your opening statement to kick off this debate. Your response should:
1. Introduce the topic and explain why it's important
2. Summarize the context for the participants
3. Select which debater should speak first (choose strategically based on the topic)
4. Pose an opening question to that debater

Respond in the following JSON format:
{
  "opening": "Your opening statement here",
  "firstSpeaker": "engineer|business|security",
  "question": "Your opening question for the first speaker"
}`;

        const rawResponse = await this.client.sendMessage(userPrompt, systemPrompt);

        return this.parseJSONResponse<{ opening: string; firstSpeaker: DebaterRole; question: string }>(rawResponse);
    }

    /**
     * Decide what to do next in the debate
     * 
     * This is the core intelligence:
     * - Analyzes current debate state
     * - Identifies agreements and disagreements
     * - Decides if convergence reached
     * - Selects next speaker intelligently
     * - Poses targeted follow-up questions
     */
    async decideNextAction(state: DebateState): Promise<ModeratorAction> {
        const systemPrompt = this.buildModeratorSystemPrompt();
        
        const formattedHistory = this.formatDebateHistory(state);
        const speakCounts = this.getDebaterSpeakCounts(state);
        const lastSpeaker = this.getLastSpeaker(state);
        
        const speakCountsSummary = Array.from(speakCounts.entries())
            .map(([role, count]) => `${role}: ${count} times`)
            .join(', ');

        const userPrompt = `You are moderating a debate on the following topic:

TOPIC: ${state.topic}

CONTEXT: ${state.context}

CURRENT ROUND: ${state.currentRound}

DEBATE HISTORY:
${formattedHistory}

SPEAKING STATISTICS:
${speakCountsSummary}
Last speaker: ${lastSpeaker || 'none'}

PREVIOUS OBSERVATIONS:
Points of Agreement: ${state.pointsOfAgreement.length > 0 ? state.pointsOfAgreement.join('; ') : 'None identified yet'}
Points of Disagreement: ${state.pointsOfDisagreement.length > 0 ? state.pointsOfDisagreement.join('; ') : 'None identified yet'}

Please analyze the current state of the debate and decide what to do next.

Your tasks:
1. Identify any NEW points of agreement that have emerged
2. Identify any NEW points of disagreement or tension
3. Determine if the debate has reached convergence

CONVERGENCE CRITERIA:
- All major arguments have been presented
- Debaters are starting to repeat themselves
- A clear consensus is emerging OR a clear stalemate is evident
- At least 2-3 rounds per debater have occurred (minimum ${state.perspectives.length * 2} rounds)
- The discussion is no longer generating new insights

If the debate has NOT converged:
4. Select the next speaker strategically (consider who hasn't spoken recently, who needs to respond to challenges, whose perspective is most relevant to unresolved points)
5. Pose a targeted question to draw out their perspective

Respond in the following JSON format:
{
  "type": "ask_speaker" | "declare_convergence",
  "nextSpeaker": "engineer" | "business" | "security" (only if type is "ask_speaker"),
  "question": "Your question for the next speaker" (only if type is "ask_speaker"),
  "reasoning": "Explain your decision",
  "observedAgreements": ["agreement1", "agreement2"],
  "observedDisagreements": ["disagreement1", "disagreement2"]
}`;

        const rawResponse = await this.client.sendMessage(userPrompt, systemPrompt);

        return this.parseJSONResponse<ModeratorAction>(rawResponse);
    }

    /**
     * Synthesize final recommendation from the debate
     */
    async synthesizeRecommendation(state: DebateState): Promise<string> {
        const systemPrompt = `You are an expert facilitator synthesizing the results of a technical debate.

Your role is to:
- Provide an objective, balanced summary of the debate
- Acknowledge the validity of different perspectives
- Identify areas of consensus and unresolved tensions
- Make a clear, actionable recommendation
- Suggest concrete next steps

Guidelines:
- Be fair to all perspectives - don't favor one role over others
- Acknowledge trade-offs explicitly
- Make your recommendation clear but explain the reasoning
- Identify any conditions or caveats
- Be concise but thorough`;

        const formattedHistory = this.formatDebateHistory(state);

        const userPrompt = `You have just moderated a debate on the following topic:

TOPIC: ${state.topic}

CONTEXT: ${state.context}

FULL DEBATE HISTORY:
${formattedHistory}

IDENTIFIED AGREEMENTS:
${state.pointsOfAgreement.length > 0 ? state.pointsOfAgreement.map((a, i) => `${i + 1}. ${a}`).join('\n') : 'None explicitly identified'}

IDENTIFIED DISAGREEMENTS:
${state.pointsOfDisagreement.length > 0 ? state.pointsOfDisagreement.map((d, i) => `${i + 1}. ${d}`).join('\n') : 'None explicitly identified'}

Please provide a comprehensive synthesis of this debate with the following structure:

1. EXECUTIVE SUMMARY (2-3 sentences)
   Briefly state the decision and key reasoning

2. KEY ARGUMENTS BY PERSPECTIVE
   Summarize the main points from each stakeholder:
   - Engineering perspective
   - Business perspective
   - Security perspective

3. POINTS OF CONSENSUS
   What did the debaters agree on?

4. UNRESOLVED TENSIONS
   What trade-offs or disagreements remain?

5. FINAL RECOMMENDATION
   Make a clear recommendation with:
   - The recommended decision (build or buy)
   - Key reasoning for this choice
   - Important conditions or caveats
   - How to address concerns from each perspective

6. SUGGESTED NEXT STEPS
   What concrete actions should be taken to move forward?

Please write this synthesis in a professional, balanced tone suitable for executive decision-making.`;

        const rawResponse = await this.client.sendMessage(userPrompt, systemPrompt);

        return rawResponse;
    }

    /**
     * Build system prompt for moderator role
     */
    private buildModeratorSystemPrompt(): string {
        return `You are an experienced debate moderator facilitating a professional discussion between stakeholders with different perspectives.

Your responsibilities:
- Set a professional, balanced tone for the debate
- Ensure all perspectives are heard fairly
- Ask probing questions that draw out key concerns and reasoning
- Guide the discussion toward productive outcomes while allowing healthy disagreement
- Identify points of agreement and disagreement objectively
- Recognize when the debate has reached a natural conclusion
- Remain neutral and unbiased - don't favor any particular perspective

Guidelines:
- Be concise but thorough in your statements
- Ask questions that encourage specific, detailed responses
- Challenge weak arguments and highlight strong reasoning
- Maintain a respectful but intellectually rigorous atmosphere
- Focus on substance over style - push for concrete details and trade-offs`.trim();
    }

    /**
     * Format debate history for analysis
     */
    private formatDebateHistory(state: DebateState): string {
        if (state.messages.length === 0) {
            return "No debate history yet.";
        }

        return state.messages.map(msg => {
            const speaker = msg.speaker === 'moderator' 
                ? 'Moderator'
                : `${msg.speakerName} (${msg.speaker})`;
            return `${speaker}: ${msg.content}`;
        }).join('\n\n');
    }

    /**
     * Parse JSON response from Claude
     * Handles both JSON blocks and plain JSON
     */
    private parseJSONResponse<T>(content: string): T {
        try {
            // Try to extract JSON from markdown code blocks first
            const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
                return JSON.parse(codeBlockMatch[1]);
            }

            // Try to find any JSON object in the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            throw new Error(`Failed to parse JSON response: ${error}\n\nRaw content: ${content}`);
        }
    }

    /**
     * Count how many times each debater has spoken
     */
    private getDebaterSpeakCounts(state: DebateState): Map<DebaterRole, number> {
        const counts = new Map<DebaterRole, number>();
        
        // Initialize all debater roles to 0
        for (const perspective of state.perspectives) {
            counts.set(perspective.role, 0);
        }

        // Count actual speeches
        for (const message of state.messages) {
            if (message.speaker !== 'moderator') {
                const currentCount = counts.get(message.speaker as DebaterRole) || 0;
                counts.set(message.speaker as DebaterRole, currentCount + 1);
            }
        }

        return counts;
    }

    /**
     * Get the debater who spoke most recently
     */
    private getLastSpeaker(state: DebateState): DebaterRole | null {
        // Iterate backwards through messages to find last non-moderator speaker
        for (let i = state.messages.length - 1; i >= 0; i--) {
            const message = state.messages[i];
            if (message.speaker !== 'moderator') {
                return message.speaker as DebaterRole;
            }
        }
        return null;
    }
}
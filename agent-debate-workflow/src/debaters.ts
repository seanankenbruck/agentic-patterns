/**
 * Debater agents - each represents a different stakeholder perspective
 *
 * Key responsibilities:
 * - Maintain consistent perspective throughout debate
 * - Respond to moderator questions and other debaters
 * - Make arguments based on their role's priorities
 * - Challenge other perspectives when appropriate
 */
import { AnthropicClient } from "./utils/anthropic-client";
import { DebaterPerspective, DebaterRole, DebateMessage, DebaterResponse } from "./types";


export class Debater{
    private client: AnthropicClient;
    private perspective: DebaterPerspective;

    constructor(
        client: AnthropicClient,
        perspective: DebaterPerspective
    ) {
        this.client = client;
        this.perspective = perspective;
    }

    // Generate response to current debate state
    async respond(
        topic: string,
        context: string,
        debateHistory: DebateMessage[],
        moderatorQuestion?: string
    ): Promise<DebaterResponse> {

        // Build prompts
        const systemPrompt = this.buildSystemPrompt(topic);
        const userPrompt = this.buildUserPrompt(topic, context, debateHistory, moderatorQuestion);

        // Use the AnthropicClient's sendMessage method
        const rawContent = await this.client.sendMessage(userPrompt, systemPrompt);

        return this.parseResponse(rawContent);
    }

    // Build system prompt that defines debater's perspective
    private buildSystemPrompt(topic: string): string {
    const prioritiesList = this.perspective.priorities.map(p => `  - ${p}`).join('\n');
        const concernsList = this.perspective.concerns.map(c => `  - ${c}`).join('\n');

        return `You are ${this.perspective.name}, a ${this.perspective.title}, participating in a debate about: "${topic}".

        Your role is to represent the ${this.perspective.role} perspective in this debate.

        Your priorities are:
        ${prioritiesList}

        Your key concerns are:
        ${concernsList}

        Guidelines:
        - Stay in character consistently throughout the debate
        - Make strong, well-reasoned arguments from your perspective
        - Challenge other viewpoints when they conflict with your priorities
        - Be professional but assertive - this is a debate, not a consensus-building exercise
        - Reference specific points made by others when responding to them
        - Back up your claims with concrete reasoning
        - Be willing to concede good points, but don't abandon your core priorities

        Response format:
        - Start with your main argument or position
        - Provide 2-4 key supporting points
        - Address other speakers' points when relevant
        - Use a natural, conversational debate style (not overly formal)`.trim();
    }

    private formatDebateHistory(messages: DebateMessage[]): string {
        if (messages.length === 0) {
            return "No debate history yet.";
        }

        return messages.map(msg => {
            const speaker = msg.speaker === 'moderator' 
                ? 'Moderator'
                : msg.speakerName;
            return `${speaker}: ${msg.content}`;
        }).join('\n\n');
    }

    // Build user prompt with current debate state 
    private buildUserPrompt(
        topic: string,
        context: string,
        debateHistory: DebateMessage[],
        moderatorQuestion?: string
    ): string {
        const formattedHistory = this.formatDebateHistory(debateHistory);
        let prompt = `DEBATE TOPIC: ${topic}

        CONTEXT: ${context}

        DEBATE HISTORY:
        ${formattedHistory}
        `;

                if (moderatorQuestion) {
                    prompt += `\n\nThe moderator is now asking you specifically: ${moderatorQuestion}\n`;
                }

                prompt += `\nPlease provide your response as ${this.perspective.name} (${this.perspective.role}), including:
        1. Your main argument or position
        2. Key supporting points (2-4 points)
        3. Responses to other speakers' points (if relevant)

        Remember to stay in character and argue from your perspective's priorities and concerns.`;

        return prompt;
    }

    // Parse Claude's response to extract information
    private parseResponse(rawContent: string): DebaterResponse {
        // Extract key points from bullet points or numbered lists
        const keyPoints: string[] = [];
        const bulletRegex = /^[\s]*[-*•]\s+(.+)$/gm;
        const numberedRegex = /^[\s]*\d+[\.)]\s+(.+)$/gm;

        let match: RegExpExecArray | null;
        while ((match = bulletRegex.exec(rawContent)) !== null) {
            keyPoints.push(match[1].trim());
        }
        while ((match = numberedRegex.exec(rawContent)) !== null) {
            keyPoints.push(match[1].trim());
        }

        // Look for mentions of other roles in content
        const addressedSpeakers: string[] = [];
        const allRoles: DebaterRole[] = ['engineer', 'business', 'security'];

        for (const role of allRoles) {
            // Check for role mentions (case-insensitive)
            const rolePattern = new RegExp(`\\b${role}\\b`, 'i');
            if (rolePattern.test(rawContent)) {
                addressedSpeakers.push(role);
            }
        }

        return {
            content: rawContent,
            keyPoints,
            addressedSpeakers: addressedSpeakers.length > 0 ? addressedSpeakers : undefined
        };
    }

    // Get this debater's perspectives
    getPerspective(): DebaterPerspective {
        return this.perspective;
    }
}

/**
 * Factory function to create standard debater perspectives
 */
export function createStandardDebaters(): DebaterPerspective[] {
  return [
    {
      role: 'engineer',
      name: 'Jennifer Parker',
      title: 'Senior Platform Engineer',
      priorities: [
        'Technical flexibility and control',
        'Integration with existing systems',
        'Debugging and troubleshooting capabilities',
        'Performance and reliability',
        'Team learning and skill development'
      ],
      concerns: [
        'Vendor lock-in',
        'Limited customization options',
        'Technical debt from poor tooling choices',
        'Operational complexity',
        'Loss of technical expertise'
      ],
      typicalArguments: [
        'Building gives us exactly what we need',
        'We understand our systems better than any vendor',
        'Open source solutions offer better long-term value',
        'Custom solutions can be optimized for our use case'
      ]
    },
    {
      role: 'business',
      name: 'Marty McFly',
      title: 'VP of Engineering',
      priorities: [
        'Time to market',
        'Total cost of ownership',
        'Team productivity and focus',
        'Predictable budgeting',
        'Risk mitigation',
        'Scalability with business growth'
      ],
      concerns: [
        'Opportunity cost of building',
        'Ongoing maintenance burden',
        'Hiring and retention challenges',
        'Distraction from core product',
        'Hidden costs and overruns'
      ],
      typicalArguments: [
        'We should focus on our core business differentiators',
        'Vendors have solved this problem at scale',
        'Build estimates always underestimate true cost',
        'SaaS solutions offer predictable pricing'
      ]
    },
    {
      role: 'security',
      name: 'Dr. Emmett Brown',
      title: 'Chief Information Security Officer',
      priorities: [
        'Data privacy and compliance',
        'Security audit and control',
        'Incident response capabilities',
        'Third-party risk management',
        'Data sovereignty',
        'Security visibility'
      ],
      concerns: [
        'Data exfiltration risks',
        'Vendor security posture',
        'Compliance violations',
        'Supply chain attacks',
        'Audit trail completeness',
        'In-house security expertise gaps'
      ],
      typicalArguments: [
        'Sending observability data to third parties increases attack surface',
        'We need complete control over sensitive telemetry data',
        'Vendor security incidents could expose our data',
        'Self-hosted solutions give us better compliance control'
      ]
    }
  ];
}
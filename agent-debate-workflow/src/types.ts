/**
 * Core types for the multi-agent debate workflow
 */

export type DebaterRole = 'engineer' | 'business' | 'security';
export type SpeakerType = 'moderator' | DebaterRole;

/**
 * Define debate perspective and characteristics
 */
export interface DebaterPerspective {
    role: DebaterRole;
    name: string;
    title: string;
    priorities: string[];       // What is role optimized for
    concerns: string[];         // What concerns this role has
    typicalArguments: string[]; // Common talking points
}

/**
 * Debate message definition
 */
export interface DebateMessage {
    speaker: SpeakerType;
    speakerName: string;
    content: string;
    addressing?: string[]; // Which speaker is this directed to
    roundNumber: number;
    timestamp: Date;
}

/**
 * Complete state of an ongoing debate
 *
 */
export interface DebateState {
    topic: string;
    context: string;
    perspectives: DebaterPerspective[];
    messages: DebateMessage[];
    currentRound: number;
    pointsOfAgreement: string[];
    pointsOfDisagreement: string[];
    hasConverged: boolean;
    finalRecommendation?: string;
}

/**
 * Moderators decision about next steps
 */
export interface ModeratorAction {
    type: 'ask_speaker' | 'declare_convergence';
    nextSpeaker?: DebaterRole;
    question?: string;  // Question for next speaker
    reasoning: string;  // Why moderator made this choice
    observedAgreements?: string[];
    observedDisagreements?: string[];
}

/**
 * Debaters response
 */
export interface DebaterResponse {
    content: string;
    keyPoints: string[];          // Main arguments made
    addressedSpeakers?: string[]  // Response directed at
}

/**
 * Configuration for the debate
 */
export interface DebateConfig {
    maxRounds: number;
    anthropicApiKey: string;
    model?: string;
    verbose?: boolean;
}

/**
 * Initial setup for debate
 */
export interface DebateSetup {
    topic: string;
    context: string;
    config: DebateConfig;
}

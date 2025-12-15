/**
 * Debate Engine - orchestrates the multi-agent debate workflow
 * 
 * Key responsibilities:
 * - Initialize debate state
 * - Run the dynamic debate loop
 * - Coordinate between moderator and debaters
 * - Track conversation history
 * - Handle max rounds enforcement
 * - Return final synthesis
 */

import { AnthropicClient } from './utils/anthropic-client';
import { Debater, createStandardDebaters } from './debaters';
import { Moderator } from './moderator';
import {
  DebateState,
  DebateConfig,
  DebaterPerspective,
  DebaterRole,
  DebateMessage,
  ModeratorAction
} from './types';

export class DebateEngine {
  private client: AnthropicClient;
  private moderator: Moderator;
  private debaters: Map<DebaterRole, Debater>;
  private config: DebateConfig;
  private verbose: boolean;

  constructor(config: DebateConfig) {
    this.config = config;
    this.verbose = config.verbose || false;

    // Initialize the Anthropic client
    this.client = new AnthropicClient({
      apiKey: config.anthropicApiKey,
      model: config.model
    });

    // Initialize the moderator
    this.moderator = new Moderator(this.client);

    // Initialize debaters
    this.debaters = new Map<DebaterRole, Debater>();
    const perspectives = createStandardDebaters();

    for (const perspective of perspectives) {
      const debater = new Debater(this.client, perspective);
      this.debaters.set(perspective.role, debater);
    }

    if (this.verbose) {
      console.log('DebateEngine initialized with:');
      console.log(`  - Max rounds: ${this.config.maxRounds}`);
      console.log(`  - Debaters: ${Array.from(this.debaters.keys()).join(', ')}`);
    }
  }

  /**
   * Run a complete debate from start to finish
   * 
   * Flow:
   * 1. Initialize debate state
   * 2. Moderator opens debate
   * 3. Loop until convergence or max rounds:
   *    a. Selected debater responds
   *    b. Add response to history
   *    c. Moderator decides next action
   *    d. Update state with agreements/disagreements
   * 4. Moderator synthesizes final recommendation
   * 5. Return complete debate state
   */
  async runDebate(topic: string, context: string): Promise<DebateState> {
    // Log start if verbose
    if (this.verbose) {
      console.log('\n=== STARTING DEBATE ===');
      console.log(`Topic: ${topic}`);
      console.log(`Context: ${context}\n`);
    }

    // Initialize state with empty debate
    const state = this.initializeDebateState(topic, context);

    // Moderator opens the debate
    const opening = await this.moderator.openDebate(
      topic,
      context,
      Array.from(this.debaters.keys())
    );

    // Add moderator's opening statement to history
    this.addMessage(state, 'moderator', 'Moderator', opening.opening);

    // Log opening if verbose
    if (this.verbose) {
      console.log('--- MODERATOR OPENING ---');
      console.log(opening.opening);
      console.log(`\nFirst speaker: ${opening.firstSpeaker}`);
      console.log(`Question: ${opening.question}\n`);
    }

    // First debater responds to opening question
    let currentSpeaker = opening.firstSpeaker;
    let currentQuestion = opening.question;
    
    // Main debate loop
    while (!state.hasConverged && state.currentRound <= this.config.maxRounds) {
      // Log current round if verbose
      if (this.verbose) {
        console.log(`\n--- ROUND ${state.currentRound} ---`);
      }

      // Get the current debater
      const debater = this.debaters.get(currentSpeaker);
      if (!debater) {
        throw new Error(`Debater not found for role: ${currentSpeaker}`);
      }

      // Debater responds
      const response = await debater.respond(
        topic,
        context,
        state.messages,
        currentQuestion
      );

      // Add debater's response to history
      const perspective = debater.getPerspective();
      this.addMessage(state, currentSpeaker, perspective.name, response.content);

      // Log response if verbose
      if (this.verbose) {
        console.log(`\n${perspective.name} (${currentSpeaker}):`);
        console.log(response.content);
      }

      // Check if we've hit max rounds
      if (state.currentRound >= this.config.maxRounds) {
        // Log max rounds reached if verbose
        if (this.verbose) {
          console.log('\n⚠️  Max rounds reached - ending debate');
        }
        state.hasConverged = true;
        break;
      }
      
      // Moderator decides next action
      const action = await this.moderator.decideNextAction(state);

      // Update state with moderator's observations
      state.pointsOfAgreement = this.mergeUnique(
        state.pointsOfAgreement,
        action.observedAgreements || []
      );
      state.pointsOfDisagreement = this.mergeUnique(
        state.pointsOfDisagreement,
        action.observedDisagreements || []
      );

      // Log moderator decision if verbose
      if (this.verbose) {
        console.log('\nModerator Decision:');
        console.log(`  Type: ${action.type}`);
        console.log(`  Reasoning: ${action.reasoning}`);
        if (action.observedAgreements && action.observedAgreements.length > 0) {
          console.log(`  New agreements: ${action.observedAgreements.join('; ')}`);
        }
        if (action.observedDisagreements && action.observedDisagreements.length > 0) {
          console.log(`  New disagreements: ${action.observedDisagreements.join('; ')}`);
        }
      }

      if (action.type === 'declare_convergence') {
        // Debate has converged
        state.hasConverged = true;

        // Add moderator's convergence message
        this.addMessage(
          state,
          'moderator',
          'Moderator',
          `The debate has reached convergence. ${action.reasoning}`
        );

        // Log convergence if verbose
        if (this.verbose) {
          console.log('\n✅ CONVERGENCE REACHED');
          console.log(`Total agreements: ${state.pointsOfAgreement.length}`);
          console.log(`Total disagreements: ${state.pointsOfDisagreement.length}`);
        }
        break;
      }
      
      // Continue debate - moderator asks next speaker
      if (!action.nextSpeaker || !action.question) {
        throw new Error('Moderator must specify next speaker and question when not declaring convergence');
      }
      
      currentSpeaker = action.nextSpeaker;
      currentQuestion = action.question;
      
      // Add moderator's question to history
      this.addMessage(
        state,
        'moderator',
        'Moderator',
        `[To ${currentSpeaker}] ${currentQuestion}`
      );
      
      // Increment round
      state.currentRound++;
    }
    
    // Generate final synthesis
    // Log synthesis generation if verbose
    if (this.verbose) {
      console.log('\n=== GENERATING FINAL SYNTHESIS ===');
    }

    const synthesis = await this.moderator.synthesizeRecommendation(state);
    state.finalRecommendation = synthesis;

    // Log completion if verbose
    if (this.verbose) {
      console.log('\n=== DEBATE COMPLETE ===');
      console.log(`Total rounds: ${state.currentRound}`);
      console.log(`Total messages: ${state.messages.length}`);
      console.log(`Converged: ${state.hasConverged}`);
      console.log(`\nFinal Recommendation:`);
      console.log(synthesis);
    }

    return state;
  }

  /**
   * Initialize empty debate state
   */
  private initializeDebateState(topic: string, context: string): DebateState {
    const perspectives = createStandardDebaters();
    
    return {
      topic,
      context,
      perspectives,
      messages: [],
      currentRound: 1,
      pointsOfAgreement: [],
      pointsOfDisagreement: [],
      hasConverged: false
    };
  }

  /**
   * Add a message to the debate history
   */
  private addMessage(
    state: DebateState,
    speaker: 'moderator' | DebaterRole,
    speakerName: string,
    content: string
  ): void {
    state.messages.push({
      speaker,
      speakerName,
      content,
      roundNumber: state.currentRound,
      timestamp: new Date()
    });
  }

  /**
   * Merge arrays and remove duplicates
   */
  private mergeUnique(existing: string[], newItems: string[]): string[] {
    const combined = [...existing, ...newItems];
    return Array.from(new Set(combined));
  }

  /**
   * Get current debate statistics
   */
  getDebateStats(state: DebateState): {
    totalMessages: number;
    messagesByRole: Map<string, number>;
    totalRounds: number;
    converged: boolean;
  } {
    const messagesByRole = new Map<string, number>();
    
    for (const message of state.messages) {
      const count = messagesByRole.get(message.speaker) || 0;
      messagesByRole.set(message.speaker, count + 1);
    }
    
    return {
      totalMessages: state.messages.length,
      messagesByRole,
      totalRounds: state.currentRound,
      converged: state.hasConverged
    };
  }
}
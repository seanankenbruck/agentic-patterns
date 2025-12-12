import { AnthropicClient } from "./anthropic-client";
import { ActionExecutor } from "./action-executor";
import { ReActStep, ReActResult, ReActConfig } from "./types";
import { REACT_SYSTEM_PROMPT, buildReActPrompt } from "./prompts";

export class ReActAgent {

    constructor(
        private anthropicClient: AnthropicClient,
        private actionExecutor: ActionExecutor,
        private config: ReActConfig
    ) {}

    async run(question: string): Promise<ReActResult> {
        const startTime = Date.now();
        const history: ReActStep[] = [];

        for (let i = 0; i < this.config.maxIterations; i++) {
            // 1. Build prompt with question + history
            const prompt = buildReActPrompt(question, history);
            
            // 2. Get reasoning + action from Claude
            const response = await this.anthropicClient.getReActResponse(
                REACT_SYSTEM_PROMPT, 
                prompt
            );
            
            // 3. Execute the action
            const observation = await this.actionExecutor.execute(
                response.action,
                response.actionInput,
                history
            );
            
            // 4. Add step to history
            history.push({
                thought: response.thought,
                action: response.action,
                actionInput: response.actionInput,
                observation: observation,
                confidence: response.confidence
            });
            
            // 5. Check if done
            if (response.action === 'final_answer') {
                return { 
                    answer: response.actionInput,
                    confidence: response.confidence || 0,
                    history,
                    iterations: i,
                    stoppedReason: 'final_answer',
                    processingTimeMs: Date.now() - startTime
                    
                };
            }
        }

        // Max iterations reached - return best effort answer
        return {
            answer: 'Unable to determine a final answer within the iteration limit.',
            confidence: 0,
            history,
            iterations: this.config.maxIterations,
            stoppedReason: 'max_iterations',
            processingTimeMs: Date.now() - startTime
        };
    }
}
# Multi-Agent Collaboration Pattern

This example demonstrates multi-agent collaboration via a **moderated debate workflow** that begins by introducing a topic with context, a moderator agent analyzes the topic and proposes initial questions, then additional agents debate the topic until convergence is reached or a maximum iteration limit is exceeded.

## Overview
A sophisticated debate pattern implementation featuring three stakeholder perspectives (Engineering, Business, Security) arguing about technical architecture decisions.

## Workflow

1. User provides debate topic + context
2. Moderator analyzes topic, introduces debate, poses initial question
3. LOOP (until convergence or max rounds):
   a. Moderator selects next speaker (based on context)
   b. Selected debater responds:
      - Addresses moderator's question/previous points
      - Makes their argument from their perspective
      - May challenge other debaters
   c. Moderator analyzes the discussion:
      - Identifies points of agreement/disagreement
      - Decides if more discussion needed
      - Poses follow-up questions OR declares convergence
4. Moderator synthesizes final recommendation

## Project Structure

```
debate-workflow/
├── src/
│   ├── types.ts           # Core interfaces
│   ├── debaters.ts        # Debater agent implementations
│   ├── moderator.ts       # Moderator agent
│   ├── debate-engine.ts   # Main orchestration logic
│   └── index.ts           # CLI entry point
├── package.json
└── tsconfig.json
```

## Setup

1. Install dependencies:
```bash
   npm install
```

2. Set your Anthropic API key:
```bash
   export ANTHROPIC_API_KEY="your_api_key"
```

3. Run the debate:
```bash
   npm start
```

## How It Works

The debate follows this pattern:

1. **Opening**: Moderator introduces topic and asks first question
2. **Dynamic Loop**: 
   - Debaters respond with their perspective
   - Moderator analyzes arguments and identifies agreements/disagreements
   - Moderator selects next speaker strategically
   - Continues until convergence or max rounds
3. **Synthesis**: Moderator produces final recommendation

## Output

- Live debate transcript in terminal (colorized)
- Saved markdown transcript in `./output/`
- Statistics on debate progression

## Key Differences from ReAct

1. Multiple agents with distinct personalities/perspectives (not just different tools)
2. Moderator is conversational coordinator (not task executor)
3. Goal is synthesis/decision (not completing a task)
4. Agent interactions are argumentative (not just informational)
/**
 * CLI entry point for the debate workflow
 * 
 * Runs a multi-agent debate on technical architecture decisions
 */

import { DebateEngine } from './debate-engine';
import { DebateConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

// ANSI color codes for better terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  moderator: '\x1b[36m',    // Cyan
  engineer: '\x1b[32m',     // Green
  business: '\x1b[33m',     // Yellow
  security: '\x1b[35m',     // Magenta
  
  info: '\x1b[34m',         // Blue
  success: '\x1b[32m',      // Green
  warning: '\x1b[33m',      // Yellow
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function printHeader(text: string): void {
  console.log('\n' + colorize('='.repeat(80), 'dim'));
  console.log(colorize(text, 'bright'));
  console.log(colorize('='.repeat(80), 'dim') + '\n');
}

function printSpeaker(speaker: string, role: string, content: string): void {
  const colorKey = role === 'moderator' ? 'moderator' : role as keyof typeof colors;
  console.log(colorize(`\n${speaker} (${role}):`, colorKey));
  console.log(content);
  console.log(colorize('-'.repeat(80), 'dim'));
}

function printInfo(text: string): void {
  console.log(colorize(`ℹ ${text}`, 'info'));
}

function printSuccess(text: string): void {
  console.log(colorize(`✓ ${text}`, 'success'));
}

function saveDebateTranscript(
  state: any,
  outputDir: string = './output'
): string {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `debate-${timestamp}.md`;
  const filepath = path.join(outputDir, filename);

  // Build markdown transcript
  let transcript = `# Debate Transcript: ${state.topic}\n\n`;
  transcript += `**Date:** ${new Date().toLocaleString()}\n\n`;
  transcript += `**Context:** ${state.context}\n\n`;
  transcript += `---\n\n`;

  // Add debate messages
  transcript += `## Debate Discussion\n\n`;
  for (const message of state.messages) {
    transcript += `### ${message.speakerName} (${message.speaker})\n`;
    transcript += `*Round ${message.roundNumber}*\n\n`;
    transcript += `${message.content}\n\n`;
    transcript += `---\n\n`;
  }

  // Add identified points
  if (state.pointsOfAgreement.length > 0) {
    transcript += `## Points of Agreement\n\n`;
    state.pointsOfAgreement.forEach((point: string, i: number) => {
      transcript += `${i + 1}. ${point}\n`;
    });
    transcript += `\n`;
  }

  if (state.pointsOfDisagreement.length > 0) {
    transcript += `## Points of Disagreement\n\n`;
    state.pointsOfDisagreement.forEach((point: string, i: number) => {
      transcript += `${i + 1}. ${point}\n`;
    });
    transcript += `\n`;
  }

  // Add final synthesis
  if (state.finalRecommendation) {
    transcript += `## Final Synthesis\n\n`;
    transcript += `${state.finalRecommendation}\n\n`;
  }

  // Add statistics
  transcript += `## Debate Statistics\n\n`;
  transcript += `- Total Rounds: ${state.currentRound}\n`;
  transcript += `- Total Messages: ${state.messages.length}\n`;
  transcript += `- Converged: ${state.hasConverged ? 'Yes' : 'No'}\n`;

  // Write to file
  fs.writeFileSync(filepath, transcript, 'utf-8');

  return filepath;
}

async function main() {
  printHeader('Multi-Agent Debate: Build vs Buy Observability Platform');

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(colorize('Error: ANTHROPIC_API_KEY environment variable not set', 'warning'));
    process.exit(1);
  }

  // Configure debate
  const config: DebateConfig = {
    maxRounds: 15,
    anthropicApiKey: apiKey,
    model: 'claude-sonnet-4-20250514',
    verbose: true
  };

  // Define debate topic and context
  const topic = 'Should we build or buy an observability platform for our company?';
  const context = `Our company is a fast-growing SaaS startup with 50 engineers and a microservices architecture running on Kubernetes. We currently have basic monitoring with Prometheus and Grafana, but we lack comprehensive distributed tracing, log aggregation, and real-time alerting. The engineering team is split on whether to build a custom observability solution using open-source tools (OpenTelemetry, Jaeger, Loki) or purchase a commercial platform (Datadog, New Relic, Dynatrace). Budget for year one is $500K, and we have 2-3 engineers who could be allocated to building/maintaining an in-house solution.`;

  printInfo(`Topic: ${topic}`);
  printInfo(`Max Rounds: ${config.maxRounds}`);
  printInfo(`Model: ${config.model}`);
  console.log();

  // Create debate engine
  const engine = new DebateEngine(config);

  // Run the debate
  printInfo('Starting debate...');
  
  try {
    const startTime = Date.now();
    
    const state = await engine.runDebate(topic, context);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Print debate transcript
    printHeader('Debate Transcript');
    
    for (const message of state.messages) {
      printSpeaker(message.speakerName, message.speaker, message.content);
    }

    // Print identified points
    if (state.pointsOfAgreement.length > 0) {
      printHeader('Points of Agreement');
      state.pointsOfAgreement.forEach((point, i) => {
        console.log(`${i + 1}. ${point}`);
      });
    }

    if (state.pointsOfDisagreement.length > 0) {
      printHeader('Points of Disagreement');
      state.pointsOfDisagreement.forEach((point, i) => {
        console.log(`${i + 1}. ${point}`);
      });
    }

    // Print final synthesis
    printHeader('Final Synthesis');
    console.log(state.finalRecommendation);

    // Print statistics
    printHeader('Debate Statistics');
    const stats = engine.getDebateStats(state);
    console.log(`Total Rounds: ${stats.totalRounds}`);
    console.log(`Total Messages: ${stats.totalMessages}`);
    console.log(`Converged: ${stats.converged ? 'Yes' : 'No'}`);
    console.log('\nMessages by Role:');
    stats.messagesByRole.forEach((count, role) => {
      console.log(`  ${role}: ${count}`);
    });
    console.log(`\nDuration: ${duration}s`);

    // Save transcript
    const filepath = saveDebateTranscript(state);
    printSuccess(`Debate transcript saved to: ${filepath}`);

  } catch (error) {
    console.error(colorize('\nError running debate:', 'warning'));
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly (ES module compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main().catch(error => {
    console.error(colorize('Fatal error:', 'warning'));
    console.error(error);
    process.exit(1);
  });
}

export { main };
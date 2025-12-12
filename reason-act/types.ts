export interface ReActStep {
  thought: string;
  action: 'search' | 'lookup' | 'final_answer';
  actionInput: string;
  observation: string;
  confidence?: number;
}

export interface ReActResponse {
  thought: string;
  action: 'search' | 'lookup' | 'final_answer';
  actionInput: string;
  confidence?: number;
}

export interface ReActResult {
  answer: string;
  confidence: number;
  history: ReActStep[];
  iterations: number;
  stoppedReason: 'final_answer' | 'max_iterations' | 'error';
  processingTimeMs: number;
}

export interface ReActConfig {
  maxIterations: number;
  tavilyApiKey: string;
  anthropicApiKey: string;
  model: string;
}

// Tavily API types
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  results: TavilySearchResult[];
}
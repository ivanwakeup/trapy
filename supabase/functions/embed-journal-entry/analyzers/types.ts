import { CheckInContext } from "../chunker.ts";

export interface AnalysisContext {
  body: string;
  checkin?: CheckInContext;
}

// An Analyzer takes some input and returns structured output.
// Future agents (cognitive distortions, attachment patterns, etc.) implement this.
export interface Analyzer<TInput, TOutput> {
  readonly name: string;
  analyze(input: TInput): Promise<TOutput>;
}

// Convenience type for agents that operate on a single chunk of text
export type ChunkAnalyzer<TOutput> = Analyzer<string, TOutput>;

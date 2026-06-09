import { GeminiChunkingProvider } from "./providers/gemini.ts";

export interface Chunk {
  text: string;
  emotional_tone: string;
  themes: string[];
  arc_position: "onset" | "escalation" | "peak" | "de-escalation" | "resolution" | "reflection";
}

export interface CheckInContext {
  activation_level: number;
  triggers: string[];
  thoughts: string[];
  urges: string[];
}

export interface ChunkingProvider {
  readonly model: string;
  chunk(body: string, checkin?: CheckInContext): Promise<Chunk[]>;
}

export function getChunkingProvider(): ChunkingProvider {
  const provider = Deno.env.get("CHUNKING_PROVIDER") ?? "gemini";
  switch (provider) {
    case "gemini": return new GeminiChunkingProvider();
    // case "claude": return new ClaudeChunkingProvider();  — add when ANTHROPIC_API_KEY is available
    default: throw new Error(`Unknown CHUNKING_PROVIDER: ${provider}`);
  }
}

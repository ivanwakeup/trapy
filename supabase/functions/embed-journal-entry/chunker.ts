import { GeminiChunkingProvider } from "./providers/gemini.ts";
import { ClaudeChunkingProvider } from "./providers/claude.ts";

export interface Chunk {
  text: string;
  emotional_tone: string;
  themes: string[];
  arc_position: "onset" | "escalation" | "peak" | "de-escalation" | "resolution" | "reflection";
  people: string[];
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
  const provider = Deno.env.get("CHUNKING_PROVIDER") ?? "claude";
  switch (provider) {
    case "claude": return new ClaudeChunkingProvider();
    case "gemini": return new GeminiChunkingProvider();
    default: throw new Error(`Unknown CHUNKING_PROVIDER: ${provider}`);
  }
}

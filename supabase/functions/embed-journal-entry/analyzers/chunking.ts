import { Chunk, CheckInContext, ChunkingProvider } from "../chunker.ts";
import { callClaude } from "../providers/claude.ts";
import { Analyzer, AnalysisContext } from "./types.ts";

const PROMPT_TEMPLATE = await Deno.readTextFile(
  new URL("../prompts/chunking.txt", import.meta.url)
);

function buildPrompt(body: string, checkin?: CheckInContext): string {
  const checkinContext = checkin
    ? `Context from their check-in before writing:
- Activation level: ${checkin.activation_level}/10
- Triggers they identified: ${checkin.triggers.join(", ") || "none"}
- Thoughts running: ${checkin.thoughts.join(", ") || "none"}
- Urges they felt: ${checkin.urges.join(", ") || "none"}

`
    : "";

  return PROMPT_TEMPLATE
    .replace("{{CHECKIN_CONTEXT}}", checkinContext)
    .replace("{{BODY}}", body);
}

// Implements both the new Analyzer interface and the existing ChunkingProvider
// interface so chunker.ts doesn't need to change its call sites.
export class ChunkingAnalyzer implements Analyzer<AnalysisContext, Chunk[]>, ChunkingProvider {
  readonly name = "chunking";
  readonly model = "claude-haiku-4-5-20251001";

  async analyze({ body, checkin }: AnalysisContext): Promise<Chunk[]> {
    const prompt = buildPrompt(body, checkin);
    const raw = await callClaude(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Claude did not return a JSON array");
    return JSON.parse(match[0]) as Chunk[];
  }

  // ChunkingProvider compat
  chunk(body: string, checkin?: CheckInContext): Promise<Chunk[]> {
    return this.analyze({ body, checkin });
  }
}

import { Chunk, CheckInContext, ChunkingProvider } from "../chunker.ts";

export class ClaudeChunkingProvider implements ChunkingProvider {
  readonly model = "claude-haiku-4-5-20251001";
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  }

  async chunk(body: string, checkin?: CheckInContext): Promise<Chunk[]> {
    const checkinBlock = checkin
      ? `Context from their check-in before writing:
- Activation level: ${checkin.activation_level}/10
- Triggers they identified: ${checkin.triggers.join(", ") || "none"}
- Thoughts running: ${checkin.thoughts.join(", ") || "none"}
- Urges they felt: ${checkin.urges.join(", ") || "none"}

`
      : "";

    const prompt = `You are analyzing a personal journal entry written by someone working on anxious attachment patterns.

Segment this entry into emotionally coherent chunks. Each chunk is a distinct beat — a moment where the emotional state, perspective, or self-awareness meaningfully shifts.

${checkinBlock}Journal entry:
${body}

Return a JSON array only. Each element:
{
  "text": "<exact text — do not paraphrase>",
  "emotional_tone": "<single word: e.g. anxious, settled, avoidant, curious, overwhelmed>",
  "themes": ["<1-3 themes: e.g. abandonment fear, waiting, physical sensation, reassurance seeking>"],
  "arc_position": "<onset | escalation | peak | de-escalation | resolution | reflection>",
  "people": ["<name or role of each person mentioned in this chunk: e.g. Mary, mom, my therapist, John — use the exact name/term as written>"]
}

Rules:
- Each chunk: 1-5 sentences
- Start a new chunk when emotional tone or perspective meaningfully shifts
- Preserve exact text — never summarize or rephrase
- If the entry is under 3 sentences, return it as a single chunk
- Return only the JSON array, no other text`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.content[0].text.trim();

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Claude did not return a JSON array");

    return JSON.parse(jsonMatch[0]) as Chunk[];
  }
}

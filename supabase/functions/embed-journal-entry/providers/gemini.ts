import { Chunk, CheckInContext, ChunkingProvider } from "../chunker.ts";

export class GeminiChunkingProvider implements ChunkingProvider {
  readonly model = "gemini-2.5-flash-lite";
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
    if (!this.apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  }

  private async callWithRetry(url: string, init: RequestInit, attempt = 1): Promise<Response> {
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < 5) {
      const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s, 32s
      console.warn(`Gemini 429 — retrying in ${delay / 1000}s (attempt ${attempt}/4)`);
      await new Promise((r) => setTimeout(r, delay));
      return this.callWithRetry(url, init, attempt + 1);
    }
    return res;
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
  "arc_position": "<onset | escalation | peak | de-escalation | resolution | reflection>"
}

Rules:
- Each chunk: 1-5 sentences
- Start a new chunk when emotional tone or perspective meaningfully shifts
- Preserve exact text — never summarize or rephrase
- If the entry is under 3 sentences, return it as a single chunk
- Return only the JSON array, no other text`;

    const response = await this.callWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text.trim();

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Gemini did not return a JSON array");

    return JSON.parse(jsonMatch[0]) as Chunk[];
  }
}

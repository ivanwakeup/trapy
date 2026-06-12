import { EmbeddingProvider } from "../embedder.ts";

export class GoogleEmbeddingProvider implements EmbeddingProvider {
  readonly model = "gemini-embedding-001";
  readonly dimensions = 768;
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
    if (!this.apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  }

  private async callWithRetry(url: string, init: RequestInit, attempt = 1): Promise<Response> {
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < 4) {
      const body = await res.clone().text();
      if (body.includes("quota") || body.includes("RESOURCE_EXHAUSTED")) {
        console.error("Gemini daily quota exhausted. Resets at midnight Pacific.");
        return res;
      }
      const delay = Math.pow(2, attempt) * 3000;
      console.warn(`Embedding RPM throttle — retrying in ${delay / 1000}s (attempt ${attempt}/3)`);
      await new Promise((r) => setTimeout(r, delay));
      return this.callWithRetry(url, init, attempt + 1);
    }
    return res;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.callWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
          outputDimensionality: this.dimensions,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google embedding API error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.embedding.values as number[];
  }
}

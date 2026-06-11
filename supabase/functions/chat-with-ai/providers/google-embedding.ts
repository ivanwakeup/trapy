export class GoogleEmbeddingProvider {
  readonly model = "gemini-embedding-001";
  readonly dimensions = 768;
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
    if (!this.apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(
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
      throw new Error(`Google embedding error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.embedding.values as number[];
  }
}

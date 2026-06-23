import { EmbeddingProvider } from "../embedder.ts";

export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly model = "voyage-3";
  readonly dimensions = 1024;
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("VOYAGE_API_KEY") ?? "";
    if (!this.apiKey) throw new Error("VOYAGE_API_KEY is not set");
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: [text],
      }),
    });

    if (!response.ok) {
      throw new Error(`Voyage embedding error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding as number[];
  }
}

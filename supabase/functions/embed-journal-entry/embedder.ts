import { GoogleEmbeddingProvider } from "./providers/google.ts";

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = Deno.env.get("EMBEDDING_PROVIDER") ?? "google";
  switch (provider) {
    case "google": return new GoogleEmbeddingProvider();
    // case "openai": return new OpenAIEmbeddingProvider();  — add when OPENAI_API_KEY is available
    // case "voyage": return new VoyageEmbeddingProvider();  — add when VOYAGE_API_KEY is available
    default: throw new Error(`Unknown EMBEDDING_PROVIDER: ${provider}`);
  }
}

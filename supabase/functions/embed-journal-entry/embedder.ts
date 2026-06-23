import { VoyageEmbeddingProvider } from "./providers/voyage.ts";

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = Deno.env.get("EMBEDDING_PROVIDER") ?? "voyage";
  switch (provider) {
    case "voyage": return new VoyageEmbeddingProvider();
    default: throw new Error(`Unknown EMBEDDING_PROVIDER: ${provider}`);
  }
}

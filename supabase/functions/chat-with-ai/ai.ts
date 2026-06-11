import { GeminiAIProvider } from "./providers/gemini.ts";

export interface AIProvider {
  readonly model: string;
  chat(
    messages: { role: "user" | "assistant"; content: string }[],
    systemPrompt: string
  ): Promise<string>;
}

export function getAIProvider(): AIProvider {
  const provider = Deno.env.get("AI_PROVIDER") ?? "gemini";
  switch (provider) {
    case "gemini": return new GeminiAIProvider();
    // case "claude": return new ClaudeAIProvider();
    default: throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
}

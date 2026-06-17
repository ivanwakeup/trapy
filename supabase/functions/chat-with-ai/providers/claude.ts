import { AIProvider } from "../ai.ts";

export class ClaudeAIProvider implements AIProvider {
  readonly model = "claude-haiku-4-5-20251001";
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  }

  async chat(
    messages: { role: "user" | "assistant"; content: string }[],
    systemPrompt: string
  ): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude chat error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.content[0].text as string;
  }
}

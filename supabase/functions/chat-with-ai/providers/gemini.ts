import { AIProvider } from "../ai.ts";

export class GeminiAIProvider implements AIProvider {
  readonly model = "gemini-2.5-flash-lite";
  private apiKey: string;

  constructor() {
    this.apiKey = Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
    if (!this.apiKey) throw new Error("GOOGLE_AI_API_KEY is not set");
  }

  async chat(
    messages: { role: "user" | "assistant"; content: string }[],
    systemPrompt: string
  ): Promise<string> {
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini chat error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text as string;
  }
}

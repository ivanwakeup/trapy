import { template as compassionateTemplate } from "./personas/compassionate.ts";
import { template as directTemplate } from "./personas/direct.ts";
import { template as socraticTemplate } from "./personas/socratic.ts";

interface JournalChunk {
  id: string;
  text: string;
  emotional_tone: string;
  arc_position: string;
  entry_date?: string;
  full_body?: string;
}

export interface Persona {
  readonly name: string;
  buildSystemPrompt(chunks: JournalChunk[]): string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatChunks(chunks: JournalChunk[]): string {
  if (chunks.length === 0) return "No relevant journal history found yet.";
  return chunks
    .map((c) => {
      const date = c.entry_date ? ` — written ${formatDate(c.entry_date)}` : "";
      const content = c.full_body ?? c.text;
      return `[${c.emotional_tone} — ${c.arc_position}${date}]:\n"${content}"`;
    })
    .join("\n\n");
}

function fromTemplate(template: string, chunks: JournalChunk[]): string {
  return template.replace("{{journal_context}}", formatChunks(chunks));
}

const personas: Record<string, Persona> = {
  compassionate: {
    name: "compassionate",
    buildSystemPrompt: (chunks) => fromTemplate(compassionateTemplate, chunks),
  },
  direct: {
    name: "direct",
    buildSystemPrompt: (chunks) => fromTemplate(directTemplate, chunks),
  },
  socratic: {
    name: "socratic",
    buildSystemPrompt: (chunks) => fromTemplate(socraticTemplate, chunks),
  },
};

export function getPersona(name?: string): Persona {
  const resolved = name ?? Deno.env.get("AI_PERSONA") ?? "compassionate";
  const persona = personas[resolved];
  if (!persona) throw new Error(`Unknown persona: ${resolved}. Available: ${Object.keys(personas).join(", ")}`);
  return persona;
}

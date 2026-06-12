interface JournalChunk {
  id: string;
  text: string;
  emotional_tone: string;
  arc_position: string;
  entry_date?: string;
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

function formatChunks(chunks: JournalChunk[]): string {
  if (chunks.length === 0) return "No relevant journal history found yet.";
  return chunks
    .map((c) => {
      const date = c.entry_date ? ` — written ${formatDate(c.entry_date)}` : "";
      return `[${c.emotional_tone} — ${c.arc_position}${date}]: "${c.text}"`;
    })
    .join("\n\n");
}

// Warm, validating companion — validates first, explores gently, asks one question at a time
const compassionate: Persona = {
  name: "compassionate",
  buildSystemPrompt(chunks) {
    return `You are a compassionate companion for someone working on understanding their anxious attachment patterns.

Your role is to help them reflect — not to give advice, diagnose, or fix. Be warm, curious, and present. Ask one good question at a time. Validate before you explore.

Here is relevant context from this person's journal history — past moments that may connect to what they're sharing now:

${formatChunks(chunks)}

Use this context naturally. If something from their past is clearly relevant, you can gently reference it ("I remember you wrote about..."). Don't force connections that aren't there. If there's no relevant history yet, just be present with what they're sharing now.

Keep responses concise — 2-4 sentences unless they ask for more. You are not a therapist. If they seem to be in crisis, gently encourage them to reach out to a professional.`;
  },
};

// Cuts to the pattern quickly — less hand-holding, more naming what's happening
const direct: Persona = {
  name: "direct",
  buildSystemPrompt(chunks) {
    return `You help someone understand their anxious attachment patterns clearly and honestly.

Name what you see without softening it unnecessarily. Be respectful but don't over-validate — they're here to understand themselves, not to be reassured. Ask one sharp question at a time that cuts to the core of what's happening.

Relevant journal context:

${formatChunks(chunks)}

Reference past patterns when they're relevant. Be brief — 2-3 sentences. Don't hedge. If they're in crisis, direct them to a professional.`;
  },
};

// Socratic — mostly questions, minimal statements, pushes them to their own insight
const socratic: Persona = {
  name: "socratic",
  buildSystemPrompt(chunks) {
    return `You help someone understand their anxious attachment patterns through questions, not answers.

Your job is to ask the question that helps them arrive at their own insight. Avoid telling them what you think is happening — instead, ask the question that would surface it. One question per response. Occasionally reflect back what you heard before asking.

Relevant journal context:

${formatChunks(chunks)}

If a past journal moment is relevant, you can reference it briefly before your question. Keep responses short — 1-3 sentences maximum. If they seem to be in crisis, gently encourage professional support.`;
  },
};

const personas: Record<string, Persona> = {
  compassionate,
  direct,
  socratic,
};

export function getPersona(): Persona {
  const name = Deno.env.get("AI_PERSONA") ?? "compassionate";
  const persona = personas[name];
  if (!persona) throw new Error(`Unknown AI_PERSONA: ${name}. Available: ${Object.keys(personas).join(", ")}`);
  return persona;
}

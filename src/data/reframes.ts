import { CheckInEntry } from "../types";
import { THOUGHTS } from "./tags";

const THOUGHT_REFRAMES: Record<string, string> = {
  "They're losing interest":
    "Is it possible they're just distracted or going through something of their own right now?",
  "I did something wrong":
    "What would you need to see to actually know that — rather than just feel it?",
  "I'm too much":
    "Is 'too much' a fact, or a fear? What's the difference here?",
  "They found someone better":
    "What evidence do you actually have for that, versus what your brain filled in?",
  "I'm going to be abandoned":
    "That fear makes sense given what you've been through. Is there anything in this specific situation that makes it different from past ones?",
  "I'm not good enough":
    "Not good enough by whose measure? Is that voice yours, or did you inherit it?",
  "They're angry at me":
    "Is it possible they're feeling something that has nothing to do with you?",
  "I'm overreacting":
    "You're not overreacting — you're activated. Those aren't the same thing. What does the situation actually call for?",
  "This is going to end":
    "Can you sit with not knowing how this ends, just for right now?",
  "They don't actually care":
    "What's one thing they've done that doesn't fit that story?",
  "I pushed them away":
    "What did you actually do, versus what you're afraid you did?",
  "They were never really into me":
    "What would you need to see to feel more certain either way — and is that information available right now?",
};

const FALLBACKS: Record<"low" | "mid" | "high", string> = {
  low: "Is there a version of this where nothing is wrong yet?",
  mid: "What's the most boring, undramatic explanation for what's happening?",
  high: "That sounds really hard. When you're ready — is there one small thing that doesn't quite fit the story your brain is telling?",
};

function activationBand(level: number): "low" | "mid" | "high" {
  if (level <= 4) return "low";
  if (level <= 7) return "mid";
  return "high";
}

function validationPrefix(level: number): string {
  if (level >= 8) return "That sounds really intense. When you're ready — ";
  return "";
}

export function selectReframe(entry: CheckInEntry): string {
  const prefix = validationPrefix(entry.activationLevel);

  // Priority 1: thought tags, in the order they appear in THOUGHTS
  for (const thought of THOUGHTS) {
    if (entry.thoughts.includes(thought) && THOUGHT_REFRAMES[thought]) {
      return prefix + THOUGHT_REFRAMES[thought];
    }
  }

  // Priority 2: fallback by activation band
  return FALLBACKS[activationBand(entry.activationLevel)];
}

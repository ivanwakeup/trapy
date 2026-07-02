const PALETTE: Array<{ keywords: string[]; color: string; label: string }> = [
  { keywords: ["anxious", "anxiety", "panic", "scared", "fear", "worried", "nervous", "dread", "apprehensive"], color: "#E07C5A", label: "Anxious" },
  { keywords: ["overwhelmed", "flooded", "consumed", "drowning", "frantic", "spiraling"], color: "#C45C7A", label: "Overwhelmed" },
  { keywords: ["sad", "grief", "heartbroken", "devastated", "tearful", "sorrow", "mournful", "despair"], color: "#5A7EC4", label: "Sad" },
  { keywords: ["avoidant", "avoidance", "numb", "dissociated", "disconnected", "withdrawn", "detached", "shutdown", "shut down"], color: "#7A8A85", label: "Avoidant" },
  { keywords: ["angry", "anger", "furious", "frustrated", "frustration", "resentful", "resentment", "bitter", "irritated", "rage"], color: "#C47A5A", label: "Angry" },
  { keywords: ["confused", "uncertain", "unsure", "unclear", "conflicted", "ambivalent", "lost"], color: "#C4A85A", label: "Uncertain" },
  { keywords: ["curious", "questioning", "wondering", "exploring", "interested", "inquisitive", "reflective"], color: "#5ABCC4", label: "Curious" },
  { keywords: ["hopeful", "hope", "optimistic", "encouraged", "anticipating", "excited"], color: "#7EC47A", label: "Hopeful" },
  { keywords: ["settled", "calm", "peaceful", "grounded", "stable", "content", "ease", "serene", "relaxed", "present", "centered"], color: "#7EB5A6", label: "Settled" },
  { keywords: ["determined", "motivated", "empowered", "strong", "capable", "resolute", "committed", "clear"], color: "#5A9EC4", label: "Determined" },
  { keywords: ["ashamed", "shame", "guilty", "guilt", "embarrassed", "humiliated", "unworthy", "inadequate"], color: "#A05AC4", label: "Shame" },
  { keywords: ["lonely", "alone", "isolated", "abandoned", "forgotten", "unseen", "invisible"], color: "#4A6C8A", label: "Lonely" },
];

const FALLBACK_COLORS = ["#6A7A75", "#5A6A65", "#7A7060", "#607A70", "#6A6080"];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function toneToColor(tone: string | null | undefined): string {
  if (!tone) return "#567872";
  const lower = tone.toLowerCase().trim();
  for (const entry of PALETTE) {
    if (entry.keywords.some((k) => lower.includes(k) || k.includes(lower))) {
      return entry.color;
    }
  }
  return FALLBACK_COLORS[hashString(lower) % FALLBACK_COLORS.length];
}

export function toneToLabel(tone: string | null | undefined): string {
  if (!tone) return "Unknown";
  const lower = tone.toLowerCase().trim();
  for (const entry of PALETTE) {
    if (entry.keywords.some((k) => lower.includes(k) || k.includes(lower))) {
      return entry.label;
    }
  }
  return tone.charAt(0).toUpperCase() + tone.slice(1);
}

export { PALETTE };

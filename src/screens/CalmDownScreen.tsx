import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { Colors, Fonts, Shadow } from "../theme";

type Phase = "breathing" | "grounding";

const BREATH_PHASES = [
  { label: "Breathe in", toValue: 1.0, duration: 4000 },
  { label: "Hold", toValue: null, duration: 4000 },
  { label: "Breathe out", toValue: 0.55, duration: 4000 },
  { label: "Hold", toValue: null, duration: 4000 },
] as const;

const GROUNDING_PROMPTS = [
  { count: "5", sense: "see", instruction: "Name 5 things you can see." },
  { count: "4", sense: "hear", instruction: "Name 4 things you can hear." },
  { count: "3", sense: "touch", instruction: "Name 3 things you can touch or feel." },
  { count: "2", sense: "smell", instruction: "Name 2 things you can smell." },
  { count: "1", sense: "taste", instruction: "Name 1 thing you can taste." },
];

interface Props {
  onDone: () => void;
}

function BreathingPhase({ onReady }: { onReady: () => void }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycles, setCycles] = useState(0);
  const breathScale = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const phase = BREATH_PHASES[phaseIndex];
    let animRef: Animated.CompositeAnimation | null = null;

    if (phase.toValue !== null) {
      animRef = Animated.timing(breathScale, {
        toValue: phase.toValue,
        duration: phase.duration,
        useNativeDriver: true,
      });
      animRef.start();
    }

    const timer = setTimeout(() => {
      const next = (phaseIndex + 1) % BREATH_PHASES.length;
      if (next === 0) setCycles((c) => c + 1);
      setPhaseIndex(next);
    }, phase.duration);

    return () => {
      clearTimeout(timer);
      animRef?.stop();
    };
  }, [phaseIndex]);

  return (
    <View style={styles.inner}>
      <Text style={styles.phaseTitle}>Let's slow things down.</Text>
      <Text style={styles.phaseSubtitle}>Breathe with the box. Each side is 4 counts.</Text>

      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.circle,
            { transform: [{ scale: breathScale }] },
          ]}
        />
        <Text style={styles.breathLabel}>{BREATH_PHASES[phaseIndex].label}</Text>
      </View>

      {cycles >= 3 && (
        <Pressable style={styles.primaryButton} onPress={onReady}>
          <Text style={styles.primaryButtonText}>I feel a little more settled</Text>
        </Pressable>
      )}

      {cycles < 3 && (
        <Text style={styles.cycleHint}>
          {cycles === 0
            ? "Breathe through a few cycles..."
            : `${3 - cycles} more ${3 - cycles === 1 ? "cycle" : "cycles"} to go`}
        </Text>
      )}
    </View>
  );
}

function GroundingPhase({ onDone }: { onDone: () => void }) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const prompt = GROUNDING_PROMPTS[promptIndex];

  function advance() {
    if (promptIndex < GROUNDING_PROMPTS.length - 1) {
      setPromptIndex((i) => i + 1);
    } else {
      setFinished(true);
    }
  }

  if (finished) {
    return (
      <View style={styles.inner}>
        <Text style={styles.groundingFinished}>Good. You're here.</Text>
        <Pressable style={styles.primaryButton} onPress={onDone}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.inner}>
      <Text style={styles.phaseTitle}>Let's ground you here.</Text>
      <View style={styles.groundingCard}>
        <Text style={styles.groundingCount}>{prompt.count}</Text>
        <Text style={styles.groundingInstruction}>{prompt.instruction}</Text>
        <Text style={styles.groundingHint}>
          Take your time. No need to say them out loud.
        </Text>
      </View>
      <View style={styles.groundingDots}>
        {GROUNDING_PROMPTS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === promptIndex && styles.dotActive]}
          />
        ))}
      </View>
      <Pressable style={styles.primaryButton} onPress={advance}>
        <Text style={styles.primaryButtonText}>
          {promptIndex < GROUNDING_PROMPTS.length - 1 ? "Next" : "Done"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function CalmDownScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("breathing");

  return (
    <View style={styles.container}>
      {phase === "breathing" && (
        <BreathingPhase onReady={() => setPhase("grounding")} />
      )}
      {phase === "grounding" && (
        <GroundingPhase onDone={onDone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 32,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  phaseTitle: {
    fontSize: 26,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  phaseSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.sansLight,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 52,
    lineHeight: 22,
  },
  circleContainer: {
    alignItems: "center",
    marginBottom: 56,
  },
  circle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginBottom: 24,
  },
  breathLabel: {
    fontSize: 18,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  cycleHint: {
    fontSize: 14,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    textAlign: "center",
  },
  groundingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
    marginBottom: 28,
    ...Shadow.card,
  },
  groundingCount: {
    fontSize: 56,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    lineHeight: 64,
    marginBottom: 8,
  },
  groundingInstruction: {
    fontSize: 20,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 12,
  },
  groundingHint: {
    fontSize: 13,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    textAlign: "center",
  },
  groundingDots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 36,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  groundingFinished: {
    fontSize: 32,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 48,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: "center",
    width: "100%",
  },
  primaryButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    letterSpacing: 0.3,
  },
});

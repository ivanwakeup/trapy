import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckInEntry } from "../types";
import { selectReframe } from "../data/reframes";
import { Colors, Fonts } from "../theme";

type Step = "openness" | "reframe" | "grounding";

interface Props {
  entry: CheckInEntry;
  onDone: () => void;
}

export default function ReframeScreen({ entry, onDone }: Props) {
  const [step, setStep] = useState<Step>("openness");
  const reframe = selectReframe(entry);

  async function handleOpenToReframe() {
    setStep("reframe");
    await saveReflection({ openToReframe: true, reframeOffered: reframe });
  }

  async function handleNotNow() {
    setStep("grounding");
    await saveReflection({ openToReframe: false });
  }

  async function saveReflection(reflection: CheckInEntry["reflection"]) {
    try {
      const raw = await AsyncStorage.getItem("checkins");
      const entries: CheckInEntry[] = raw ? JSON.parse(raw) : [];
      const idx = entries.findIndex((e) => e.id === entry.id);
      if (idx !== -1) {
        entries[idx] = { ...entries[idx], reflection };
        await AsyncStorage.setItem("checkins", JSON.stringify(entries));
      }
    } catch {
      // non-critical
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.savedBadge}>Saved ✓</Text>

      {step === "openness" && (
        <View style={styles.inner}>
          <Text style={styles.context}>
            You're at a{" "}
            <Text style={styles.activationNumber}>{entry.activationLevel}</Text>
            {" "}right now.
          </Text>
          <Text style={styles.question}>
            Would it feel ok to consider another possibility?
          </Text>
          <View style={styles.buttonRow}>
            <Pressable style={styles.choiceButton} onPress={handleOpenToReframe}>
              <Text style={styles.choiceButtonText}>Yes, I'm open</Text>
            </Pressable>
            <Pressable style={styles.choiceButton} onPress={handleNotNow}>
              <Text style={styles.choiceButtonText}>Not right now</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === "reframe" && (
        <View style={styles.inner}>
          <Text style={styles.reframeText}>{reframe}</Text>
          <Pressable style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      )}

      {step === "grounding" && (
        <View style={styles.inner}>
          <Text style={styles.reframeText}>
            That's ok. You don't have to figure it out right now.
          </Text>
          <Pressable style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 36,
  },
  savedBadge: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
  },
  context: {
    fontSize: 16,
    fontFamily: Fonts.sansLight,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 28,
  },
  activationNumber: {
    fontFamily: Fonts.sansSemiBold,
    color: Colors.primary,
  },
  question: {
    fontSize: 28,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 40,
    marginBottom: 52,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  choiceButtonText: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  reframeText: {
    fontSize: 24,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 56,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
  },
  doneButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    letterSpacing: 0.3,
  },
});

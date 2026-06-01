import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CheckInEntry } from "../types";
import { selectReframe } from "../data/reframes";

type Step = "openness" | "reframe" | "grounding";

interface Props {
  entry: CheckInEntry;
  onDone: () => void;
}

export default function ReflectionScreen({ entry, onDone }: Props) {
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
      // non-critical — reflection just won't be saved
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.savedBadge}>Saved ✓</Text>

      {step === "openness" && (
        <>
          <Text style={styles.context}>
            You're at a{" "}
            <Text style={styles.activationNumber}>{entry.activationLevel}</Text>{" "}
            right now.
          </Text>
          <Text style={styles.question}>
            Would it feel ok to consider another possibility?
          </Text>
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.choiceButton, styles.choiceButtonBorder]}
              onPress={handleOpenToReframe}
            >
              <Text style={styles.choiceButtonText}>Yes, I'm open</Text>
            </Pressable>
            <Pressable
              style={[styles.choiceButton, styles.choiceButtonBorder]}
              onPress={handleNotNow}
            >
              <Text style={styles.choiceButtonText}>Not right now</Text>
            </Pressable>
          </View>
        </>
      )}

      {step === "reframe" && (
        <>
          <Text style={styles.reframeText}>{reframe}</Text>
          <Pressable style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </>
      )}

      {step === "grounding" && (
        <>
          <Text style={styles.reframeText}>
            That's ok. You don't have to figure it out right now.
          </Text>
          <Pressable style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF9F7",
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  savedBadge: {
    position: "absolute",
    top: 24,
    alignSelf: "center",
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  context: {
    fontSize: 17,
    color: "#6B7280",
    marginBottom: 24,
    textAlign: "center",
  },
  activationNumber: {
    fontSize: 17,
    fontWeight: "700",
    color: "#7C3AED",
  },
  question: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 40,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  choiceButtonBorder: {
    borderWidth: 1.5,
    borderColor: "#D1C4E9",
  },
  choiceButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  reframeText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#1F2937",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 48,
  },
  doneButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

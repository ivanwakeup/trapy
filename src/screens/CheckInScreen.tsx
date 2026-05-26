import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import Slider from "@react-native-community/slider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TagSelector from "../components/TagSelector";
import { TRIGGERS, THOUGHTS, URGES, ACTIVATION_LABELS } from "../data/tags";

interface CheckInEntry {
  id: string;
  timestamp: string;
  activationLevel: number;
  triggers: string[];
  thoughts: string[];
  urges: string[];
}

export default function CheckInScreen() {
  const [activation, setActivation] = useState(5);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [urges, setUrges] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function toggleTag(
    list: string[],
    setList: (v: string[]) => void,
    tag: string
  ) {
    setList(
      list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]
    );
  }

  async function handleSave() {
    const entry: CheckInEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      activationLevel: activation,
      triggers,
      thoughts,
      urges,
    };

    try {
      const existing = await AsyncStorage.getItem("checkins");
      const entries: CheckInEntry[] = existing ? JSON.parse(existing) : [];
      entries.unshift(entry);
      await AsyncStorage.setItem("checkins", JSON.stringify(entries));
      setSaved(true);
    } catch {
      Alert.alert("Error", "Could not save your check-in. Please try again.");
    }
  }

  function handleReset() {
    setActivation(5);
    setTriggers([]);
    setThoughts([]);
    setUrges([]);
    setSaved(false);
  }

  if (saved) {
    return (
      <View style={styles.confirmedContainer}>
        <Text style={styles.confirmedEmoji}>✓</Text>
        <Text style={styles.confirmedTitle}>Check-in saved</Text>
        <Text style={styles.confirmedSubtitle}>
          You noticed what was happening. That's the work.
        </Text>
        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>New check-in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Check In</Text>
      <Text style={styles.subtitle}>
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>

      {/* Activation level */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>How activated are you right now?</Text>
        <View style={styles.activationRow}>
          <Text style={styles.activationNumber}>{activation}</Text>
          <Text style={styles.activationLabel}>
            {ACTIVATION_LABELS[activation]}
          </Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={activation}
          onValueChange={(v) => setActivation(v)}
          minimumTrackTintColor="#7C3AED"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#7C3AED"
        />
        <View style={styles.sliderEnds}>
          <Text style={styles.sliderEnd}>1</Text>
          <Text style={styles.sliderEnd}>10</Text>
        </View>
      </View>

      {/* Triggers */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What triggered it?</Text>
        <Text style={styles.sectionHint}>Select all that apply</Text>
        <TagSelector
          tags={TRIGGERS}
          selected={triggers}
          onToggle={(tag) => toggleTag(triggers, setTriggers, tag)}
        />
      </View>

      {/* Thoughts */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What's the story your brain is running?</Text>
        <Text style={styles.sectionHint}>Select all that apply</Text>
        <TagSelector
          tags={THOUGHTS}
          selected={thoughts}
          onToggle={(tag) => toggleTag(thoughts, setThoughts, tag)}
        />
      </View>

      {/* Urges */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>What's your urge right now?</Text>
        <Text style={styles.sectionHint}>Select all that apply</Text>
        <TagSelector
          tags={URGES}
          selected={urges}
          onToggle={(tag) => toggleTag(urges, setUrges, tag)}
        />
      </View>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save check-in</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#FAF9F7",
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    marginTop: 4,
    marginBottom: 36,
  },
  section: {
    marginBottom: 36,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 14,
  },
  activationRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 8,
  },
  activationNumber: {
    fontSize: 48,
    fontWeight: "700",
    color: "#7C3AED",
    lineHeight: 56,
  },
  activationLabel: {
    fontSize: 18,
    color: "#6B7280",
    fontWeight: "500",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderEnds: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },
  sliderEnd: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  saveButton: {
    backgroundColor: "#7C3AED",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmedContainer: {
    flex: 1,
    backgroundColor: "#FAF9F7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  confirmedEmoji: {
    fontSize: 48,
    color: "#7C3AED",
    marginBottom: 16,
  },
  confirmedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  confirmedSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  resetButton: {
    borderWidth: 1.5,
    borderColor: "#7C3AED",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  resetButtonText: {
    color: "#7C3AED",
    fontSize: 15,
    fontWeight: "600",
  },
});

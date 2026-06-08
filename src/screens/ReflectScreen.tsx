import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import TagSelector from "../components/TagSelector";
import { TRIGGERS, THOUGHTS, URGES } from "../data/tags";
import { CheckInEntry } from "../types";
import { Colors, Fonts, Shadow } from "../theme";

interface Props {
  activationLevel: number;
  showReframeAfter: boolean;
  onSaved: (entry: CheckInEntry) => void;
}

export default function ReflectScreen({ activationLevel, showReframeAfter, onSaved }: Props) {
  const { user } = useAuth();
  const [triggers, setTriggers] = useState<string[]>([]);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [urges, setUrges] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);

    const { data, error } = await supabase
      .from("checkins")
      .insert({
        user_id: user!.id,
        activation_level: activationLevel,
        triggers,
        thoughts,
        urges,
      })
      .select()
      .single();

    setSaving(false);

    if (error || !data) {
      Alert.alert("Error", "Could not save. Please try again.");
      return;
    }

    const entry: CheckInEntry = {
      id: data.id,
      timestamp: data.created_at,
      activationLevel: data.activation_level,
      triggers: data.triggers,
      thoughts: data.thoughts,
      urges: data.urges,
    };
    onSaved(entry);
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingBlock}>
        <Text style={styles.title}>Reflect</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>What triggered it?</Text>
        <Text style={styles.cardHint}>Select all that apply</Text>
        <TagSelector
          tags={TRIGGERS}
          selected={triggers}
          onToggle={(tag) => toggleTag(triggers, setTriggers, tag)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>What's the story your brain is running?</Text>
        <Text style={styles.cardHint}>Select all that apply</Text>
        <TagSelector
          tags={THOUGHTS}
          selected={thoughts}
          onToggle={(tag) => toggleTag(thoughts, setThoughts, tag)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>What's your urge right now?</Text>
        <Text style={styles.cardHint}>Select all that apply</Text>
        <TagSelector
          tags={URGES}
          selected={urges}
          onToggle={(tag) => toggleTag(urges, setUrges, tag)}
        />
      </View>

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color={Colors.surface} />
          : <Text style={styles.saveButtonText}>
              {showReframeAfter ? "Save and continue" : "Save"}
            </Text>
        }
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 14,
  },
  headingBlock: {
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    ...Shadow.card,
  },
  cardLabel: {
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 13,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    letterSpacing: 0.3,
  },
});

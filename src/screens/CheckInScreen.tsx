import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import Slider from "@react-native-community/slider";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Colors, Fonts } from "../theme";
import { ACTIVATION_LABELS, TRIGGERS, THOUGHTS, URGES } from "../data/tags";
import { Relationship } from "../data/relationships";
import TagSelector from "../components/TagSelector";

interface Props {
  date: Date;
  onSaved: () => void;
  onBack: () => void;
}

export default function CheckInScreen({ date, onSaved, onBack }: Props) {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [activation, setActivation] = useState(5);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [urges, setUrges] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pendingTranscript = useRef("");

  useEffect(() => {
    supabase
      .from("relationships")
      .select("id, name, relationship_type, notes, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        const rels = data ?? [];
        setRelationships(rels);
        // Auto-select the first relationship if only one exists
        if (rels.length === 1) setSelectedRelationshipId(rels[0].id);
      });
  }, [user]);

  function toggleTag(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  useEffect(() => {
    if (listening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [listening]);

  useSpeechRecognitionEvent("start", () => setListening(true));
  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    if (pendingTranscript.current) {
      setBody((prev) => {
        const join = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
        return prev + join + pendingTranscript.current;
      });
      pendingTranscript.current = "";
    }
  });
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript ?? "";
    if (event.isFinal) {
      setBody((prev) => {
        const join = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
        return prev + join + transcript;
      });
      pendingTranscript.current = "";
    } else {
      pendingTranscript.current = transcript;
    }
  });

  async function toggleDictation() {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
    } else {
      inputRef.current?.blur();
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: true });
    }
  }

  async function handleSave() {
    setSaving(true);

    const { data: checkin, error } = await supabase
      .from("checkins")
      .insert({
        user_id: user!.id,
        activation_level: activation,
        triggers,
        thoughts,
        urges,
        relationship_id: selectedRelationshipId ?? null,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      return;
    }

    if (body.trim()) {
      await supabase.from("journal_entries").insert({
        user_id: user!.id,
        body: body.trim(),
        checkin_id: checkin.id,
      });
    }

    setSaving(false);
    onSaved();
  }

  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backLink}>Cancel</Text>
        </Pressable>
        <Text style={styles.topBarDate}>{dateLabel}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Relationship picker */}
        {relationships.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Who is this about?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relationshipRow}
            >
              {relationships.map((rel) => (
                <Pressable
                  key={rel.id}
                  onPress={() =>
                    setSelectedRelationshipId(
                      selectedRelationshipId === rel.id ? null : rel.id
                    )
                  }
                  style={({ pressed, hovered }: any) => [
                    styles.relPill,
                    selectedRelationshipId === rel.id && styles.relPillSelected,
                    hovered && selectedRelationshipId !== rel.id && styles.relPillHovered,
                    pressed && styles.relPillPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.relPillText,
                      selectedRelationshipId === rel.id && styles.relPillTextSelected,
                    ]}
                  >
                    {rel.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {relationships.length > 0 && <View style={styles.divider} />}

        {/* Activation */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How activated are you?</Text>
          <View style={styles.activationRow}>
            <Text style={styles.activationNumber}>{activation}</Text>
            <Text style={styles.activationDesc}>{ACTIVATION_LABELS[activation]}</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={activation}
            onValueChange={setActivation}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbTintColor={Colors.primary}
          />
          <View style={styles.sliderEnds}>
            <Text style={styles.sliderEnd}>calm</Text>
            <Text style={styles.sliderEnd}>flooded</Text>
          </View>
        </View>

        <View style={styles.divider} />

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

        <View style={styles.divider} />

        {/* Thoughts */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What's your mind telling you?</Text>
          <Text style={styles.sectionHint}>Select all that apply</Text>
          <TagSelector
            tags={THOUGHTS}
            selected={thoughts}
            onToggle={(tag) => toggleTag(thoughts, setThoughts, tag)}
          />
        </View>

        <View style={styles.divider} />

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

        <View style={styles.divider} />

        {/* Journal */}
        <View style={styles.section}>
          <View style={styles.journalHeader}>
            <View>
              <Text style={styles.sectionLabel}>Write it out</Text>
              <Text style={styles.sectionHint}>Optional — just for you</Text>
            </View>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Pressable
                style={[styles.micButton, listening && styles.micButtonActive]}
                onPress={toggleDictation}
              >
                <Text style={styles.micIcon}>{listening ? "⏹" : "🎙️"}</Text>
              </Pressable>
            </Animated.View>
          </View>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={body}
            onChangeText={setBody}
            placeholder="What's going on? What are you feeling?"
            placeholderTextColor={Colors.textMuted}
            multiline
            textAlignVertical="top"
            autoCorrect
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={Colors.surface} />
            : <Text style={styles.saveButtonText}>Save check-in</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backLink: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  topBarDate: {
    fontSize: 14,
    fontFamily: Fonts.sansMedium,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  topBarSpacer: {
    width: 48,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 0,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  activationRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  activationNumber: {
    fontSize: 52,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    lineHeight: 60,
  },
  activationDesc: {
    fontSize: 17,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderEnds: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -6,
  },
  sliderEnd: {
    fontSize: 12,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
  },
  relationshipRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 4,
    paddingBottom: 2,
  },
  relPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  relPillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  relPillHovered: {
    borderColor: Colors.textMuted,
  },
  relPillPressed: { opacity: 0.7 },
  relPillText: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  relPillTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.sansMedium,
  },
  journalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  micIcon: {
    fontSize: 20,
  },
  textInput: {
    fontSize: 16,
    fontFamily: Fonts.sansLight,
    color: Colors.textPrimary,
    lineHeight: 26,
    minHeight: 140,
    textAlignVertical: "top",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
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

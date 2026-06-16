import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Colors, Fonts } from "../theme";

interface Props {
  entryId?: string;
  checkinId?: string;
  onSaved: () => void;
  onBack: () => void;
}

export default function JournalEditorScreen({ entryId, checkinId, onSaved, onBack }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!entryId);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pendingTranscript = useRef("");

  // Pulse animation while listening
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
    // Commit any pending partial transcript on stop
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
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: true,
      });
    }
  }

  useEffect(() => {
    if (!entryId) return;
    supabase
      .from("journal_entries")
      .select("body")
      .eq("id", entryId)
      .single()
      .then(({ data }) => {
        if (data) setBody(data.body);
        setLoading(false);
      });
  }, [entryId]);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading]);

  async function handleSave() {
    if (!body.trim()) {
      onBack();
      return;
    }

    setSaving(true);

    if (entryId) {
      await supabase
        .from("journal_entries")
        .update({ body, updated_at: new Date().toISOString() })
        .eq("id", entryId);
    } else {
      await supabase
        .from("journal_entries")
        .insert({
          user_id: user!.id,
          body,
          checkin_id: checkinId ?? null,
        });
    }

    setSaving(false);
    onSaved();
  }

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.dateLabel}>{dateLabel}</Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={body}
          onChangeText={setBody}
          placeholder="What's going on?"
          placeholderTextColor={Colors.textMuted}
          multiline
          textAlignVertical="top"
          autoCorrect
        />
      </ScrollView>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={[styles.micButton, listening && styles.micButtonActive]}
            onPress={toggleDictation}
          >
            <Text style={styles.micIcon}>{listening ? "⏹" : "🎙️"}</Text>
          </Pressable>
        </Animated.View>

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={Colors.surface} />
            : <Text style={styles.saveButtonText}>Save</Text>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backLink: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.primaryDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.sansLight,
    color: Colors.textPrimary,
    lineHeight: 30,
    minHeight: 300,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
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
    fontSize: 22,
  },
  saveButton: {
    flex: 1,
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

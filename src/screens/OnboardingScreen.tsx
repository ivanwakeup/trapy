import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Colors, Fonts } from "../theme";
import { RELATIONSHIP_TYPES } from "../data/relationships";

interface Props {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) { setError("Give them a name."); return; }
    if (!type) { setError("Choose a relationship type."); return; }
    setError(null);
    setSaving(true);

    const { error: err } = await supabase.from("relationships").insert({
      user_id: user!.id,
      name: name.trim(),
      relationship_type: type,
    });

    setSaving(false);
    if (err) { setError(err.message); return; }
    onDone();
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Who matters to you?</Text>
          <Text style={styles.subtitle}>
            Add someone important in your life. You'll track how you feel in relation to them.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Their name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setError(null); }}
            placeholder="e.g. Mary, Mom, Alex"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />

          <Text style={[styles.fieldLabel, { marginTop: 24 }]}>Your relationship</Text>
          <View style={styles.typeGrid}>
            {RELATIONSHIP_TYPES.map((rt) => (
              <Pressable
                key={rt.value}
                onPress={() => { setType(rt.value); setError(null); }}
                style={({ pressed, hovered }: any) => [
                  styles.typePill,
                  type === rt.value && styles.typePillSelected,
                  hovered && type !== rt.value && styles.typePillHovered,
                  pressed && styles.typePillPressed,
                ]}
              >
                <Text
                  style={[
                    styles.typePillText,
                    type === rt.value && styles.typePillTextSelected,
                  ]}
                >
                  {rt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
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
            : <Text style={styles.saveButtonText}>Get started</Text>
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
  content: {
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 34,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.sansLight,
    color: Colors.textSecondary,
    lineHeight: 25,
  },
  form: {
    gap: 0,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 18,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typePillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  typePillHovered: {
    borderColor: Colors.textMuted,
  },
  typePillPressed: {
    opacity: 0.7,
  },
  typePillText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  typePillTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.sansMedium,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: "#C07888",
    marginTop: 16,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 48,
    paddingTop: 12,
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

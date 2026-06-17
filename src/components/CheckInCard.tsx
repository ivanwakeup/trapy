import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import Slider from "@react-native-community/slider";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Colors, Fonts } from "../theme";
import { ACTIVATION_LABELS, TRIGGERS, THOUGHTS, URGES } from "../data/tags";
import TagSelector from "./TagSelector";
import Card from "./Card";

interface Props {
  isToday?: boolean;
}

export default function CheckInCard({ isToday = true }: Props) {
  const { user } = useAuth();
  const [activation, setActivation] = useState(5);
  const [modalVisible, setModalVisible] = useState(false);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [urges, setUrges] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const checkScale = useRef(new Animated.Value(0)).current;

  function toggleTag(list: string[], setList: (v: string[]) => void, tag: string) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  function openModal() {
    setTriggers([]);
    setThoughts([]);
    setUrges([]);
    setSaved(false);
    checkScale.setValue(0);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
  }

  async function handleSave() {
    setSaving(true);

    const { error } = await supabase.from("checkins").insert({
      user_id: user!.id,
      activation_level: activation,
      triggers,
      thoughts,
      urges,
    });

    setSaving(false);

    if (error) return;

    setSaved(true);
    Animated.spring(checkScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 7,
    }).start(() => {
      setTimeout(() => {
        setModalVisible(false);
        setSaved(false);
        checkScale.setValue(0);
      }, 700);
    });
  }

  if (!isToday) {
    return (
      <Card>
        <View style={styles.pastHeader}>
          <Text style={styles.label}>Check-in</Text>
          <Text style={styles.subtext}>No check-in recorded for this day.</Text>
        </View>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <View style={styles.header}>
          <Text style={styles.label}>Feeling activated?</Text>
          <Text style={styles.subtext}>Rate where you are right now.</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.body}>
          <View style={styles.activationRow}>
            <Text style={styles.activationNumber}>{activation}</Text>
            <Text style={styles.activationLabel}>{ACTIVATION_LABELS[activation]}</Text>
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
            <Text style={styles.sliderEnd}>1</Text>
            <Text style={styles.sliderEnd}>10</Text>
          </View>

          <Pressable style={styles.button} onPress={openModal}>
            <Text style={styles.buttonText}>Check in</Text>
          </Pressable>
        </View>
      </Card>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Reflect</Text>
              <Pressable onPress={closeModal} hitSlop={12} disabled={saving || saved}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>What triggered it?</Text>
                <Text style={styles.sectionHint}>Select all that apply</Text>
                <TagSelector
                  tags={TRIGGERS}
                  selected={triggers}
                  onToggle={(tag) => toggleTag(triggers, setTriggers, tag)}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>What's the story your brain is running?</Text>
                <Text style={styles.sectionHint}>Select all that apply</Text>
                <TagSelector
                  tags={THOUGHTS}
                  selected={thoughts}
                  onToggle={(tag) => toggleTag(thoughts, setThoughts, tag)}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>What's your urge right now?</Text>
                <Text style={styles.sectionHint}>Select all that apply</Text>
                <TagSelector
                  tags={URGES}
                  selected={urges}
                  onToggle={(tag) => toggleTag(urges, setUrges, tag)}
                />
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              {saved ? (
                <Animated.View
                  style={[styles.savedRow, { transform: [{ scale: checkScale }] }]}
                >
                  <Text style={styles.savedText}>✓  Saved</Text>
                </Animated.View>
              ) : (
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
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pastHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  label: {
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  subtext: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  body: {
    padding: 20,
  },
  activationRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 4,
  },
  activationNumber: {
    fontSize: 48,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    lineHeight: 56,
  },
  activationLabel: {
    fontSize: 16,
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
    marginBottom: 16,
  },
  sliderEnd: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.surface,
    letterSpacing: 0.3,
  },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 18, 16, 0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    width: "100%",
    maxWidth: 720,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  closeButton: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 24,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  sheetFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
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
  savedRow: {
    paddingVertical: 17,
    alignItems: "center",
  },
  savedText: {
    fontSize: 18,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});

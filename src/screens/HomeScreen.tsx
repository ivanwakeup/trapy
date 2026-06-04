import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Colors, Fonts, Shadow } from "../theme";
import { ACTIVATION_LABELS } from "../data/tags";

interface Props {
  onContinue: (activationLevel: number) => void;
}

export default function HomeScreen({ onContinue }: Props) {
  const [activation, setActivation] = useState(5);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingBlock}>
        <Text style={styles.greeting}>How are you right now?</Text>
        <Text style={styles.subtitle}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Activation level</Text>
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
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.border}
          thumbTintColor={Colors.primary}
        />
        <View style={styles.sliderEnds}>
          <Text style={styles.sliderEnd}>1</Text>
          <Text style={styles.sliderEnd}>10</Text>
        </View>
      </View>

      <Pressable style={styles.continueButton} onPress={() => onContinue(activation)}>
        <Text style={styles.continueButtonText}>Continue</Text>
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
  greeting: {
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
  activationRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  activationNumber: {
    fontSize: 52,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    lineHeight: 60,
  },
  activationLabel: {
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
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  continueButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    letterSpacing: 0.3,
  },
});

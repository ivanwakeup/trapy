import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { Colors, Fonts } from "../theme";
import { ACTIVATION_LABELS } from "../data/tags";
import Card from "./Card";

interface Props {
  onContinue: (level: number) => void;
}

export default function CheckInCard({ onContinue }: Props) {
  const [activation, setActivation] = useState(5);

  return (
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

        <Pressable style={styles.button} onPress={() => onContinue(activation)}>
          <Text style={styles.buttonText}>Check in</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
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
});

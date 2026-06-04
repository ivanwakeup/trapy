import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors, Fonts } from "../theme";

interface Props {
  activationLevel: number;
  onReflect: () => void;
  onCalmDown: () => void;
}

export default function ChoiceScreen({ activationLevel, onReflect, onCalmDown }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.context}>
          You're at a{" "}
          <Text style={styles.activationNumber}>{activationLevel}</Text>
          {" "}right now.
        </Text>
        <Text style={styles.question}>
          Does it feel ok to sit with what's happening and explore it a little?
        </Text>
        <View style={styles.buttonRow}>
          <Pressable style={styles.choiceButton} onPress={onReflect}>
            <Text style={styles.choiceButtonText}>Yes, let's look at it</Text>
          </Pressable>
          <Pressable style={styles.choiceButton} onPress={onCalmDown}>
            <Text style={styles.choiceButtonText}>I need to settle first</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 36,
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
});

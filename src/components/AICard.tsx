import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Fonts } from "../theme";
import Card from "./Card";

interface Props {
  onPress: () => void;
}

export default function AICard({ onPress }: Props) {
  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.label}>Talk it through</Text>
        <Text style={styles.subtext}>Your AI companion is ready.</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <Text style={styles.bodyText}>
          Reflect on what you're feeling with an AI that has read your journal and knows your patterns.
        </Text>
        <Text style={styles.cta}>Start a conversation →</Text>
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
    gap: 12,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  cta: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },
});

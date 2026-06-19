import React from "react";
import { Pressable, Text, StyleSheet, Platform } from "react-native";
import { Fonts } from "../theme";

export interface BubbleColorScheme {
  background: string;
  border: string;
  text: string;
  glowColor: string;
}

export const BUBBLE_PALETTE: BubbleColorScheme[] = [
  { background: "#1C3530", border: "#4A8A7B", text: "#7EB5A6", glowColor: "rgba(126,181,166,0.45)" },
  { background: "#1C2E1F", border: "#4A7A52", text: "#7AB58E", glowColor: "rgba(122,181,142,0.45)" },
  { background: "#2E2618", border: "#8A6A3A", text: "#C9A86A", glowColor: "rgba(201,168,106,0.45)" },
  { background: "#2E1C22", border: "#8A4A5A", text: "#C07888", glowColor: "rgba(192,120,136,0.45)" },
  { background: "#1E1C2E", border: "#5A5A8A", text: "#9B8EB5", glowColor: "rgba(155,142,181,0.45)" },
  { background: "#1A2430", border: "#4A7A9A", text: "#7AAEC9", glowColor: "rgba(122,174,201,0.45)" },
  { background: "#2A2018", border: "#8A7840", text: "#B8A570", glowColor: "rgba(184,165,112,0.45)" },
];

export const MIN_BUBBLE_SIZE = 72;
export const MAX_BUBBLE_SIZE = 168;

interface Props {
  label: string;
  /** Diameter in px — ThemeCloud computes this, not the bubble itself */
  size: number;
  colorScheme: BubbleColorScheme;
  onPress: () => void;
}

export default function ThemeBubble({ label, size, colorScheme, onPress }: Props) {
  const weight = (size - MIN_BUBBLE_SIZE) / (MAX_BUBBLE_SIZE - MIN_BUBBLE_SIZE);
  const fontSize = Math.round(11 + weight * 8);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          backgroundColor: colorScheme.background,
          borderColor: hovered ? colorScheme.text : colorScheme.border,
          alignItems: "center" as const,
          justifyContent: "center" as const,
          padding: 8,
          transform: [{ scale: hovered ? 1.1 : pressed ? 0.93 : 1 }],
          shadowColor: colorScheme.glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: hovered ? 1 : 0.15,
          shadowRadius: hovered ? 18 : 4,
          elevation: hovered ? 12 : 3,
        },
        ...Platform.select({
          web: [
            {
              transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
              cursor: "pointer",
              boxShadow: hovered
                ? `0 0 22px 6px ${colorScheme.glowColor}`
                : `0 0 6px 1px ${colorScheme.glowColor}`,
            } as any,
          ],
          default: [],
        }),
      ]}
    >
      <Text
        style={[styles.label, { color: colorScheme.text, fontSize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.sansMedium,
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: 15,
  },
});

import React from "react";
import { Pressable, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Colors, Shadow } from "../theme";

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function Card({ children, onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        styles.card,
        style,
        hovered && styles.hovered,
        onPress && pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    ...Shadow.card,
  },
  hovered: {
    backgroundColor: Colors.surfaceHover,
  },
  pressed: {
    backgroundColor: Colors.surfacePressed,
  },
});

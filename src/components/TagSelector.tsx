import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors, Fonts } from "../theme";

interface Props {
  tags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}

export default function TagSelector({ tags, selected, onToggle }: Props) {
  return (
    <View style={styles.container}>
      {tags.map((tag) => {
        const isSelected = selected.includes(tag);
        return (
          <Pressable
            key={tag}
            onPress={() => onToggle(tag)}
            style={[styles.tag, isSelected && styles.tagSelected]}
          >
            <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
              {tag}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  tagTextSelected: {
    fontFamily: Fonts.sansMedium,
    color: Colors.surface,
  },
});

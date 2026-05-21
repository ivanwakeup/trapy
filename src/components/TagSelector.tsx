import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

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
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D1C4E9",
    backgroundColor: "#FAFAFA",
  },
  tagSelected: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  tagText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  tagTextSelected: {
    color: "#FFFFFF",
  },
});

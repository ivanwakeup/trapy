import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Colors, Fonts } from "../theme";
import Card from "./Card";

interface Props {
  onPress: () => void;
  onNewEntry: () => void;
}

export default function JournalCard({ onPress, onNewEntry }: Props) {
  const { user } = useAuth();
  const [preview, setPreview] = useState<{ body: string; date: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("journal_entries")
      .select("body, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setPreview({
            body: data.body,
            date: new Date(data.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            }),
          });
        }
        setLoading(false);
      });
  }, []);

  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>Your journal</Text>
          <Text style={styles.subtext}>
            {loading ? "Loading..." : preview ? `Last entry: ${preview.date}` : "No entries yet."}
          </Text>
        </View>
        <Pressable
          onPress={onNewEntry}
          style={({ pressed, hovered }: any) => [
            styles.newEntryButton,
            hovered && styles.newEntryButtonHovered,
            pressed && styles.newEntryButtonPressed,
          ]}
        >
          <Text style={styles.newEntryText}>New entry</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.textMuted} />
        ) : preview ? (
          <Text style={styles.previewText} numberOfLines={3}>
            {preview.body}
          </Text>
        ) : (
          <Text style={styles.emptyText}>
            Your journal entries will appear here.
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
  newEntryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.accentSubtle,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    marginTop: 2,
  },
  newEntryButtonHovered: {
    backgroundColor: Colors.accentHover,
  },
  newEntryButtonPressed: {
    backgroundColor: Colors.accentSubtle,
  },
  newEntryText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
  body: {
    padding: 20,
  },
  previewText: {
    fontSize: 14,
    fontFamily: Fonts.sansLight,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    lineHeight: 21,
  },
});

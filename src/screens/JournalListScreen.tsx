import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { JournalEntry } from "../types";
import { Colors, Fonts, Shadow } from "../theme";

interface Props {
  focused: boolean;
  onNewEntry: () => void;
  onEditEntry: (entryId: string) => void;
}

export default function JournalListScreen({ focused, onNewEntry, onEditEntry }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!focused) return;
    setLoading(true);
    supabase
      .from("journal_entries")
      .select("id, created_at, updated_at, body, checkin_id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEntries(
          (data ?? []).map((row) => ({
            id: row.id,
            timestamp: row.created_at,
            updatedAt: row.updated_at,
            body: row.body,
            checkinId: row.checkin_id ?? undefined,
          }))
        );
        setLoading(false);
      });
  }, [focused]);

  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingBlock}>
        <Text style={styles.title}>Journal</Text>
        <Pressable onPress={onNewEntry}>
          <Text style={styles.newLink}>New entry</Text>
        </Pressable>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyInner}>
          <Text style={styles.emptyTitle}>Nothing yet.</Text>
          <Text style={styles.emptySubtitle}>Writing is a good place to start.</Text>
        </View>
      ) : (
        entries.map((entry) => (
          <Pressable
            key={entry.id}
            style={styles.card}
            onPress={() => onEditEntry(entry.id)}
          >
            <Text style={styles.cardDate}>
              {new Date(entry.timestamp).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.cardPreview} numberOfLines={2}>
              {entry.body || "Empty entry"}
            </Text>
          </Pressable>
        ))
      )}
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
    gap: 12,
  },
  headingBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  newLink: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.primaryDark,
  },
  empty: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    ...Shadow.card,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  cardPreview: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});

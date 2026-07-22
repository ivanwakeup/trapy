import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Colors, Fonts, Shadow } from "../theme";
import ThemeCloud, { ThemeItem, MAX_THEME_BUBBLES } from "../components/ThemeCloud";
import ToneHeatmap from "../components/ToneHeatmap";
import ToneRiver from "../components/ToneRiver";
import DistortionBreakdown from "../components/DistortionBreakdown";
import WellbeingTrend from "../components/WellbeingTrend";

type ThemeCount = ThemeItem;

interface ChunkRow {
  emotional_tone: string | null;
  entry_date: string | null;
  entry_id: string | null;
  themes: string[] | null;
  cognitive_distortions: string[] | null;
}

interface EntryPreview {
  id: string;
  body: string;
  created_at: string;
}

interface Props {
  focused: boolean;
  onEditEntry: (entryId: string) => void;
}

export default function AnalyticsScreen({ focused, onEditEntry }: Props) {
  const { user } = useAuth();
  const [themes, setThemes] = useState<ThemeCount[]>([]);
  const [chunkRows, setChunkRows] = useState<ChunkRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [modalEntries, setModalEntries] = useState<EntryPreview[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const loadThemes = useCallback(async () => {
    setLoading(true);
    const allRows: ChunkRow[] = [];
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data: page, error } = await supabase
        .from("journal_chunks")
        .select("themes, emotional_tone, entry_date, entry_id, cognitive_distortions")
        .eq("user_id", user!.id)
        .range(from, from + PAGE - 1);
      if (error) break;
      for (const row of page ?? []) allRows.push(row as ChunkRow);
      if (!page || page.length < PAGE) break;
      from += PAGE;
    }
    const data = allRows;

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      for (const theme of row.themes ?? []) {
        if (theme?.trim()) counts[theme] = (counts[theme] ?? 0) + 1;
      }
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_THEME_BUBBLES)
      .map(([theme, count], i) => ({
        theme,
        count,
        colorIndex: i % 7,
      }));

    setThemes(sorted);
    setChunkRows((data ?? []).filter((r) => r.emotional_tone && r.entry_date));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (focused) loadThemes();
  }, [focused, loadThemes]);

  const handleBubblePress = useCallback(async (theme: string) => {
    setSelectedTheme(theme);
    setModalLoading(true);
    setModalEntries([]);

    const { data: chunks } = await supabase
      .from("journal_chunks")
      .select("entry_id")
      .eq("user_id", user!.id)
      .contains("themes", [theme]);

    const entryIds = [...new Set((chunks ?? []).map((c) => c.entry_id))];

    if (entryIds.length === 0) {
      setModalLoading(false);
      return;
    }

    const { data: entries } = await supabase
      .from("journal_entries")
      .select("id, body, created_at")
      .in("id", entryIds)
      .order("created_at", { ascending: false });

    setModalEntries(entries ?? []);
    setModalLoading(false);
  }, [user]);

  const closeModal = useCallback(() => {
    setSelectedTheme(null);
    setModalEntries([]);
  }, []);

  const maxCount = themes[0]?.count ?? 1;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (themes.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No themes yet</Text>
        <Text style={styles.emptySubtitle}>
          Write a few journal entries and your themes will appear here.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingBlock}>
          <Text style={styles.title}>Your patterns</Text>
        </View>

        {chunkRows.length > 0 && (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Wellbeing over time</Text>
              <Text style={styles.sectionSubtitle}>Regulated vs. distressed tone, 4-week rolling average</Text>
            </View>
            <WellbeingTrend chunks={chunkRows} />
          </>
        )}

        <View style={[styles.sectionHeading, { marginTop: chunkRows.length > 0 ? 36 : 0 }]}>
          <Text style={styles.sectionTitle}>Themes</Text>
          <Text style={styles.sectionSubtitle}>What you write about most</Text>
        </View>
        <ThemeCloud
          themes={themes}
          onBubblePress={handleBubblePress}
        />

        {chunkRows.length > 0 && (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Daily mood</Text>
              <Text style={styles.sectionSubtitle}>Dominant emotional tone per day</Text>
            </View>
            <ToneHeatmap chunks={chunkRows} onOpenEntry={onEditEntry} />

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Tone over time</Text>
              <Text style={styles.sectionSubtitle}>Emotional mix by week</Text>
            </View>
            <ToneRiver chunks={chunkRows} />

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Thought patterns</Text>
              <Text style={styles.sectionSubtitle}>Cognitive distortions — tap to see which themes they appear with</Text>
            </View>
            <DistortionBreakdown chunks={chunkRows} />
          </>
        )}
      </ScrollView>

      <Modal
        visible={selectedTheme !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>"{selectedTheme}"</Text>
              <Pressable
                onPress={closeModal}
                style={({ pressed, hovered }: any) => [
                  styles.closeBtn,
                  hovered && styles.closeBtnHovered,
                  pressed && styles.closeBtnPressed,
                ]}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {modalLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
              ) : modalEntries.length === 0 ? (
                <Text style={styles.modalEmpty}>No entries found.</Text>
              ) : (
                modalEntries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    onPress={() => {
                      closeModal();
                      onEditEntry(entry.id);
                    }}
                    style={({ pressed, hovered }: any) => [
                      styles.entryCard,
                      hovered && styles.entryCardHovered,
                      pressed && styles.entryCardPressed,
                    ]}
                  >
                    <Text style={styles.entryDate}>
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    <Text style={styles.entryPreview} numberOfLines={3}>
                      {entry.body || "Empty entry"}
                    </Text>
                    <Text style={styles.entryArrow}>Open →</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    paddingBottom: 64,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  headingBlock: {
    paddingHorizontal: 4,
    marginBottom: 28,
  },
  title: {
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
  sectionHeading: {
    paddingHorizontal: 4,
    marginTop: 36,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginTop: 3,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 24,
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 18, 15, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    ...Platform.select({ web: { cursor: "default" } as any, default: {} }),
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    width: "100%",
    maxWidth: 480,
    maxHeight: "75%",
    ...Shadow.card,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  closeBtnHovered: {
    backgroundColor: Colors.surfaceHover,
  },
  closeBtnPressed: {
    backgroundColor: Colors.surfacePressed,
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: Fonts.sans,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  modalEmpty: {
    fontSize: 15,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 24,
  },
  entryCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  entryCardHovered: {
    backgroundColor: Colors.surfaceHover,
    borderColor: Colors.primary,
  },
  entryCardPressed: {
    backgroundColor: Colors.surfacePressed,
  },
  entryDate: {
    fontSize: 11,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  entryPreview: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  entryArrow: {
    fontSize: 12,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
    marginTop: 2,
  },
});

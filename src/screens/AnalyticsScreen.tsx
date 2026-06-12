import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { CheckInEntry } from "../types";
import { Colors, Fonts } from "../theme";
import Card from "../components/Card";

function topN(items: string[], n = 5): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function RankedList({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  if (items.length === 0) return null;
  const max = items[0].count;

  return (
    <Card style={styles.cardPadding}>
      <Text style={styles.cardLabel}>{title}</Text>
      {items.map(({ label, count }) => (
        <View key={label} style={styles.rankRow}>
          <Text style={styles.rankLabel} numberOfLines={1}>
            {label}
          </Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { flex: count / max }]} />
            <View style={{ flex: 1 - count / max }} />
          </View>
          <Text style={styles.rankCount}>{count}</Text>
        </View>
      ))}
    </Card>
  );
}

function ActivationChart({ entries }: { entries: CheckInEntry[] }) {
  const recent = entries.slice(0, 14).reverse();
  if (recent.length === 0) return null;

  return (
    <Card style={styles.cardPadding}>
      <Text style={styles.cardLabel}>Activation over time</Text>
      <View style={styles.chart}>
        {recent.map((entry) => (
          <View key={entry.id} style={styles.barCol}>
            <View style={styles.barColInner}>
              <View
                style={[
                  styles.chartBar,
                  { flex: entry.activationLevel / 10 },
                ]}
              />
              <View style={{ flex: (10 - entry.activationLevel) / 10 }} />
            </View>
            <Text style={styles.chartBarLabel}>{entry.activationLevel}</Text>
          </View>
        ))}
      </View>
      <View style={styles.chartLegend}>
        <Text style={styles.chartLegendText}>older</Text>
        <Text style={styles.chartLegendText}>recent</Text>
      </View>
    </Card>
  );
}

interface Props {
  focused: boolean;
}

export default function AnalyticsScreen({ focused }: Props) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CheckInEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!focused) return;
    setLoading(true);
    supabase
      .from("checkins")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEntries(
          (data ?? []).map((row) => ({
            id: row.id,
            timestamp: row.created_at,
            activationLevel: row.activation_level,
            triggers: row.triggers,
            thoughts: row.thoughts,
            urges: row.urges,
            reflection:
              row.open_to_reframe !== null
                ? {
                    openToReframe: row.open_to_reframe,
                    reframeOffered: row.reframe_offered ?? undefined,
                  }
                : undefined,
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

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No check-ins yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete your first check-in to see patterns here.
        </Text>
      </View>
    );
  }

  const avg = (
    entries.reduce((sum, e) => sum + e.activationLevel, 0) / entries.length
  ).toFixed(1);

  const allTriggers = entries.flatMap((e) => e.triggers);
  const allThoughts = entries.flatMap((e) => e.thoughts);
  const allUrges = entries.flatMap((e) => e.urges);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingBlock}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{entries.length}</Text>
          <Text style={styles.statLabel}>check-ins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{avg}</Text>
          <Text style={styles.statLabel}>avg activation</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {Math.max(...entries.map((e) => e.activationLevel))}
          </Text>
          <Text style={styles.statLabel}>peak</Text>
        </View>
      </View>

      <ActivationChart entries={entries} />
      <RankedList title="Top triggers" items={topN(allTriggers)} />
      <RankedList title="Top thoughts" items={topN(allThoughts)} />
      <RankedList title="Top urges" items={topN(allUrges)} />
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
    gap: 14,
  },
  headingBlock: {
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontFamily: Fonts.serif,
    color: Colors.primaryDark,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.sansLight,
    color: Colors.textSecondary,
    marginTop: 3,
    textAlign: "center",
  },
  cardPadding: {
    padding: 20,
  },
  cardLabel: {
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  rankLabel: {
    width: 150,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.divider,
    flexDirection: "row",
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  rankCount: {
    width: 20,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: "right",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 4,
    marginBottom: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  barColInner: {
    flex: 1,
    width: "100%",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  chartBar: {
    backgroundColor: Colors.primary,
    borderRadius: 3,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginTop: 4,
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLegendText: {
    fontSize: 11,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
  },
  empty: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
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
});

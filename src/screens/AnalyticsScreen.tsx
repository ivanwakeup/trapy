import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CheckInEntry {
  id: string;
  timestamp: string;
  activationLevel: number;
  triggers: string[];
  thoughts: string[];
  urges: string[];
}

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
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {items.map(({ label, count }) => (
        <View key={label} style={styles.rankRow}>
          <Text style={styles.rankLabel} numberOfLines={1}>
            {label}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { flex: count / max }]}
            />
            <View style={{ flex: 1 - count / max }} />
          </View>
          <Text style={styles.rankCount}>{count}</Text>
        </View>
      ))}
    </View>
  );
}

function ActivationChart({ entries }: { entries: CheckInEntry[] }) {
  const recent = entries.slice(0, 14).reverse();
  if (recent.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Activation over time</Text>
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
    </View>
  );
}

interface Props {
  focused: boolean;
}

export default function AnalyticsScreen({ focused }: Props) {
  const [entries, setEntries] = useState<CheckInEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!focused) return;
    setLoading(true);
    AsyncStorage.getItem("checkins").then((raw) => {
      setEntries(raw ? JSON.parse(raw) : []);
      setLoading(false);
    });
  }, [focused]);

  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color="#7C3AED" />
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
      <Text style={styles.title}>Analytics</Text>

      {/* Summary stats */}
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
    backgroundColor: "#FAF9F7",
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 36,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F3F0FF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#7C3AED",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    textAlign: "center",
  },
  section: {
    marginBottom: 36,
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 14,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  rankLabel: {
    width: 160,
    fontSize: 13,
    color: "#374151",
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    flexDirection: "row",
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: "#7C3AED",
    borderRadius: 4,
  },
  rankCount: {
    width: 20,
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "right",
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 4,
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
    backgroundColor: "#7C3AED",
    borderRadius: 3,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 3,
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  chartLegendText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  empty: {
    flex: 1,
    backgroundColor: "#FAF9F7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 22,
  },
});

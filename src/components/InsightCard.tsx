import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Colors, Fonts } from "../theme";
import Card from "./Card";

interface Props {
  onPress: () => void;
}

function topTrigger(rows: { triggers: string[] }[]): string | null {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const t of row.triggers ?? []) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

export default function InsightCard({ onPress }: Props) {
  const { user } = useAuth();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    supabase
      .from("checkins")
      .select("triggers")
      .eq("user_id", user!.id)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = data ?? [];
        if (rows.length < 3) {
          setInsight(null);
        } else {
          const top = topTrigger(rows);
          setInsight(top ? `"${top}" is your most common trigger lately.` : null);
        }
        setLoading(false);
      });
  }, []);

  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.label}>Your patterns</Text>
        <Text style={styles.subtext}>Based on your recent check-ins.</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.textMuted} />
        ) : insight ? (
          <Text style={styles.insightText}>{insight}</Text>
        ) : (
          <Text style={styles.emptyText}>
            Your patterns will appear here after a few check-ins.
          </Text>
        )}
        <Text style={styles.cta}>See full analytics →</Text>
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
  insightText: {
    fontSize: 15,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    lineHeight: 23,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    lineHeight: 21,
  },
  cta: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },
});

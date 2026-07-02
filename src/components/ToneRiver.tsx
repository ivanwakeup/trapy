import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { Colors, Fonts } from "../theme";
import { toneToColor, toneToLabel } from "./ToneColors";

interface ChunkRow {
  emotional_tone: string | null;
  entry_date: string | null;
}

interface Props {
  chunks: ChunkRow[];
}

const BAR_HEIGHT = 110;
const BAR_WIDTH = 22;
const GAP = 3;

function computeNumWeeks(chunks: ChunkRow[]): number {
  const timestamps = chunks
    .filter((c) => c.entry_date)
    .map((c) => new Date(c.entry_date!).getTime())
    .filter((t) => !isNaN(t));
  if (!timestamps.length) return 26;
  const oldest = Math.min(...timestamps);
  const weeks = Math.ceil((Date.now() - oldest) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(weeks, 12), 260);
}

function getMondayKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

interface WeekBucket {
  weekKey: string;
  label: string;
  toneCounts: Record<string, number>;
  total: number;
}

function buildWeeks(chunks: ChunkRow[], numWeeks: number): WeekBucket[] {
  const byWeek: Record<string, Record<string, number>> = {};
  for (const c of chunks) {
    if (!c.entry_date || !c.emotional_tone) continue;
    const d = new Date(c.entry_date);
    if (isNaN(d.getTime())) continue;
    const key = getMondayKey(d);
    if (!byWeek[key]) byWeek[key] = {};
    const tone = c.emotional_tone.toLowerCase().trim();
    byWeek[key][tone] = (byWeek[key][tone] ?? 0) + 1;
  }

  const today = new Date();
  const buckets: WeekBucket[] = [];

  for (let w = numWeeks - 1; w >= 0; w--) {
    const d = new Date(today);
    d.setDate(today.getDate() - w * 7);
    const key = getMondayKey(d);
    const toneCounts = byWeek[key] ?? {};
    const total = Object.values(toneCounts).reduce((s, n) => s + n, 0);
    const weekDate = new Date(key);
    const label = weekDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    buckets.push({ weekKey: key, label, toneCounts, total });
  }

  return buckets;
}

function getTopTones(weeks: WeekBucket[], maxTones = 6): string[] {
  const global: Record<string, number> = {};
  for (const w of weeks) {
    for (const [tone, count] of Object.entries(w.toneCounts)) {
      global[tone] = (global[tone] ?? 0) + count;
    }
  }
  return Object.entries(global)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTones)
    .map(([t]) => t);
}

function RiverBar({ week, maxTotal, topTones, isLast }: {
  week: WeekBucket;
  maxTotal: number;
  topTones: string[];
  isLast: boolean;
}) {
  const barH = week.total === 0
    ? 0
    : Math.max(6, (week.total / maxTotal) * BAR_HEIGHT);

  const otherCount = week.total - topTones.reduce((s, t) => s + (week.toneCounts[t] ?? 0), 0);
  const segments = [
    ...topTones.map((t) => ({ tone: t, count: week.toneCounts[t] ?? 0, color: toneToColor(t) })),
    ...(otherCount > 0 ? [{ tone: "other", count: otherCount, color: Colors.border }] : []),
  ].filter((s) => s.count > 0);

  return (
    <Pressable
      style={({ pressed, hovered }: any) => [
        styles.barWrapper,
        { marginRight: isLast ? 0 : GAP },
        hovered && styles.barWrapperHovered,
        pressed && styles.barWrapperPressed,
        ...Platform.select({
          web: [{ cursor: "pointer", transition: "opacity 0.12s ease, transform 0.12s ease" } as any],
          default: [],
        }),
      ]}
    >
      <View style={[styles.barContainer]}>
        {week.total === 0 ? (
          <View style={styles.emptyBar} />
        ) : (
          <View style={[styles.bar, { height: barH }]}>
            {segments.map((seg, si) => {
              const segH = (seg.count / week.total) * barH;
              return (
                <View
                  key={si}
                  style={{
                    height: segH,
                    width: BAR_WIDTH,
                    backgroundColor: seg.color,
                    borderTopLeftRadius: si === 0 ? 3 : 0,
                    borderTopRightRadius: si === 0 ? 3 : 0,
                  }}
                />
              );
            })}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function ToneRiver({ chunks }: Props) {
  const numWeeks = useMemo(() => computeNumWeeks(chunks), [chunks]);
  const weeks = useMemo(() => buildWeeks(chunks, numWeeks), [chunks, numWeeks]);
  const topTones = useMemo(() => getTopTones(weeks), [weeks]);
  const maxTotal = useMemo(() => Math.max(...weeks.map((w) => w.total), 1), [weeks]);

  // Show month labels every 4 weeks
  const monthMarkers = useMemo(() => {
    const markers: Record<number, string> = {};
    let lastMonth = -1;
    weeks.forEach((w, i) => {
      const d = new Date(w.weekKey);
      if (d.getMonth() !== lastMonth) {
        markers[i] = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        lastMonth = d.getMonth();
      }
    });
    return markers;
  }, [weeks]);

  const legend = topTones.map((tone) => ({
    tone,
    color: toneToColor(tone),
    label: toneToLabel(tone),
  }));

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Month labels */}
          <View style={styles.monthRow}>
            {weeks.map((_, i) => (
              <View key={i} style={{ width: BAR_WIDTH + GAP }}>
                {monthMarkers[i] && (
                  <Text style={styles.monthLabel}>{monthMarkers[i]}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Bars */}
          <View style={styles.chart}>
            {weeks.map((week, wi) => (
              <RiverBar
                key={week.weekKey}
                week={week}
                maxTotal={maxTotal}
                topTones={topTones}
                isLast={wi === weeks.length - 1}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {legend.length > 0 && (
        <View style={styles.legend}>
          {legend.map((item) => (
            <View key={item.tone} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 14 },
  monthRow: { flexDirection: "row", marginBottom: 4 },
  monthLabel: { fontSize: 8, fontFamily: Fonts.sans, color: Colors.textMuted },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: BAR_HEIGHT,
  },
  barWrapper: {
    width: BAR_WIDTH,
    alignItems: "center",
    justifyContent: "flex-end",
    height: BAR_HEIGHT,
    borderRadius: 3,
  },
  barWrapperHovered: {
    opacity: 0.85,
    transform: [{ scaleY: 1.03 }],
  },
  barWrapperPressed: {
    opacity: 0.65,
  },
  barContainer: {
    justifyContent: "flex-end",
    height: BAR_HEIGHT,
    width: BAR_WIDTH,
  },
  bar: {
    width: BAR_WIDTH,
    overflow: "hidden",
    justifyContent: "flex-start",
    borderRadius: 3,
  },
  emptyBar: {
    height: 3,
    width: BAR_WIDTH,
    backgroundColor: Colors.border,
    borderRadius: 2,
    opacity: 0.35,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontFamily: Fonts.sans, color: Colors.textMuted },
});

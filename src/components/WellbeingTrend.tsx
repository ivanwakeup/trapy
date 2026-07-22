import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Colors, Fonts } from "../theme";
import { toneToLabel } from "./ToneColors";

interface ChunkRow {
  emotional_tone: string | null;
  entry_date: string | null;
}

interface Props {
  chunks: ChunkRow[];
}

const DISTRESSED = new Set(["Anxious", "Overwhelmed", "Sad", "Avoidant", "Angry", "Shame", "Lonely"]);
const REGULATED = new Set(["Curious", "Hopeful", "Settled", "Determined"]);

const STEP = 25;      // px per week slot
const CHART_H = 90;
const DOT_R = 3.5;
const LINE_H = 2;
const ROLL = 4;       // 4-week rolling window
const MAX_GAP = 3;    // break the line if points are more than this many weeks apart

function getMondayKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

function computeNumWeeks(chunks: ChunkRow[]): number {
  const ts = chunks
    .filter((c) => c.entry_date)
    .map((c) => new Date(c.entry_date!).getTime())
    .filter((t) => !isNaN(t));
  if (!ts.length) return 26;
  const oldest = Math.min(...ts);
  const weeks = Math.ceil((Date.now() - oldest) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(weeks, 12), 260);
}

function lerpColor(score: number): string {
  const r = Math.round(0xe0 + (0x7e - 0xe0) * score);
  const g = Math.round(0x7c + (0xb5 - 0x7c) * score);
  const b = Math.round(0x5a + (0xa6 - 0x5a) * score);
  return `rgb(${r},${g},${b})`;
}

interface PlotPoint {
  weekIndex: number;
  x: number;
  y: number;
  rollAvg: number;
  color: string;
}

interface Segment {
  left: number;
  top: number;
  width: number;
  angle: number;
  color: string;
}

interface MonthLabel {
  weekIndex: number;
  label: string;
}

interface ChartData {
  points: PlotPoint[];
  segments: Segment[];
  monthLabels: MonthLabel[];
}

function buildData(chunks: ChunkRow[], numWeeks: number): ChartData {
  const byWeek: Record<string, { reg: number; dist: number }> = {};
  for (const c of chunks) {
    if (!c.entry_date || !c.emotional_tone) continue;
    const d = new Date(c.entry_date);
    if (isNaN(d.getTime())) continue;
    const key = getMondayKey(d);
    if (!byWeek[key]) byWeek[key] = { reg: 0, dist: 0 };
    const lbl = toneToLabel(c.emotional_tone);
    if (REGULATED.has(lbl)) byWeek[key].reg++;
    else if (DISTRESSED.has(lbl)) byWeek[key].dist++;
  }

  const today = new Date();
  const rawScores: (number | null)[] = [];
  const monthLabels: MonthLabel[] = [];
  let lastMonth = -1;

  for (let w = numWeeks - 1; w >= 0; w--) {
    const d = new Date(today);
    d.setDate(today.getDate() - w * 7);
    const key = getMondayKey(d);
    const weekDate = new Date(key);
    const month = weekDate.getMonth();

    if (month !== lastMonth) {
      monthLabels.push({
        weekIndex: numWeeks - 1 - w,
        label: weekDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      });
      lastMonth = month;
    }

    const data = byWeek[key];
    const total = data ? data.reg + data.dist : 0;
    rawScores.push(total > 0 ? data.reg / total : null);
  }

  // 4-week rolling average
  const rollAvgs: (number | null)[] = rawScores.map((_, i) => {
    const window: number[] = [];
    for (let j = Math.max(0, i - ROLL + 1); j <= i; j++) {
      if (rawScores[j] !== null) window.push(rawScores[j]!);
    }
    return window.length > 0 ? window.reduce((a, b) => a + b, 0) / window.length : null;
  });

  const points: PlotPoint[] = [];
  for (let i = 0; i < numWeeks; i++) {
    const avg = rollAvgs[i];
    if (avg === null) continue;
    const x = i * STEP + STEP / 2;
    const y = CHART_H * (1 - avg);
    points.push({ weekIndex: i, x, y, rollAvg: avg, color: lerpColor(avg) });
  }

  const segments: Segment[] = [];
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k];
    const b = points[k + 1];
    if (b.weekIndex - a.weekIndex > MAX_GAP) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    segments.push({
      left: cx - len / 2,
      top: cy - LINE_H / 2,
      width: len,
      angle,
      color: lerpColor((a.rollAvg + b.rollAvg) / 2),
    });
  }

  return { points, segments, monthLabels };
}

export default function WellbeingTrend({ chunks }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const numWeeks = useMemo(() => computeNumWeeks(chunks), [chunks]);
  const { points, segments, monthLabels } = useMemo(
    () => buildData(chunks, numWeeks),
    [chunks, numWeeks]
  );
  const chartWidth = numWeeks * STEP;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [chartWidth]);

  if (points.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Plot area */}
          <View style={[styles.plotArea, { width: chartWidth, height: CHART_H }]}>
            {/* 50% reference line */}
            <View style={[styles.refLine, { top: CHART_H / 2 }]} />

            {/* Connecting segments */}
            {segments.map((seg, i) => (
              <View
                key={i}
                style={{
                  position: "absolute",
                  left: seg.left,
                  top: seg.top,
                  width: seg.width,
                  height: LINE_H,
                  borderRadius: LINE_H / 2,
                  backgroundColor: seg.color,
                  opacity: 0.75,
                  transform: [{ rotate: `${seg.angle}deg` }],
                }}
              />
            ))}

            {/* Dots */}
            {points.map((pt) => (
              <View
                key={pt.weekIndex}
                style={{
                  position: "absolute",
                  left: pt.x - DOT_R,
                  top: pt.y - DOT_R,
                  width: DOT_R * 2,
                  height: DOT_R * 2,
                  borderRadius: DOT_R,
                  backgroundColor: pt.color,
                }}
              />
            ))}
          </View>

          {/* Month labels */}
          <View style={{ flexDirection: "row", width: chartWidth, marginTop: 4 }}>
            {monthLabels.map(({ weekIndex, label }) => (
              <View
                key={weekIndex}
                style={{
                  position: "absolute",
                  left: weekIndex * STEP,
                  width: STEP * 4,
                }}
              >
                <Text style={styles.monthLabel}>{label}</Text>
              </View>
            ))}
            {/* spacer so the row has height */}
            <View style={{ height: 14, width: chartWidth }} />
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: lerpColor(1) }]} />
          <Text style={styles.legendLabel}>Regulated</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: lerpColor(0) }]} />
          <Text style={styles.legendLabel}>Distressed</Text>
        </View>
        <Text style={styles.legendNote}>{ROLL}-week rolling avg</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  plotArea: {
    position: "relative",
    overflow: "hidden",
  },
  refLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.border,
    opacity: 0.6,
  },
  monthLabel: {
    fontSize: 8,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  legendNote: {
    fontSize: 10,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    opacity: 0.7,
    marginLeft: "auto",
  },
});

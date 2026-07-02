import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Platform } from "react-native";
import { Colors, Fonts } from "../theme";
import { toneToColor, toneToLabel } from "./ToneColors";

interface ChunkRow {
  emotional_tone: string | null;
  entry_date: string | null;
  entry_id: string | null;
}

interface CellData {
  date: string;
  tone: string | null;
  entryId: string | null;
  hasEntry: boolean;
  future: boolean;
}

interface SelectedDay {
  date: string;
  tone: string;
  entryId: string | null;
}

interface Props {
  chunks: ChunkRow[];
  onOpenEntry: (entryId: string) => void;
}

const CELL = 14;
const GAP = 2;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function computeNumWeeks(chunks: ChunkRow[]): number {
  const timestamps = chunks
    .filter((c) => c.entry_date)
    .map((c) => new Date(c.entry_date!).getTime())
    .filter((t) => !isNaN(t));
  if (!timestamps.length) return 26;
  const oldest = Math.min(...timestamps);
  const weeks = Math.ceil((Date.now() - oldest) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(weeks, 16), 260);
}

function buildGrid(chunks: ChunkRow[], numWeeks: number): CellData[][] {
  const toneByDay: Record<string, { counts: Record<string, number>; entryId: string | null }> = {};

  for (const c of chunks) {
    if (!c.entry_date || !c.emotional_tone) continue;
    const day = c.entry_date.slice(0, 10);
    if (!toneByDay[day]) toneByDay[day] = { counts: {}, entryId: c.entry_id ?? null };
    const tone = c.emotional_tone.toLowerCase().trim();
    toneByDay[day].counts[tone] = (toneByDay[day].counts[tone] ?? 0) + 1;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow);
  const startDate = new Date(weekStart);
  startDate.setDate(weekStart.getDate() - (numWeeks - 1) * 7);

  const weeks: CellData[][] = [];

  for (let w = 0; w < numWeeks; w++) {
    const week: CellData[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const isFuture = date > today;
      const dateStr = date.toISOString().slice(0, 10);
      const dayData = toneByDay[dateStr];
      let tone: string | null = null;
      if (dayData) {
        tone = Object.entries(dayData.counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      }
      week.push({
        date: dateStr,
        tone,
        entryId: dayData?.entryId ?? null,
        hasEntry: !!dayData,
        future: isFuture,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

function buildLegend(chunks: ChunkRow[]) {
  const seen: Record<string, number> = {};
  for (const c of chunks) {
    if (!c.emotional_tone) continue;
    const t = c.emotional_tone.toLowerCase().trim();
    seen[t] = (seen[t] ?? 0) + 1;
  }
  return Object.entries(seen)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tone]) => ({ tone, color: toneToColor(tone), label: toneToLabel(tone) }));
}

function HeatCell({
  cell,
  selectedTone,
  onPress,
}: {
  cell: CellData;
  selectedTone: string | null;
  onPress: (cell: CellData) => void;
}) {
  if (cell.future || !cell.hasEntry) {
    return (
      <View style={[styles.cell, cell.future ? styles.cellFuture : styles.cellEmpty]} />
    );
  }

  const color = toneToColor(cell.tone);
  const isSelected = selectedTone === null || cell.tone === selectedTone;

  return (
    <Pressable
      onPress={() => onPress(cell)}
      style={({ pressed, hovered }: any) => [
        styles.cell,
        { backgroundColor: color, opacity: isSelected ? 1 : 0.18 },
        hovered && isSelected && { borderWidth: 1.5, borderColor: "#fff" },
        pressed && { opacity: 0.6 },
        ...Platform.select({
          web: [{ cursor: "pointer", transition: "opacity 0.15s ease, border-color 0.12s ease" } as any],
          default: [],
        }),
      ]}
    />
  );
}

export default function ToneHeatmap({ chunks, onOpenEntry }: Props) {
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  const numWeeks = useMemo(() => computeNumWeeks(chunks), [chunks]);
  const weeks = useMemo(() => buildGrid(chunks, numWeeks), [chunks, numWeeks]);
  const legend = useMemo(() => buildLegend(chunks), [chunks]);

  const monthLabels = useMemo(() => {
    const labels: Array<{ weekIndex: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const date = new Date(week[0].date);
      const month = date.getMonth();
      if (month !== lastMonth) {
        labels.push({
          weekIndex: i,
          label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  function handleCellPress(cell: CellData) {
    if (!cell.tone) return;
    if (selectedDay?.tone === cell.tone && selectedDay?.date === cell.date) {
      setSelectedDay(null);
    } else {
      setSelectedDay({ date: cell.date, tone: cell.tone, entryId: cell.entryId });
    }
  }

  const formattedDate = selectedDay
    ? new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.monthRow}>
            <View style={{ width: 18 }} />
            {weeks.map((_, i) => {
              const label = monthLabels.find((m) => m.weekIndex === i);
              return (
                <View key={i} style={{ width: CELL + GAP }}>
                  {label && <Text style={styles.monthLabel}>{label.label}</Text>}
                </View>
              );
            })}
          </View>

          <View style={styles.grid}>
            <View style={styles.dayLabels}>
              {DAY_LABELS.map((d, i) => (
                <Text key={i} style={styles.dayLabel}>{d}</Text>
              ))}
            </View>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekCol}>
                {week.map((cell, di) => (
                  <HeatCell
                    key={di}
                    cell={cell}
                    selectedTone={selectedDay?.tone ?? null}
                    onPress={handleCellPress}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Selection info bar */}
      {selectedDay && (
        <View style={styles.infoBar}>
          <View style={[styles.infoDot, { backgroundColor: toneToColor(selectedDay.tone) }]} />
          <View style={styles.infoText}>
            <Text style={styles.infoTone}>{toneToLabel(selectedDay.tone)}</Text>
            <Text style={styles.infoDate}>{formattedDate}</Text>
          </View>
          <View style={styles.infoActions}>
            {selectedDay.entryId && (
              <Pressable
                onPress={() => {
                  setSelectedDay(null);
                  onOpenEntry(selectedDay.entryId!);
                }}
                style={({ pressed, hovered }: any) => [
                  styles.openBtn,
                  hovered && styles.openBtnHovered,
                  pressed && styles.openBtnPressed,
                  ...Platform.select({
                    web: [{ cursor: "pointer", transition: "background-color 0.12s ease" } as any],
                    default: [],
                  }),
                ]}
              >
                <Text style={styles.openBtnText}>Open entry →</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setSelectedDay(null)}
              style={({ pressed, hovered }: any) => [
                styles.dismissBtn,
                (hovered || pressed) && styles.dismissBtnActive,
              ]}
            >
              <Text style={styles.dismissBtnText}>✕</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Legend */}
      {!selectedDay && legend.length > 0 && (
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
  monthRow: { flexDirection: "row", marginBottom: 3 },
  monthLabel: { fontSize: 8, fontFamily: Fonts.sans, color: Colors.textMuted },
  grid: { flexDirection: "row", gap: GAP },
  dayLabels: { width: 16, gap: GAP },
  dayLabel: { height: CELL, fontSize: 8, fontFamily: Fonts.sans, color: Colors.textMuted, lineHeight: CELL },
  weekCol: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  cellEmpty: { backgroundColor: Colors.border, opacity: 0.4 },
  cellFuture: { backgroundColor: "transparent" },

  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  infoText: { flex: 1, gap: 1 },
  infoTone: { fontSize: 13, fontFamily: Fonts.sansMedium, color: Colors.textPrimary },
  infoDate: { fontSize: 11, fontFamily: Fonts.sansLight, color: Colors.textMuted },
  infoActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  openBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  openBtnHovered: { backgroundColor: Colors.primaryDark },
  openBtnPressed: { opacity: 0.7 },
  openBtnText: { fontSize: 12, fontFamily: Fonts.sansMedium, color: Colors.primary },
  dismissBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissBtnActive: { backgroundColor: Colors.surfaceHover },
  dismissBtnText: { fontSize: 12, color: Colors.textMuted, fontFamily: Fonts.sans },

  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontFamily: Fonts.sans, color: Colors.textMuted },
});

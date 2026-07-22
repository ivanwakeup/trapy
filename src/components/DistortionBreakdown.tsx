import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { Colors, Fonts } from "../theme";

interface ChunkRow {
  emotional_tone: string | null;
  entry_date: string | null;
  entry_id: string | null;
  themes: string[] | null;
  cognitive_distortions: string[] | null;
}

interface DistortionStat {
  distortion: string;
  count: number;
  topThemes: Array<{ theme: string; count: number }>;
}

interface Props {
  chunks: ChunkRow[];
}

const DISTORTION_LABELS: Record<string, string> = {
  catastrophizing: "Catastrophizing",
  "mind reading": "Mind reading",
  "fortune telling": "Fortune telling",
  "black-and-white thinking": "Black-and-white thinking",
  "emotional reasoning": "Emotional reasoning",
  personalization: "Personalization",
  overgeneralization: "Overgeneralization",
  filtering: "Filtering",
  "disqualifying the positive": "Disqualifying the positive",
  "should statements": "Should statements",
  labeling: "Labeling",
  "jumping to conclusions": "Jumping to conclusions",
  magnification: "Magnification",
  minimization: "Minimization",
};

function computeStats(chunks: ChunkRow[]): DistortionStat[] {
  const distortionCounts: Record<string, number> = {};
  const distortionThemes: Record<string, Record<string, number>> = {};

  for (const chunk of chunks) {
    const distortions = chunk.cognitive_distortions ?? [];
    const themes = chunk.themes ?? [];
    for (const d of distortions) {
      if (!d?.trim()) continue;
      distortionCounts[d] = (distortionCounts[d] ?? 0) + 1;
      if (!distortionThemes[d]) distortionThemes[d] = {};
      for (const t of themes) {
        if (t?.trim()) {
          distortionThemes[d][t] = (distortionThemes[d][t] ?? 0) + 1;
        }
      }
    }
  }

  return Object.entries(distortionCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([distortion, count]) => ({
      distortion,
      count,
      topThemes: Object.entries(distortionThemes[distortion] ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([theme, cnt]) => ({ theme, count: cnt })),
    }));
}

export default function DistortionBreakdown({ chunks }: Props) {
  const stats = useMemo(() => computeStats(chunks), [chunks]);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (stats.length === 0) return null;

  const maxCount = stats[0].count;

  return (
    <View style={styles.container}>
      {stats.map((stat) => {
        const isOpen = expanded === stat.distortion;
        const barPct = stat.count / maxCount;
        const label = DISTORTION_LABELS[stat.distortion] ?? stat.distortion;

        return (
          <Pressable
            key={stat.distortion}
            onPress={() => setExpanded(isOpen ? null : stat.distortion)}
            style={({ pressed, hovered }: any) => [
              styles.row,
              isOpen && styles.rowOpen,
              !isOpen && hovered && styles.rowHovered,
              !isOpen && pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.label, isOpen && styles.labelOpen]} numberOfLines={1}>
                {label}
              </Text>
              <Text style={styles.count}>{stat.count}</Text>
            </View>

            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(barPct * 100)}%` }]} />
            </View>

            {isOpen && stat.topThemes.length > 0 && (
              <View style={styles.themeArea}>
                <Text style={styles.themeLabel}>Common themes</Text>
                <View style={styles.pills}>
                  {stat.topThemes.map(({ theme, count: tc }) => (
                    <View key={theme} style={styles.pill}>
                      <Text style={styles.pillText}>{theme}</Text>
                      <Text style={styles.pillCount}>{tc}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {isOpen && stat.topThemes.length === 0 && (
              <Text style={styles.noThemes}>No themes recorded with these chunks.</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  row: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    ...Platform.select({ web: { cursor: "pointer" } as any, default: {} }),
  },
  rowOpen: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  rowHovered: {
    backgroundColor: Colors.surfaceHover,
    borderColor: Colors.textMuted,
  },
  rowPressed: {
    backgroundColor: Colors.surfacePressed,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 12,
  },
  labelOpen: {
    color: Colors.textPrimary,
    fontFamily: Fonts.sansMedium,
  },
  count: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.textMuted,
    minWidth: 24,
    textAlign: "right",
  },
  barTrack: {
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  themeArea: {
    marginTop: 6,
    gap: 8,
  },
  themeLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.accentSubtle,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  pillText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.accent,
  },
  pillCount: {
    fontSize: 11,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
  },
  noThemes: {
    fontSize: 13,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

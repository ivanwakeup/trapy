import React, { useState, useMemo } from "react";
import { View } from "react-native";
import ThemeBubble, { BUBBLE_PALETTE, MIN_BUBBLE_SIZE, MAX_BUBBLE_SIZE } from "./ThemeBubble";

export const MAX_THEME_BUBBLES = 7;

const GAP = 8; // minimum px between bubble edges

export interface ThemeItem {
  theme: string;
  count: number;
  colorIndex: number;
}

interface XY { x: number; y: number }

// Returns 0–2 center positions for a circle of radius `r` that is simultaneously
// tangent (with `gap` spacing) to both circle (c1, r1) and (c2, r2).
function tangentPoints(c1: XY, r1: number, c2: XY, r2: number, r: number): XY[] {
  const D1 = r1 + r + GAP;
  const D2 = r2 + r + GAP;
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d < 1e-6 || d > D1 + D2 + 1e-4 || d < Math.abs(D1 - D2) - 1e-4) return [];

  const a = (D1 * D1 - D2 * D2 + d * d) / (2 * d);
  const h2 = Math.max(0, D1 * D1 - a * a);
  const h = Math.sqrt(h2);
  const mx = c1.x + (a * dx) / d;
  const my = c1.y + (a * dy) / d;

  if (h < 1e-4) return [{ x: mx, y: my }];
  return [
    { x: mx + (h * dy) / d, y: my - (h * dx) / d },
    { x: mx - (h * dy) / d, y: my + (h * dx) / d },
  ];
}

// Greedy circle packing: place each circle tangent to two existing ones,
// choosing the candidate closest to the origin.
function packCircles(radii: number[]): XY[] {
  if (radii.length === 0) return [];
  if (radii.length === 1) return [{ x: 0, y: 0 }];

  const placed: XY[] = [
    { x: 0, y: 0 },
    { x: radii[0] + radii[1] + GAP, y: 0 },
  ];

  for (let i = 2; i < radii.length; i++) {
    const ri = radii[i];
    let best: XY | null = null;
    let bestDist = Infinity;

    for (let a = 0; a < placed.length; a++) {
      for (let b = a + 1; b < placed.length; b++) {
        const candidates = tangentPoints(placed[a], radii[a], placed[b], radii[b], ri);
        for (const c of candidates) {
          const noOverlap = placed.every((p, k) => {
            const dd = Math.sqrt((c.x - p.x) ** 2 + (c.y - p.y) ** 2);
            return dd >= radii[k] + ri + GAP - 0.5;
          });
          if (!noOverlap) continue;

          const dist = Math.sqrt(c.x * c.x + c.y * c.y);
          if (dist < bestDist) {
            bestDist = dist;
            best = c;
          }
        }
      }
    }

    // Fallback: place tangent to the nearest already-placed circle, pointing inward
    if (!best) {
      let nearIdx = 0;
      let nearDist = Infinity;
      placed.forEach((p, k) => {
        const d = Math.sqrt(p.x * p.x + p.y * p.y);
        if (d < nearDist) { nearDist = d; nearIdx = k; }
      });
      const p = placed[nearIdx];
      const angle = Math.atan2(-p.y, -p.x);
      best = {
        x: p.x + (radii[nearIdx] + ri + GAP) * Math.cos(angle),
        y: p.y + (radii[nearIdx] + ri + GAP) * Math.sin(angle),
      };
    }

    placed.push(best!);
  }

  return placed;
}

interface BubblePos extends ThemeItem {
  left: number;
  top: number;
  diameter: number;
}

// Rank-based sizing: index 0 (most frequent) → MAX, index n-1 → MIN.
// This guarantees visible size differences even when all counts are equal.
function rankDiameter(rank: number, total: number): number {
  const t = total > 1 ? rank / (total - 1) : 0;
  return Math.round(MAX_BUBBLE_SIZE - t * (MAX_BUBBLE_SIZE - MIN_BUBBLE_SIZE));
}

function computeLayout(
  themes: ThemeItem[],
  containerWidth: number
): { positions: BubblePos[]; height: number } {
  const n = themes.length;
  const radii = themes.map((_, i) => rankDiameter(i, n) / 2);
  const centers = packCircles(radii);

  // Bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  centers.forEach((c, i) => {
    minX = Math.min(minX, c.x - radii[i]);
    minY = Math.min(minY, c.y - radii[i]);
    maxX = Math.max(maxX, c.x + radii[i]);
    maxY = Math.max(maxY, c.y + radii[i]);
  });

  const PAD = 20;
  const cloudW = maxX - minX;
  const cloudH = maxY - minY;
  const containerHeight = cloudH + PAD * 2;

  // Center the cloud horizontally in the container
  const ox = (containerWidth - cloudW) / 2 - minX;
  const oy = PAD - minY;

  const positions: BubblePos[] = centers.map((c, i) => ({
    left: c.x + ox - radii[i],
    top: c.y + oy - radii[i],
    diameter: radii[i] * 2,
    ...themes[i],
  }));

  return { positions, height: containerHeight };
}

interface Props {
  themes: ThemeItem[];
  onBubblePress: (theme: string) => void;
}

export default function ThemeCloud({ themes, onBubblePress }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);

  const { positions, height } = useMemo(
    () =>
      containerWidth > 0
        ? computeLayout(themes, containerWidth)
        : { positions: [], height: 0 },
    [themes, containerWidth]
  );

  return (
    <View
      style={{ width: "100%", height: height || undefined }}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {positions.map((pos) => (
        <View key={pos.theme} style={{ position: "absolute", left: pos.left, top: pos.top }}>
          <ThemeBubble
            label={pos.theme}
            size={pos.diameter}
            colorScheme={BUBBLE_PALETTE[pos.colorIndex]}
            onPress={() => onBubblePress(pos.theme)}
          />
        </View>
      ))}
    </View>
  );
}

import React, { useState, useMemo, useRef } from "react";
import { View, Text, ScrollView, Pressable, PanResponder, StyleSheet, Platform } from "react-native";
import { Colors, Fonts, Shadow } from "../theme";
import InsightCard from "../components/InsightCard";
import AICard from "../components/AICard";

const DAYS_PAST = 90;
const DAYS_FUTURE = 14;
const TODAY_INDEX = DAYS_PAST;
const TOTAL_DAYS = DAYS_PAST + 1 + DAYS_FUTURE;

function buildDates(): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - DAYS_PAST + i);
    return d;
  });
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function dayHeading(date: Date, isToday: boolean): string {
  if (isToday) return greeting();
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

interface Props {
  onGoToAnalytics: () => void;
  onGoToAI: () => void;
  onNewCheckIn: (date: Date) => void;
  onManageRelationships: () => void;
}

export default function HomeScreen({ onGoToAnalytics, onGoToAI, onNewCheckIn, onManageRelationships }: Props) {
  const [index, setIndex] = useState(TODAY_INDEX);
  const dates = useMemo(() => buildDates(), []);
  const date = dates[index];
  const isToday = index === TODAY_INDEX;
  const future = isFutureDate(date);

  function goBack() { setIndex((i) => Math.max(0, i - 1)); }
  function goForward() { setIndex((i) => Math.min(TOTAL_DAYS - 1, i + 1)); }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy),
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -40) goForward();
        else if (dx > 40) goBack();
      },
    })
  ).current;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      {...(Platform.OS !== "web" ? panResponder.panHandlers : {})}
    >
      {/* Date navigation heading */}
      <View style={styles.headingBlock}>
        <View style={styles.headingRow}>
          <Pressable onPress={goBack} disabled={index === 0} hitSlop={12}>
            <Text style={[styles.arrow, index === 0 && styles.arrowDisabled]}>‹</Text>
          </Pressable>

          <View style={styles.headingCenter}>
            <Text style={styles.heading}>{dayHeading(date, isToday)}.</Text>
            {isToday && (
              <Text style={styles.date}>
                {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </Text>
            )}
          </View>

          <Pressable onPress={goForward} disabled={index === TOTAL_DAYS - 1} hitSlop={12}>
            <Text style={[styles.arrow, index === TOTAL_DAYS - 1 && styles.arrowDisabled]}>›</Text>
          </Pressable>
        </View>

        {!isToday && (
          <Pressable onPress={() => setIndex(TODAY_INDEX)} style={styles.todayLink}>
            <Text style={styles.todayLinkText}>Back to today</Text>
          </Pressable>
        )}
      </View>

      {/* Check-in button */}
      {!future && (
        <View style={styles.checkInSection}>
          <Pressable
            onPress={() => onNewCheckIn(date)}
            style={({ pressed, hovered }: any) => [
              styles.checkInButton,
              hovered && styles.checkInButtonHovered,
              pressed && styles.checkInButtonPressed,
            ]}
          >
            <Text style={styles.checkInPlus}>+</Text>
          </Pressable>
          <Text style={styles.checkInLabel}>
            {isToday ? "Log today" : "Log this day"}
          </Text>
        </View>
      )}

      {/* Relationships row */}
      <Pressable
        onPress={onManageRelationships}
        style={({ pressed, hovered }: any) => [
          styles.relationshipsRow,
          hovered && styles.relationshipsRowHovered,
          pressed && styles.relationshipsRowPressed,
        ]}
      >
        <Text style={styles.relationshipsLabel}>People</Text>
        <Text style={styles.relationshipsArrow}>→</Text>
      </Pressable>

      {!future && <InsightCard onPress={onGoToAnalytics} />}
      <AICard onPress={onGoToAI} />
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
    paddingTop: 24,
    paddingBottom: 48,
    gap: 14,
  },
  headingBlock: {
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headingCenter: {
    flex: 1,
  },
  heading: {
    fontSize: 30,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  date: {
    fontSize: 13,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    marginTop: 4,
  },
  arrow: {
    fontSize: 32,
    color: Colors.textSecondary,
    lineHeight: 36,
    width: 24,
    textAlign: "center",
  },
  arrowDisabled: {
    color: Colors.border,
  },
  todayLink: {
    marginTop: 8,
  },
  todayLinkText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.primaryDark,
  },
  checkInSection: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  checkInButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.card,
  },
  checkInButtonHovered: {
    backgroundColor: Colors.primaryDark,
  },
  checkInButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.95 }],
  },
  checkInPlus: {
    fontSize: 36,
    color: Colors.background,
    lineHeight: 40,
    fontFamily: Fonts.sansLight,
    marginTop: -2,
  },
  checkInLabel: {
    fontSize: 13,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  relationshipsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  relationshipsRowHovered: {
    backgroundColor: Colors.accentSubtle,
  },
  relationshipsRowPressed: {
    backgroundColor: Colors.accentSubtle,
    opacity: 0.8,
  },
  relationshipsLabel: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.accent,
  },
  relationshipsArrow: {
    fontSize: 15,
    color: Colors.accent,
    fontFamily: Fonts.sans,
  },
});

import React, { useState, useMemo, useRef } from "react";
import { View, Text, ScrollView, Pressable, PanResponder, StyleSheet, Platform } from "react-native";
import { Colors, Fonts } from "../theme";
import CheckInCard from "../components/CheckInCard";
import InsightCard from "../components/InsightCard";
import JournalCard from "../components/JournalCard";
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
  onContinue: (level: number) => void;
  onGoToAnalytics: () => void;
  onGoToJournal: () => void;
  onGoToNewJournal: () => void;
  onGoToAI: () => void;
}

export default function HomeScreen({ onContinue, onGoToAnalytics, onGoToJournal, onGoToNewJournal, onGoToAI }: Props) {
  const [index, setIndex] = useState(TODAY_INDEX);
  const dates = useMemo(() => buildDates(), []);
  const date = dates[index];
  const isToday = index === TODAY_INDEX;
  const future = isFutureDate(date);

  function goBack() {
    setIndex((i) => Math.max(0, i - 1));
  }

  function goForward() {
    setIndex((i) => Math.min(TOTAL_DAYS - 1, i + 1));
  }

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

      <CheckInCard onContinue={onContinue} isToday={isToday} />
      {!future && <InsightCard onPress={onGoToAnalytics} />}
      {!future && <JournalCard onPress={onGoToJournal} onNewEntry={onGoToNewJournal} />}
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
});

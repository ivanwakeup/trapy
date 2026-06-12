import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Colors, Fonts } from "../theme";
import CheckInCard from "../components/CheckInCard";
import InsightCard from "../components/InsightCard";
import JournalCard from "../components/JournalCard";
import AICard from "../components/AICard";

interface Props {
  onContinue: (level: number) => void;
  onGoToAnalytics: () => void;
  onGoToJournal: () => void;
  onGoToNewJournal: () => void;
  onGoToAI: () => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen({ onContinue, onGoToAnalytics, onGoToJournal, onGoToNewJournal, onGoToAI }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headingBlock}>
        <Text style={styles.greeting}>{greeting()}.</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <CheckInCard onContinue={onContinue} />
      <InsightCard onPress={onGoToAnalytics} />
      <JournalCard onPress={onGoToJournal} onNewEntry={onGoToNewJournal} />
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
  greeting: {
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
});

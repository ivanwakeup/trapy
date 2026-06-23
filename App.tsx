import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import { AuthProvider, useAuth } from "./src/lib/AuthContext";
import AuthScreen from "./src/screens/AuthScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ChoiceScreen from "./src/screens/ChoiceScreen";
import ReflectScreen from "./src/screens/ReflectScreen";
import ReframeScreen from "./src/screens/ReframeScreen";
import CalmDownScreen from "./src/screens/CalmDownScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import JournalEditorScreen from "./src/screens/JournalEditorScreen";
import CheckInScreen from "./src/screens/CheckInScreen";
import RelationshipsScreen from "./src/screens/RelationshipsScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import AIScreen from "./src/screens/AIScreen";
import { supabase } from "./src/lib/supabase";
import { CheckInEntry } from "./src/types";
import { Colors, Fonts } from "./src/theme";

type AppScreen =
  | { screen: "home" }
  | { screen: "onboarding" }
  | { screen: "analytics" }
  | { screen: "checkin"; date: Date }
  | { screen: "relationships" }
  | { screen: "journal-editor"; entryId?: string; checkinId?: string }
  | { screen: "ai" }
  | { screen: "choice"; activationLevel: number }
  | { screen: "reflect"; activationLevel: number; showReframeAfter: boolean }
  | { screen: "reframe"; entry: CheckInEntry }
  | { screen: "calmdown" };

const DRAWER_WIDTH = 240;

function headerTitle(current: AppScreen): string {
  switch (current.screen) {
    case "home": return "trapy";
    case "analytics": return "Analytics";
    case "reflect": return "Reflect";
    default: return "";
  }
}

function showHeader(current: AppScreen): boolean {
  return (
    current.screen === "home" ||
    current.screen === "analytics" ||
    current.screen === "reflect"
    // "ai", "checkin", "relationships", "onboarding" manage their own top bars
  );
}


function MainApp() {
  const { signOut, user } = useAuth();
  const [current, setCurrent] = useState<AppScreen>({ screen: "home" });

  // Check for relationships on first load — send new users to onboarding
  useEffect(() => {
    supabase
      .from("relationships")
      .select("id")
      .eq("user_id", user!.id)
      .limit(1)
      .then(({ data }) => {
        if (!data?.length) setCurrent({ screen: "onboarding" });
      });
  }, []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }

  function closeDrawer() {
    Animated.timing(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  }

  function navigateTo(screen: AppScreen) {
    setCurrent(screen);
    closeDrawer();
  }

  function renderScreen() {
    switch (current.screen) {
      case "onboarding":
        return (
          <OnboardingScreen onDone={() => setCurrent({ screen: "home" })} />
        );
      case "home":
        return (
          <HomeScreen
            onGoToAnalytics={() => setCurrent({ screen: "analytics" })}
            onGoToAI={() => setCurrent({ screen: "ai" })}
            onNewCheckIn={(date) => setCurrent({ screen: "checkin", date })}
            onManageRelationships={() => setCurrent({ screen: "relationships" })}
          />
        );
      case "choice":
        return (
          <ChoiceScreen
            activationLevel={current.activationLevel}
            onReflect={() =>
              setCurrent({
                screen: "reflect",
                activationLevel: current.activationLevel,
                showReframeAfter: true,
              })
            }
            onCalmDown={() => setCurrent({ screen: "calmdown" })}
          />
        );
      case "reflect":
        return (
          <ReflectScreen
            activationLevel={current.activationLevel}
            showReframeAfter={current.showReframeAfter}
            onSaved={(entry) => {
              if (current.showReframeAfter) {
                setCurrent({ screen: "reframe", entry });
              } else {
                setCurrent({ screen: "home" });
              }
            }}
            onJournal={(checkinId) =>
              setCurrent({ screen: "journal-editor", checkinId })
            }
          />
        );
      case "reframe":
        return (
          <ReframeScreen
            entry={current.entry}
            onDone={() => setCurrent({ screen: "home" })}
            onJournal={(checkinId) =>
              setCurrent({ screen: "journal-editor", checkinId })
            }
          />
        );
      case "calmdown":
        return <CalmDownScreen onDone={() => setCurrent({ screen: "home" })} />;
      case "checkin":
        return (
          <CheckInScreen
            date={current.date}
            onSaved={() => setCurrent({ screen: "home" })}
            onBack={() => setCurrent({ screen: "home" })}
          />
        );
      case "relationships":
        return (
          <RelationshipsScreen onBack={() => setCurrent({ screen: "home" })} />
        );
      case "analytics":
        return (
          <AnalyticsScreen
            focused
            onEditEntry={(entryId) => setCurrent({ screen: "journal-editor", entryId })}
          />
        );
      case "journal-editor":
        return (
          <JournalEditorScreen
            entryId={current.entryId}
            checkinId={current.checkinId}
            onSaved={() => setCurrent({ screen: "analytics" })}
            onBack={() => setCurrent({ screen: "analytics" })}
          />
        );
      case "ai":
        return <AIScreen onOpenDrawer={openDrawer} />;
    }
  }

  const drawerItems: { label: string; target: AppScreen }[] = [
    { label: "Home", target: { screen: "home" } },
    { label: "My People", target: { screen: "relationships" } },
    { label: "AI", target: { screen: "ai" } },
    { label: "Analytics", target: { screen: "analytics" } },
  ];

  const activeDrawerItem =
    current.screen === "analytics"
      ? "Analytics"
      : current.screen === "ai"
      ? "AI"
      : current.screen === "relationships"
      ? "My People"
      : "Home";

  return (
    <SafeAreaView style={styles.root}>
      {showHeader(current) && (
        <View style={styles.header}>
          <Pressable onPress={openDrawer} style={styles.hamburger} hitSlop={12}>
            <View style={styles.bar} />
            <View style={styles.bar} />
            <View style={styles.bar} />
          </Pressable>
          <Text style={styles.headerTitle}>{headerTitle(current)}</Text>
          <View style={styles.hamburger} />
        </View>
      )}

      <View style={styles.content}>{renderScreen()}</View>

      {drawerOpen && (
        <Pressable style={styles.overlay} onPress={closeDrawer} />
      )}

      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
      >
        <Text style={styles.drawerTitle}>trapy</Text>
        {drawerItems.map(({ label, target }) => (
          <Pressable
            key={label}
            onPress={() => navigateTo(target)}
            style={({ pressed, hovered }: any) => [
              styles.drawerItem,
              activeDrawerItem === label && styles.drawerItemActive,
              hovered && activeDrawerItem !== label && styles.drawerItemHovered,
              pressed && styles.drawerItemPressed,
            ]}
          >
            <Text
              style={[
                styles.drawerItemText,
                activeDrawerItem === label && styles.drawerItemTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
        <View style={styles.drawerFooter}>
          <Pressable onPress={signOut}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function AppGate() {
  const { authState } = useAuth();

  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  if (!fontsLoaded || authState === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (authState === "unauthenticated") {
    return <AuthScreen />;
  }

  return <MainApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <View style={styles.webOuter}>
        <AppGate />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  webOuter: {
    flex: 1,
    backgroundColor: Colors.background,
    ...Platform.select({
      web: { alignItems: "center" as const },
      default: {},
    }),
  },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    width: "100%",
    ...Platform.select({
      web: { maxWidth: 720, overflow: "hidden" as const },
      default: {},
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  hamburger: {
    width: 28,
    gap: 5,
    paddingVertical: 4,
  },
  bar: {
    height: 1.5,
    backgroundColor: Colors.textPrimary,
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(28, 51, 48, 0.2)",
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Colors.surface,
    paddingTop: 64,
    paddingHorizontal: 24,
    zIndex: 20,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  drawerTitle: {
    fontSize: 26,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    marginBottom: 36,
    letterSpacing: 0.5,
  },
  drawerItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  drawerItemActive: {
    backgroundColor: Colors.primaryLight,
  },
  drawerItemHovered: {
    backgroundColor: Colors.surfaceHover,
  },
  drawerItemPressed: {
    backgroundColor: Colors.surfacePressed,
  },
  drawerItemText: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  drawerItemTextActive: {
    fontFamily: Fonts.sansMedium,
    color: Colors.primaryDark,
  },
  drawerFooter: {
    position: "absolute",
    bottom: 40,
    left: 24,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
});

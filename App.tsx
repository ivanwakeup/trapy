import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import CheckInScreen from "./src/screens/CheckInScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";

type Screen = "Check In" | "Analytics";
const SCREENS: Screen[] = ["Check In", "Analytics"];
const DRAWER_WIDTH = 240;

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>("Check In");
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

  function navigate(screen: Screen) {
    setActiveScreen(screen);
    closeDrawer();
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={openDrawer} style={styles.hamburger} hitSlop={12}>
          <View style={styles.bar} />
          <View style={styles.bar} />
          <View style={styles.bar} />
        </Pressable>
        <Text style={styles.headerTitle}>{activeScreen}</Text>
        <View style={styles.hamburger} />
      </View>

      {/* Screen content */}
      <View style={styles.content}>
        {activeScreen === "Check In" && <CheckInScreen />}
        {activeScreen === "Analytics" && (
          <AnalyticsScreen focused={activeScreen === "Analytics"} />
        )}
      </View>

      {/* Drawer overlay */}
      {drawerOpen && (
        <Pressable style={styles.overlay} onPress={closeDrawer} />
      )}

      {/* Drawer */}
      <Animated.View
        style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}
      >
        <Text style={styles.drawerTitle}>trapy</Text>
        {SCREENS.map((screen) => (
          <Pressable
            key={screen}
            onPress={() => navigate(screen)}
            style={[
              styles.drawerItem,
              activeScreen === screen && styles.drawerItemActive,
            ]}
          >
            <Text
              style={[
                styles.drawerItemText,
                activeScreen === screen && styles.drawerItemTextActive,
              ]}
            >
              {screen}
            </Text>
          </Pressable>
        ))}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAF9F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  hamburger: {
    width: 32,
    gap: 5,
    paddingVertical: 4,
  },
  bar: {
    height: 2,
    backgroundColor: "#1F2937",
    borderRadius: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: "#FAF9F7",
    paddingTop: 60,
    paddingHorizontal: 20,
    zIndex: 20,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#7C3AED",
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  drawerItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: "#F3F0FF",
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  drawerItemTextActive: {
    color: "#7C3AED",
    fontWeight: "600",
  },
});

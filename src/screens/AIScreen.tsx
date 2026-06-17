import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { AIMessage } from "../types";
import { Colors, Fonts } from "../theme";

type Persona = "compassionate" | "direct" | "socratic";

const PERSONAS: { key: Persona; label: string; description: string }[] = [
  { key: "compassionate", label: "Compassionate", description: "Warm, validates first, explores gently" },
  { key: "direct", label: "Direct", description: "Names patterns clearly, no over-validation" },
  { key: "socratic", label: "Socratic", description: "Mostly questions, guides you to insight" },
];

const PERSONA_STORAGE_KEY = "ai_persona";

const FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/chat-with-ai`;

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i - 1) * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={typingStyles.bubble}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[typingStyles.dot, { opacity: dot }]}
        />
      ))}
    </View>
  );
}

const typingStyles = StyleSheet.create({
  bubble: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 5,
    marginHorizontal: 16,
    marginTop: 4,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
});

interface Props {
  onOpenDrawer: () => void;
}

export default function AIScreen({ onOpenDrawer }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [persona, setPersona] = useState<Persona>("compassionate");
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(PERSONA_STORAGE_KEY).then((saved) => {
      if (saved === "compassionate" || saved === "direct" || saved === "socratic") {
        setPersona(saved);
      }
    });
    loadMostRecentConversation();
  }, []);

  async function handlePersonaChange(next: Persona) {
    setPersona(next);
    await AsyncStorage.setItem(PERSONA_STORAGE_KEY, next);
  }

  async function loadMostRecentConversation() {
    const { data: conv } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (conv) {
      setConversationId(conv.id);
      const { data: msgs } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });

      setMessages(
        (msgs ?? []).map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        }))
      );
    }
    setInitializing(false);
  }

  async function handleNewConversation() {
    setConversationId(null);
    setMessages([]);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const optimisticMsg: AIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: text,
          user_id: user!.id,
          persona,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Unknown error");

      if (!conversationId) setConversationId(data.conversation_id);

      const assistantMsg: AIMessage = {
        id: Date.now().toString() + "-ai",
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-err",
          role: "assistant",
          content: "Something went wrong. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <Pressable onPress={onOpenDrawer} style={styles.hamburger} hitSlop={12}>
          <View style={styles.bar} />
          <View style={styles.bar} />
          <View style={styles.bar} />
        </Pressable>
        <Text style={styles.topBarTitle}>AI</Text>
        <Pressable onPress={handleNewConversation} hitSlop={12}>
          <Text style={styles.newConvLink}>New conversation</Text>
        </Pressable>
      </View>

      <View style={styles.personaRow}>
        {PERSONAS.map((p) => (
          <Pressable
            key={p.key}
            style={[styles.personaPill, persona === p.key && styles.personaPillActive]}
            onPress={() => handlePersonaChange(p.key)}
          >
            <Text style={[styles.personaPillText, persona === p.key && styles.personaPillTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>What's on your mind?</Text>
          <Text style={styles.emptySubtitle}>I've read your journal. I'm here.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.bubbleUser : styles.bubbleAI,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.role === "user" ? styles.bubbleTextUser : styles.bubbleTextAI,
                ]}
              >
                {item.content}
              </Text>
            </View>
          )}
        />
      )}

      {loading && <TypingIndicator />}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Say something..."
          placeholderTextColor={Colors.textMuted}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit
        />
        <Pressable
          style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
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
  topBarTitle: {
    fontSize: 17,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  newConvLink: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.primaryDark,
  },
  personaRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  personaPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  personaPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  personaPillText: {
    fontSize: 12,
    fontFamily: Fonts.sansMedium,
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  personaPillTextActive: {
    color: Colors.primary,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  emptyTitle: {
    fontSize: 26,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    textAlign: "center",
  },
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    alignSelf: "flex-start",
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    fontFamily: Fonts.sans,
    color: Colors.surface,
  },
  bubbleTextAI: {
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.surface,
  },
});

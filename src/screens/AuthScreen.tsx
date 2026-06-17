import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "../lib/supabase";
import { Colors, Fonts } from "../theme";

type Step = "email" | "otp";

export default function AuthScreen() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken!,
      });
      if (error) setError(error.message);
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") {
        setError("Apple sign in failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
      startResendCooldown();
    }
  }

  async function handleVerify() {
    if (code.length !== 8) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    }
    // on success, AuthContext's onAuthStateChange fires and routes to Home
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      startResendCooldown();
    }
  }

  function startResendCooldown() {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.wordmark}>trapy</Text>

        {step === "email" && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={16}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        {step === "email" && (
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        {step === "email" && (
          <>
            <Text style={styles.prompt}>Enter your email to get started.</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSendCode}
              returnKeyType="done"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.surface} />
                : <Text style={styles.buttonText}>Send code</Text>
              }
            </Pressable>
          </>
        )}

        {step === "otp" && (
          <>
            <Text style={styles.prompt}>
              We sent a code to{" "}
              <Text style={styles.emailHighlight}>{email}</Text>.
            </Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 8))}
              placeholder="8-digit code"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              onSubmitEditing={handleVerify}
              returnKeyType="done"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={Colors.surface} />
                : <Text style={styles.buttonText}>Verify</Text>
              }
            </Pressable>
            <View style={styles.secondaryRow}>
              <Pressable onPress={handleResend} disabled={resendCooldown > 0}>
                <Text style={[styles.link, resendCooldown > 0 && styles.linkDisabled]}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </Text>
              </Pressable>
              <Text style={styles.separator}>·</Text>
              <Pressable onPress={() => { setStep("email"); setCode(""); setError(null); }}>
                <Text style={styles.link}>Use a different email</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  wordmark: {
    fontSize: 40,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    marginBottom: 36,
    letterSpacing: 0.5,
  },
  appleButton: {
    width: "100%",
    height: 56,
    marginBottom: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  prompt: {
    fontSize: 17,
    fontFamily: Fonts.sansLight,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 26,
  },
  emailHighlight: {
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  codeInput: {
    letterSpacing: 4,
    fontSize: 20,
    fontFamily: Fonts.sansMedium,
  },
  error: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: "#E05252",
    marginBottom: 12,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 17,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.surface,
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    letterSpacing: 0.3,
  },
  secondaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  separator: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.primaryDark,
  },
  linkDisabled: {
    color: Colors.textMuted,
  },
});

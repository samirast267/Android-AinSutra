import { Stack, useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "@/firebase";

type UStatus = "idle" | "checking" | "invalid" | "available" | "taken";
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [uStatus, setUStatus] = useState<UStatus>("idle");

  // Real-time username check: প্রতিটি letter লেখার পর Firestore এ live দেখে
  useEffect(() => {
    if (mode !== "register") return;
    const u = username.trim().toLowerCase();
    if (!u) {
      setUStatus("idle");
      return;
    }
    if (!USERNAME_RE.test(u)) {
      setUStatus("invalid");
      return;
    }
    setUStatus("checking");
    let unsub: (() => void) | undefined;
    const t = setTimeout(() => {
      unsub = onSnapshot(
        doc(db, "usernames", u),
        (snap) => setUStatus(snap.exists() ? "taken" : "available"),
        () => setUStatus("idle"),
      );
    }, 350);
    return () => {
      clearTimeout(t);
      if (unsub) unsub();
    };
  }, [username, mode]);

  async function onRegister() {
    const u = username.trim().toLowerCase();
    if (!name.trim() || !u || !email.trim() || !password) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    if (!USERNAME_RE.test(u)) {
      Alert.alert(
        "Invalid username",
        "Use 3-20 characters: a-z, 0-9 and underscore.",
      );
      return;
    }
    if (uStatus === "taken") {
      Alert.alert("Username taken", "Please choose another username.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    setBusy(true);
    let created: any = null;
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      created = cred.user;
      // username কে অন্য কেউ আগে নিলে transaction fail করবে
      await runTransaction(db, async (tx) => {
        const uref = doc(db, "usernames", u);
        const snap = await tx.get(uref);
        if (snap.exists()) throw new Error("USERNAME_TAKEN");
        tx.set(uref, { uid: cred.user.uid, createdAt: serverTimestamp() });
        tx.set(doc(db, "users", cred.user.uid), {
          name: name.trim(),
          username: u,
          email: email.trim(),
          phoneVerified: false,
          createdAt: serverTimestamp(),
        });
      });
      await updateProfile(cred.user, { displayName: name.trim() });
      await sendEmailVerification(cred.user);
      Alert.alert(
        "Registered",
        "A verification link was sent to your email. Check Inbox/Spam.",
      );
      router.replace("/profile" as any);
    } catch (e: any) {
      if (created) {
        try {
          await deleteUser(created);
        } catch {}
      }
      if (e?.message === "USERNAME_TAKEN")
        Alert.alert("Username taken", "Please choose another username.");
      else if (e?.code === "auth/email-already-in-use")
        Alert.alert("Error", "This email is already registered.");
      else Alert.alert("Error", e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/profile" as any);
    } catch (e: any) {
      Alert.alert("Login failed", "Wrong email or password.");
    } finally {
      setBusy(false);
    }
  }

  async function onForgot() {
    if (!email.trim()) {
      Alert.alert(
        "Enter email",
        "Type your email first, then tap Forgot Password.",
      );
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Sent", "Password reset link sent to your email.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not send");
    }
  }

  const statusText: Record<UStatus, string> = {
    idle: "",
    checking: "Checking...",
    invalid: "3-20 chars: a-z, 0-9, _ only",
    available: "Username is available ✓",
    taken: "Username is already taken ✗",
  };
  const statusColor =
    uStatus === "available"
      ? "#16a34a"
      : uStatus === "taken" || uStatus === "invalid"
        ? "#dc2626"
        : "#6b7280";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <Stack.Screen
        options={{ title: mode === "login" ? "Login" : "Register" }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>AinSutra</Text>
          <Text style={styles.sub}>
            {mode === "login"
              ? "Log in to your account"
              : "Create a new account"}
          </Text>

          {mode === "register" && (
            <>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="e.g. samira_01"
                placeholderTextColor="#9ca3af"
              />
              <View style={styles.statusRow}>
                {uStatus === "checking" && <ActivityIndicator size="small" />}
                <Text style={{ color: statusColor, marginLeft: 6 }}>
                  {statusText[uStatus]}
                </Text>
              </View>
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
            placeholderTextColor="#9ca3af"
          />
          {mode === "register" && (
            <>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                placeholder="Repeat password"
                placeholderTextColor="#9ca3af"
              />
            </>
          )}

          <Pressable
            style={[styles.btn, busy && { opacity: 0.6 }]}
            disabled={busy}
            onPress={mode === "login" ? onLogin : onRegister}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>
                {mode === "login" ? "Log In" : "Register"}
              </Text>
            )}
          </Pressable>

          {mode === "login" && (
            <Pressable onPress={onForgot}>
              <Text style={styles.link}>Forgot Password?</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setMode(mode === "login" ? "register" : "login")}
          >
            <Text style={styles.link}>
              {mode === "login"
                ? "Don't have an account? Register"
                : "Already have an account? Log In"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  container: { padding: 20 },
  title: { fontSize: 30, fontWeight: "800", color: "#111827", marginTop: 8 },
  sub: { color: "#6b7280", marginBottom: 16 },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: "600",
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    color: "#111827",
    backgroundColor: "#fff",
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  btn: {
    backgroundColor: "#1d4ed8",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { color: "#1d4ed8", textAlign: "center", marginTop: 16 },
});

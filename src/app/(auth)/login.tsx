import { auth } from "@/firebase";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/email-already-in-use":
      return "This email address is already registered.";
    case "auth/weak-password":
      return "Password must be at least 6 characters long.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "No internet connection.";
    default:
      return "Something went wrong. Please try again. (" + code + ")";
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = (): string => {
    if (isRegister && name.trim().length < 2) return "Enter your name.";
    if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (isRegister && password !== confirm) return "Passwords do not match.";
    return "";
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await updateProfile(cred.user, { displayName: name.trim() });
        await sendEmailVerification(cred.user);
        Alert.alert(
          "Account created successfully!",
          "A verification link has been sent to your email address. Please check your inbox and spam folder.",
        );
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      router.replace("/");
    } catch (e: any) {
      setError(friendlyError(e?.code ?? "unknown"));
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError(
        'Enter your email address above first, then tap "Forgot Password?"',
      );
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        "Request sent successfully!",
        "A password reset link has been sent to your email address.",
      );
    } catch (e: any) {
      setError(friendlyError(e?.code ?? "unknown"));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>AinSutra</Text>
        <Text style={styles.subtitle}>
          {isRegister ? "Create a New Account" : "Log In"}
        </Text>

        {isRegister && (
          <>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Full Name"
              value={name}
              onChangeText={setName}
            />
          </>
        )}

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="example@gmail.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.pwRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowPw(!showPw)}
            style={styles.eye}
          >
            <Text style={{ color: "#1e3a8a", fontWeight: "600" }}>
              {showPw ? "Hide" : "Show"}
            </Text>
          </TouchableOpacity>
        </View>

        {isRegister && (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>
              Re-enter Password
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Passwords must match"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPw}
              autoCapitalize="none"
            />
          </>
        )}

        {error !== "" && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.button}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isRegister ? "Register" : "Log In"}
            </Text>
          )}
        </TouchableOpacity>

        {!isRegister && (
          <TouchableOpacity onPress={forgotPassword}>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
        >
          <Text style={styles.link}>
            {isRegister
              ? "Already have an account? Log In"
              : "Don't have an account? Register"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    color: "#1e3a8a",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 24,
    marginTop: 4,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#222" },
  input: {
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 14,
  },
  pwRow: { flexDirection: "row", alignItems: "center" },
  eye: { paddingHorizontal: 12 },
  error: { color: "#b91c1c", marginBottom: 10, marginTop: 6 },
  button: {
    backgroundColor: "#1e3a8a",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: {
    textAlign: "center",
    color: "#1e3a8a",
    marginTop: 16,
    fontWeight: "600",
  },
});

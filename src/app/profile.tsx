import { Stack, useRouter } from "expo-router";
import { sendEmailVerification, signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth-context";
import { API_URL } from "@/config";
import { auth, db } from "@/firebase";

function b64urlDecode(s: string) {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const bin = (globalThis as any).atob(b);
  try {
    return decodeURIComponent(
      bin
        .split("")
        .map((c: string) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
  } catch {
    return bin;
  }
}

async function api(path: string, method: "GET" | "POST", body?: any) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const token = await user.getIdToken(true);
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data.error || data.message || `Server error ${res.status}`);
  return data;
}

export default function ProfileScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [, setTick] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneOk, setPhoneOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [jwtText, setJwtText] = useState("");
  const [serverText, setServerText] = useState("");

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "My Profile" }} />
        <View style={styles.container}>
          <Text style={styles.h}>You are not logged in</Text>
          <Pressable
            style={styles.btn}
            onPress={() => router.push("/login" as any)}
          >
            <Text style={styles.btnText}>Go to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  async function refresh() {
    try {
      await user!.reload();
      setTick((t) => t + 1);
      Alert.alert(
        "Refreshed",
        user!.emailVerified
          ? "Email is verified ✓"
          : "Email is not verified yet.",
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    }
  }

  async function resend() {
    try {
      await sendEmailVerification(user!);
      Alert.alert("Sent", "Verification email sent again. Check Inbox/Spam.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed (try again after a minute)");
    }
  }

  async function sendOtp() {
    setBusy(true);
    try {
      const data = await api("/api/phone/send-otp", "POST", {
        phone: phone.trim(),
      });
      setOtpSent(true);
      Alert.alert(
        "OTP sent",
        data.demoSms ? `Demo SMS: ${data.demoSms}` : "Check your phone.",
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    try {
      await api("/api/phone/verify-otp", "POST", {
        phone: phone.trim(),
        code: code.trim(),
        otp: code.trim(),
      });
      setPhoneOk(true);
      try {
        await updateDoc(doc(db, "users", user!.uid), {
          phone: phone.trim(),
          phoneVerified: true,
        });
      } catch {}
      Alert.alert("Verified", "Phone number verified ✓");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function showJwt() {
    const token = await user!.getIdToken();
    const [h, p] = token.split(".");
    setJwtText(
      "HEADER:\n" +
        JSON.stringify(JSON.parse(b64urlDecode(h)), null, 2) +
        "\n\nPAYLOAD:\n" +
        JSON.stringify(JSON.parse(b64urlDecode(p)), null, 2) +
        "\n\nTOKEN (first 40 chars):\n" +
        token.slice(0, 40) +
        "...",
    );
  }

  async function serverVerify() {
    try {
      const data = await api("/api/me", "GET");
      setServerText(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setServerText("Error: " + (e?.message ?? "failed"));
    }
  }

  async function logout() {
    await signOut(auth);
    router.replace("/login" as any);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "My Profile" }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h}>Account</Text>
        <Text style={styles.row}>Name: {user.displayName ?? "-"}</Text>
        <Text style={styles.row}>Email: {user.email}</Text>
        <Text
          style={[
            styles.row,
            { color: user.emailVerified ? "#16a34a" : "#dc2626" },
          ]}
        >
          Email verified: {user.emailVerified ? "Yes ✓" : "No ✗"}
        </Text>
        {!user.emailVerified && (
          <View style={styles.line}>
            <Pressable style={styles.btnSm} onPress={refresh}>
              <Text style={styles.btnText}>I verified, refresh</Text>
            </Pressable>
            <Pressable
              style={[styles.btnSm, { backgroundColor: "#6b7280" }]}
              onPress={resend}
            >
              <Text style={styles.btnText}>Resend email</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.h}>Phone verification</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="01XXXXXXXXX"
          placeholderTextColor="#9ca3af"
        />
        <Pressable
          style={[styles.btn, busy && { opacity: 0.6 }]}
          disabled={busy}
          onPress={sendOtp}
        >
          <Text style={styles.btnText}>Send OTP</Text>
        </Pressable>
        {otpSent && (
          <>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              placeholder="6-digit OTP"
              placeholderTextColor="#9ca3af"
              maxLength={6}
            />
            <Pressable
              style={[styles.btn, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={verifyOtp}
            >
              <Text style={styles.btnText}>Verify OTP</Text>
            </Pressable>
          </>
        )}
        {phoneOk && (
          <Text style={[styles.row, { color: "#16a34a" }]}>
            Phone verified ✓
          </Text>
        )}

        <Text style={styles.h}>Session / JWT</Text>
        <Pressable style={styles.btn} onPress={showJwt}>
          <Text style={styles.btnText}>Show my JWT</Text>
        </Pressable>
        {!!jwtText && <Text style={styles.mono}>{jwtText}</Text>}
        <Pressable style={styles.btn} onPress={serverVerify}>
          <Text style={styles.btnText}>Verify on server</Text>
        </Pressable>
        {!!serverText && <Text style={styles.mono}>{serverText}</Text>}

        <Pressable
          style={[styles.btn, { backgroundColor: "#dc2626", marginTop: 24 }]}
          onPress={logout}
        >
          <Text style={styles.btnText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ffffff" },
  container: { padding: 20, paddingBottom: 60 },
  h: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginTop: 22,
    marginBottom: 8,
  },
  row: { fontSize: 15, color: "#111827", marginBottom: 4 },
  line: { flexDirection: "row", gap: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    color: "#111827",
    marginTop: 8,
  },
  btn: {
    backgroundColor: "#1d4ed8",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  btnSm: { backgroundColor: "#1d4ed8", padding: 10, borderRadius: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
  mono: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#111827",
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
});

import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth-context";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "@/config";
import { db } from "@/firebase";

type Post = {
  id: string;
  text: string;
  authorName: string;
  authorUid: string;
  imageUrl?: string | null;
  likes: number;
  dislikes: number;
};
type Comment = { id: string; text: string; authorName: string };

// ছবি base64 হিসেবে Cloudinary তে আপলোড হয়, ফেরত আসে secure_url
async function uploadToCloudinary(base64: string): Promise<string> {
  const form = new FormData();
  form.append("file", `data:image/jpeg;base64,${base64}`);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: form,
    },
  );
  const data = await res.json();
  if (!data.secure_url)
    throw new Error(data?.error?.message ?? "Upload failed");
  return data.secure_url;
}

// Like / Dislike: transaction এ count + user এর vote একসাথে বদলায়
async function castVote(postId: string, uid: string, type: "like" | "dislike") {
  const postRef = doc(db, "posts", postId);
  const voteRef = doc(db, "posts", postId, "votes", uid);
  await runTransaction(db, async (tx) => {
    const [postSnap, voteSnap] = await Promise.all([
      tx.get(postRef),
      tx.get(voteRef),
    ]);
    if (!postSnap.exists()) throw new Error("Post not found");
    let likes = postSnap.data().likes ?? 0;
    let dislikes = postSnap.data().dislikes ?? 0;
    const prev: string | null = voteSnap.exists() ? voteSnap.data().type : null;
    if (prev === type) {
      if (type === "like") likes--;
      else dislikes--;
      tx.delete(voteRef);
    } else {
      if (prev === "like") likes--;
      if (prev === "dislike") dislikes--;
      if (type === "like") likes++;
      else dislikes++;
      tx.set(voteRef, { type });
    }
    tx.update(postRef, {
      likes: Math.max(0, likes),
      dislikes: Math.max(0, dislikes),
    });
  });
}

function PostCard({ post }: { post: Post }) {
  const { user, loading } = useAuth();
  const [myVote, setMyVote] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!user) {
      setMyVote(null);
      return;
    }
    return onSnapshot(
      doc(db, "posts", post.id, "votes", user.uid),
      (s) => setMyVote(s.exists() ? s.data().type : null),
      () => {},
    );
  }, [post.id, user]);

  useEffect(() => {
    if (!open) return;
    const q = query(
      collection(db, "posts", post.id, "comments"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      q,
      (snap) =>
        setComments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => {},
    );
  }, [open, post.id]);

  async function vote(type: "like" | "dislike") {
    if (!user) {
      if (loading)
        Alert.alert(
          "Please wait",
          "Checking your login... try again in a few seconds.",
        );
      else Alert.alert("Login required", "Please log in to vote.");
      return;
    }
    try {
      await castVote(post.id, user.uid, type);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    }
  }

  async function addComment() {
    if (!user) {
      if (loading)
        Alert.alert(
          "Please wait",
          "Checking your login... try again in a few seconds.",
        );
      else Alert.alert("Login required", "Please log in to comment.");
      return;
    }
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        text: t,
        authorUid: user.uid,
        authorName: user.displayName || user.email || "User",
        createdAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.author}>{post.authorName}</Text>
      <Text style={styles.body}>{post.text}</Text>
      {!!post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.img}
          resizeMode="cover"
        />
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={() => vote("like")}
          style={[styles.vote, myVote === "like" && styles.voteOn]}
        >
          <Text style={styles.voteText}>👍 {post.likes ?? 0}</Text>
        </Pressable>
        <Pressable
          onPress={() => vote("dislike")}
          style={[styles.vote, myVote === "dislike" && styles.voteOnRed]}
        >
          <Text style={styles.voteText}>👎 {post.dislikes ?? 0}</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(!open)} style={styles.vote}>
          <Text style={styles.voteText}>💬 Comments</Text>
        </Pressable>
      </View>
      {open && (
        <View style={{ marginTop: 8 }}>
          {comments.length === 0 && (
            <Text style={styles.muted}>No comments yet.</Text>
          )}
          {comments.map((c) => (
            <View key={c.id} style={styles.comment}>
              <Text style={styles.cAuthor}>{c.authorName}</Text>
              <Text style={styles.cText}>{c.text}</Text>
            </View>
          ))}
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={text}
              onChangeText={setText}
              placeholder="Write a comment..."
              placeholderTextColor="#9ca3af"
            />
            <Pressable style={styles.send} onPress={addComment}>
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function CommunityScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoB64, setPhotoB64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(30),
    );
    return onSnapshot(
      q,
      (snap) =>
        setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      (e) => Alert.alert("Error", e.message),
    );
  }, []);

  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.5,
      base64: true,
    });
    if (!r.canceled) {
      setPhoto(r.assets[0].uri);
      setPhotoB64(r.assets[0].base64 ?? null);
    }
  }

  async function submit() {
    if (!user) {
      Alert.alert("Login required", "Please log in first.");
      return;
    }
    if (!text.trim()) {
      Alert.alert("Empty", "Write something first.");
      return;
    }
    setBusy(true);
    try {
      let imageUrl: string | null = null;
      if (photoB64) imageUrl = await uploadToCloudinary(photoB64);
      await addDoc(collection(db, "posts"), {
        text: text.trim(),
        authorUid: user.uid,
        authorName: user.displayName || user.email || "User",
        imageUrl,
        likes: 0,
        dislikes: 0,
        createdAt: serverTimestamp(),
      });
      setText("");
      setPhoto(null);
      setPhotoB64(null);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <View style={styles.card}>
      {user ? (
        <>
          <TextInput
            style={[styles.input, { minHeight: 70 }]}
            value={text}
            onChangeText={setText}
            multiline
            placeholder="Share a legal question or tip..."
            placeholderTextColor="#9ca3af"
          />
          {!!photo && <Image source={{ uri: photo }} style={styles.img} />}
          <View style={styles.row}>
            <Pressable
              style={[styles.send, { backgroundColor: "#6b7280" }]}
              onPress={pick}
            >
              <Text style={styles.sendText}>📷 Photo</Text>
            </Pressable>
            <Pressable
              style={[styles.send, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={submit}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendText}>Post</Text>
              )}
            </Pressable>
          </View>
        </>
      ) : loading ? (
        <Text style={styles.muted}>Checking login...</Text>
      ) : (
        <Pressable onPress={() => router.push("/login" as any)}>
          <Text style={styles.link}>Log in to post, comment and vote</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "Community" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <PostCard post={item} />}
          ListHeaderComponent={header}
          contentContainerStyle={{ padding: 12 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.muted}>No posts yet. Be the first!</Text>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f3f4f6" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  author: { fontWeight: "700", color: "#111827" },
  body: { marginTop: 4, color: "#111827", fontSize: 15 },
  img: { width: "100%", height: 200, borderRadius: 8, marginTop: 8 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  vote: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  voteOn: { backgroundColor: "#bbf7d0" },
  voteOnRed: { backgroundColor: "#fecaca" },
  voteText: { color: "#111827", fontWeight: "600" },
  comment: {
    backgroundColor: "#f9fafb",
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  cAuthor: { fontWeight: "700", fontSize: 12, color: "#374151" },
  cText: { color: "#111827" },
  muted: { color: "#6b7280", textAlign: "center", marginVertical: 8 },
  row: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    color: "#111827",
    backgroundColor: "#fff",
  },
  send: {
    backgroundColor: "#1d4ed8",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sendText: { color: "#fff", fontWeight: "700" },
  link: { color: "#1d4ed8", textAlign: "center", fontWeight: "600" },
});

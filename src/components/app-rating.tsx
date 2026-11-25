import { Ionicons } from "@expo/vector-icons";
import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import tw from "twrnc";

import { useAuth } from "@/auth-context";
import { db } from "@/firebase";

// Interactive real-time rating: সবার rating থেকে average live হিসাব হয়
export default function AppRating() {
  const { user } = useAuth();
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [mine, setMine] = useState(0);

  useEffect(() => {
    return onSnapshot(
      collection(db, "ratings"),
      (snap) => {
        let sum = 0;
        let my = 0;
        snap.forEach((d) => {
          const v = Number(d.data().value) || 0;
          sum += v;
          if (user && d.id === user.uid) my = v;
        });
        setCount(snap.size);
        setAvg(snap.size ? sum / snap.size : 0);
        setMine(my);
      },
      () => {},
    );
  }, [user]);

  async function rate(v: number) {
    if (!user) {
      Alert.alert("Login required", "Please log in to rate.");
      return;
    }
    try {
      await setDoc(doc(db, "ratings", user.uid), {
        value: v,
        uid: user.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    }
  }

  return (
    <View style={tw`bg-[#231810] rounded-2xl p-4 border border-[#3a2a18]`}>
      <Text style={tw`text-[#f3e7cc] text-base font-bold`}>Rate AinSutra</Text>
      <View style={tw`flex-row mt-2`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => rate(n)} style={tw`pr-2`}>
            <Ionicons
              name={n <= mine ? "star" : "star-outline"}
              size={34}
              color="#e8c874"
            />
          </Pressable>
        ))}
      </View>
      <Text style={tw`text-[#a8977d] mt-2`}>
        Average {avg.toFixed(1)} / 5 from {count}{" "}
        {count === 1 ? "rating" : "ratings"}
        {mine ? `  •  Your rating: ${mine}` : ""}
      </Text>
    </View>
  );
}

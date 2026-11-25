import DateTimePicker, {
    DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Stack } from "expo-router";
import {
    addDoc,
    collection,
    onSnapshot,
    query,
    serverTimestamp,
    where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import tw from "twrnc";

import { useAuth } from "@/auth-context";
import { db } from "@/firebase";

const TOPICS = ["Family", "Property", "Labour", "Criminal", "Cyber"];

type Appt = {
  id: string;
  topic: string;
  dateText: string;
  timeText: string;
  note?: string;
};

export default function ConsultScreen() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [showIos, setShowIos] = useState<null | "date" | "time">(null);
  const [list, setList] = useState<Appt[]>([]);

  useEffect(() => {
    if (user?.displayName) setName(user.displayName);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setList([]);
      return;
    }
    const q = query(
      collection(db, "appointments"),
      where("uid", "==", user.uid),
    );
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as any[];
        rows.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
        setList(rows);
      },
      () => {},
    );
  }, [user]);

  function pick(mode: "date" | "time") {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: date,
        mode,
        minimumDate: mode === "date" ? new Date() : undefined,
        is24Hour: false,
        onChange: (_e, d) => {
          if (d) setDate(d);
        },
      });
    } else {
      setShowIos(mode);
    }
  }

  async function save() {
    if (!user) {
      Alert.alert("Login required", "Please log in first.");
      return;
    }
    if (!name.trim()) {
      Alert.alert("Missing", "Enter your name.");
      return;
    }
    try {
      await addDoc(collection(db, "appointments"), {
        uid: user.uid,
        name: name.trim(),
        topic,
        note: note.trim(),
        dateISO: date.toISOString(),
        dateText: date.toDateString(),
        timeText: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: serverTimestamp(),
      });
      setNote("");
      Alert.alert("Booked", "Your consultation request is saved.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed");
    }
  }

  return (
    <ScrollView
      style={tw`flex-1 bg-[#140d08]`}
      contentContainerStyle={tw`p-4 pb-10`}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Book a Consultation" }} />

      <Text style={tw`text-[#e8c874] font-bold mb-1`}>Your name</Text>
      <TextInput
        style={tw`bg-[#231810] text-[#f3e7cc] rounded-xl px-3 py-3 border border-[#3a2a18]`}
        value={name}
        onChangeText={setName}
        placeholder="Full name"
        placeholderTextColor="#8b7a63"
      />

      <Text style={tw`text-[#e8c874] font-bold mt-4 mb-1`}>Topic</Text>
      <View style={tw`flex-row flex-wrap`}>
        {TOPICS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTopic(t)}
            style={tw`px-3 py-2 rounded-full mr-2 mb-2 ${topic === t ? "bg-[#b8862b]" : "bg-[#231810]"}`}
          >
            <Text
              style={tw`${topic === t ? "text-[#140d08] font-bold" : "text-[#e9dcc3]"}`}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={tw`text-[#e8c874] font-bold mt-2 mb-1`}>
        Preferred date and time
      </Text>
      <View style={tw`flex-row`}>
        <Pressable
          onPress={() => pick("date")}
          style={tw`flex-1 bg-[#231810] rounded-xl p-3 mr-2 border border-[#3a2a18]`}
        >
          <Text style={tw`text-[#a8977d] text-xs`}>Date</Text>
          <Text style={tw`text-[#f3e7cc] font-bold mt-1`}>
            {date.toDateString()}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => pick("time")}
          style={tw`flex-1 bg-[#231810] rounded-xl p-3 border border-[#3a2a18]`}
        >
          <Text style={tw`text-[#a8977d] text-xs`}>Time</Text>
          <Text style={tw`text-[#f3e7cc] font-bold mt-1`}>
            {date.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </Pressable>
      </View>
      {Platform.OS !== "android" && showIos && (
        <DateTimePicker
          value={date}
          mode={showIos}
          display="spinner"
          onChange={(_e, d) => {
            if (d) setDate(d);
          }}
        />
      )}

      <Text style={tw`text-[#e8c874] font-bold mt-4 mb-1`}>Short note</Text>
      <TextInput
        style={tw`bg-[#231810] text-[#f3e7cc] rounded-xl px-3 py-3 border border-[#3a2a18] min-h-20`}
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Describe your problem briefly"
        placeholderTextColor="#8b7a63"
      />

      <Pressable
        onPress={save}
        style={tw`bg-[#b8862b] rounded-xl p-4 items-center mt-5`}
      >
        <Text style={tw`text-[#140d08] font-extrabold text-base`}>
          Book Consultation
        </Text>
      </Pressable>

      <Text style={tw`text-[#e8c874] text-lg font-extrabold mt-8 mb-2`}>
        My bookings
      </Text>
      {!user && (
        <Text style={tw`text-[#a8977d]`}>Log in to see your bookings.</Text>
      )}
      {user && list.length === 0 && (
        <Text style={tw`text-[#a8977d]`}>No bookings yet.</Text>
      )}
      {list.map((a) => (
        <View
          key={a.id}
          style={tw`bg-[#231810] rounded-xl p-3 mb-2 border border-[#3a2a18]`}
        >
          <Text style={tw`text-[#f3e7cc] font-bold`}>
            {a.topic} • {a.dateText}, {a.timeText}
          </Text>
          {!!a.note && <Text style={tw`text-[#a8977d] mt-1`}>{a.note}</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

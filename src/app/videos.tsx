import { Stack } from "expo-router";
import { useState } from "react";
import {
    Pressable,
    ScrollView,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import YoutubeIframe from "react-native-youtube-iframe";
import tw from "twrnc";

// ভিডিও বদলাতে চাইলে YouTube লিংকের v= এর পরের ১১ অক্ষরের id এখানে বসাও
const VIDEOS = [
  { id: "gULgbg_M_CM", title: "Legal Aid Directorate (Bangla)" },
  { id: "vVuH1gmw-hY", title: "Right to Free Legal Aid" },
  { id: "fkbL2o5UMw4", title: "Who is eligible for free legal aid" },
];

function extractId(s: string) {
  const t = s.trim();
  const m = t.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(t) ? t : null;
}

export default function VideosScreen() {
  const { width } = useWindowDimensions();
  const [current, setCurrent] = useState(VIDEOS[0]);
  const [link, setLink] = useState("");
  const [playing, setPlaying] = useState(false);
  const w = width - 32;

  function playLink() {
    const id = extractId(link);
    if (!id) return;
    setCurrent({ id, title: "Your video" });
    setPlaying(true);
  }

  return (
    <ScrollView
      style={tw`flex-1 bg-[#140d08]`}
      contentContainerStyle={tw`p-4 pb-10`}
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Legal Awareness Videos" }} />

      <View style={tw`rounded-2xl overflow-hidden bg-black`}>
        <YoutubeIframe
          height={Math.round((w * 9) / 16)}
          width={w}
          videoId={current.id}
          play={playing}
          onChangeState={(s: string) => setPlaying(s === "playing")}
        />
      </View>
      <Text style={tw`text-[#f3e7cc] text-base font-bold mt-3`}>
        {current.title}
      </Text>

      <Text style={tw`text-[#e8c874] text-lg font-extrabold mt-6 mb-2`}>
        More videos
      </Text>
      {VIDEOS.map((v) => (
        <Pressable
          key={v.id}
          onPress={() => {
            setCurrent(v);
            setPlaying(true);
          }}
          style={tw`bg-[#231810] rounded-xl p-3 mb-2 border ${current.id === v.id ? "border-[#e8c874]" : "border-[#3a2a18]"}`}
        >
          <Text style={tw`text-[#f3e7cc] font-semibold`}>{v.title}</Text>
        </Pressable>
      ))}

      <Text style={tw`text-[#e8c874] text-lg font-extrabold mt-6 mb-2`}>
        Play any YouTube link
      </Text>
      <TextInput
        style={tw`bg-[#231810] text-[#f3e7cc] rounded-xl px-3 py-3 border border-[#3a2a18]`}
        value={link}
        onChangeText={setLink}
        autoCapitalize="none"
        placeholder="Paste a YouTube link"
        placeholderTextColor="#8b7a63"
      />
      <Pressable
        onPress={playLink}
        style={tw`bg-[#b8862b] rounded-xl p-3 items-center mt-3`}
      >
        <Text style={tw`text-[#140d08] font-extrabold`}>Play</Text>
      </Pressable>
    </ScrollView>
  );
}

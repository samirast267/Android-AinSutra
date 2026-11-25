import * as Location from "expo-location";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import tw from "twrnc";

const PLACES = [
  { label: "Chattogram Court", q: "Chittagong Court Building" },
  { label: "Supreme Court, Dhaka", q: "Supreme Court of Bangladesh" },
  { label: "Univ. of Chittagong", q: "University of Chittagong" },
];

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [mode, setMode] = useState<"live" | string>("live");
  const [msg, setMsg] = useState("Getting your location...");
  const sub = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setMsg("Location permission denied. Choose a place below.");
        setMode(PLACES[0].q);
        return;
      }
      sub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 20,
        },
        (p) => {
          if (!mounted) return;
          setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
          setMsg("Live location updating");
        },
      );
    })();
    return () => {
      mounted = false;
      sub.current?.remove();
    };
  }, []);

  let query = "";
  if (mode === "live")
    query = coords ? `${coords.lat},${coords.lng}` : PLACES[0].q;
  else query = mode;
  // Google Maps embed শুধু iframe এর ভেতরে চলে, তাই HTML এর মধ্যে iframe বসানো হয়েছে
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#140d08"><iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy"></iframe></body></html>`;

  return (
    <View style={tw`flex-1 bg-[#140d08]`}>
      <Stack.Screen options={{ title: "Legal Aid Map" }} />
      <View style={tw`flex-1`}>
        <WebView
          key={src}
          source={{ html, baseUrl: "https://maps.google.com" }}
          originWhitelist={["*"]}
          style={tw`flex-1`}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
      <View
        style={[tw`p-3 bg-[#140d08]`, { paddingBottom: 12 + insets.bottom }]}
      >
        <Text style={tw`text-[#a8977d] text-xs mb-2`}>
          {coords
            ? `Your location: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}  •  `
            : ""}
          {msg}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            onPress={() => setMode("live")}
            style={tw`px-4 py-2 rounded-full mr-2 ${mode === "live" ? "bg-[#b8862b]" : "bg-[#231810]"}`}
          >
            <Text
              style={tw`${mode === "live" ? "text-[#140d08] font-bold" : "text-[#e9dcc3]"}`}
            >
              My location
            </Text>
          </Pressable>
          {PLACES.map((p) => (
            <Pressable
              key={p.q}
              onPress={() => setMode(p.q)}
              style={tw`px-4 py-2 rounded-full mr-2 ${mode === p.q ? "bg-[#b8862b]" : "bg-[#231810]"}`}
            >
              <Text
                style={tw`${mode === p.q ? "text-[#140d08] font-bold" : "text-[#e9dcc3]"}`}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

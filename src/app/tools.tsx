import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { MotiView } from "moti";
import { Pressable, ScrollView, Text, View } from "react-native";
import tw from "twrnc";

import AppRating from "@/components/app-rating";

const ITEMS = [
  {
    title: "Book a Consultation",
    sub: "Pick a date and time (datepicker)",
    icon: "calendar",
    path: "/consult",
  },
  {
    title: "Legal Awareness Videos",
    sub: "Embedded YouTube videos",
    icon: "logo-youtube",
    path: "/videos",
  },
  {
    title: "Legal Aid Map",
    sub: "Google Maps and your live location",
    icon: "map",
    path: "/map",
  },
  {
    title: "Lawyers via GraphQL",
    sub: "Data loaded through a GraphQL API",
    icon: "git-network",
    path: "/gql-lawyers",
  },
];

export default function ToolsScreen() {
  const router = useRouter();
  return (
    <ScrollView
      style={tw`flex-1 bg-[#140d08]`}
      contentContainerStyle={tw`p-4 pb-10`}
    >
      <Stack.Screen options={{ title: "Legal Tools" }} />

      <MotiView
        from={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 12 } as any}
        style={tw`items-center my-4`}
      >
        <MotiView
          from={{ scale: 1 }}
          animate={{ scale: 1.12 }}
          transition={
            {
              type: "timing",
              duration: 1100,
              loop: true,
              repeatReverse: true,
            } as any
          }
        >
          <Ionicons name="scale" size={64} color="#e8c874" />
        </MotiView>
        <Text style={tw`text-[#e8c874] text-2xl font-extrabold mt-2`}>
          Legal Tools
        </Text>
      </MotiView>

      {ITEMS.map((it, i) => (
        <MotiView
          key={it.title}
          from={{ opacity: 0, translateY: 30 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={
            { type: "timing", duration: 450, delay: 200 + i * 150 } as any
          }
        >
          <Pressable
            onPress={() => router.push(it.path as any)}
            style={tw`flex-row items-center bg-[#231810] rounded-2xl p-4 mb-3 border border-[#3a2a18]`}
          >
            <View
              style={tw`w-12 h-12 rounded-xl bg-[#2f2113] items-center justify-center mr-3`}
            >
              <Ionicons name={it.icon as any} size={26} color="#e8c874" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-[#f3e7cc] text-base font-bold`}>
                {it.title}
              </Text>
              <Text style={tw`text-[#a8977d] text-xs mt-1`}>{it.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8b7a63" />
          </Pressable>
        </MotiView>
      ))}

      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 450, delay: 900 } as any}
      >
        <AppRating />
      </MotiView>
    </ScrollView>
  );
}

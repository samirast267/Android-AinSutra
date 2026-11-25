import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Switch,
    Text,
    View,
} from "react-native";
import tw from "twrnc";

import { API_URL } from "@/config";

const QUERY = `query Lawyers($page: Int, $limit: Int, $proBono: Boolean) {
  lawyers(page: $page, limit: $limit, proBono: $proBono) {
    page total totalPages hasNext items
  }
}`;

export default function GqlLawyers() {
  const [page, setPage] = useState(1);
  const [proBono, setProBono] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const variables: any = { page, limit: 5 };
      if (proBono) variables.proBono = true;
      const res = await fetch(`${API_URL}/graphql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: QUERY, variables }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      setData(json.data.lawyers);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }, [page, proBono]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView
      style={tw`flex-1 bg-[#140d08]`}
      contentContainerStyle={tw`p-4 pb-10`}
    >
      <Stack.Screen options={{ title: "Lawyers (GraphQL)" }} />

      <Text style={tw`text-[#e8c874] font-bold mb-1`}>
        GraphQL query sent to {API_URL}/graphql
      </Text>
      <View style={tw`bg-[#231810] rounded-xl p-3 border border-[#3a2a18]`}>
        <Text style={[tw`text-[#e9dcc3] text-xs`, { fontFamily: "monospace" }]}>
          {QUERY}
        </Text>
      </View>

      <View style={tw`flex-row items-center justify-between mt-4`}>
        <Text style={tw`text-[#f3e7cc] font-semibold`}>Pro-bono only</Text>
        <Switch
          value={proBono}
          onValueChange={(v) => {
            setPage(1);
            setProBono(v);
          }}
        />
      </View>

      {loading && <ActivityIndicator style={tw`mt-4`} />}
      {!!err && <Text style={tw`text-red-400 mt-4`}>{err}</Text>}

      {data && (
        <>
          <Text style={tw`text-[#a8977d] mt-4`}>
            Page {data.page} / {data.totalPages} • {data.total} lawyers
          </Text>
          {(data.items ?? []).map((it: any, i: number) => {
            const entries = Object.entries(it).filter(
              ([, v]) =>
                typeof v === "string" ||
                typeof v === "number" ||
                typeof v === "boolean",
            );
            const title =
              it.name ?? it.fullName ?? it.title ?? `Lawyer ${i + 1}`;
            return (
              <View
                key={it.id ?? i}
                style={tw`bg-[#231810] rounded-xl p-3 mt-2 border border-[#3a2a18]`}
              >
                <Text style={tw`text-[#f3e7cc] font-bold`}>
                  {String(title)}
                </Text>
                {entries
                  .filter(([k]) => k !== "name" && k !== "id")
                  .slice(0, 4)
                  .map(([k, v]) => (
                    <Text key={k} style={tw`text-[#a8977d] text-xs mt-1`}>
                      {k}: {String(v)}
                    </Text>
                  ))}
              </View>
            );
          })}
          <View style={tw`flex-row mt-4`}>
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage(page - 1)}
              style={tw`flex-1 bg-[#b8862b] rounded-xl p-3 items-center mr-2 ${page <= 1 ? "opacity-40" : ""}`}
            >
              <Text style={tw`text-[#140d08] font-bold`}>← Prev</Text>
            </Pressable>
            <Pressable
              disabled={!data.hasNext}
              onPress={() => setPage(page + 1)}
              style={tw`flex-1 bg-[#b8862b] rounded-xl p-3 items-center ${!data.hasNext ? "opacity-40" : ""}`}
            >
              <Text style={tw`text-[#140d08] font-bold`}>Next →</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

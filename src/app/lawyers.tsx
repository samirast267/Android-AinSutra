import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Stack } from 'expo-router';
import { API_URL } from '@/config';

type Lawyer = {
  id: number; name: string; categoryId: number; district: string;
  experienceYears: number; isProBono: boolean; rating: number;
};
type Category = { id: number; name: string };

const LIMIT = 5;
const DISTRICTS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet'];

export default function LawyersScreen() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [district, setDistrict] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/categories`).then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search) params.append('search', search);
    if (categoryId) params.append('categoryId', categoryId);
    if (district) params.append('district', district);

    setLoading(true);
    setError('');
    fetch(`${API_URL}/api/lawyers?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        setLawyers(json.data);
        setTotalPages(json.totalPages);
        setTotal(json.total);
      })
      .catch(() => setError('Cannot connect to server. Check the IP address and that the server is running.'))
      .finally(() => setLoading(false));
  }, [page, search, categoryId, district]);

  const catName = (id: number) => categories.find((c) => c.id === id)?.name ?? '';

  return (
    <SafeAreaView style={s.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: 'Find Lawyers' }} />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Find a Lawyer</Text>

        <TextInput
          style={s.input}
          placeholder="Search by name..."
          value={search}
          onChangeText={(t) => { setSearch(t); setPage(1); }}
        />

        <View style={s.pickerBox}>
          <Picker selectedValue={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(1); }}>
            <Picker.Item label="All categories" value="" />
            {categories.map((c) => <Picker.Item key={c.id} label={c.name} value={String(c.id)} />)}
          </Picker>
        </View>

        <View style={s.pickerBox}>
          <Picker selectedValue={district} onValueChange={(v) => { setDistrict(v); setPage(1); }}>
            <Picker.Item label="All districts" value="" />
            {DISTRICTS.map((d) => <Picker.Item key={d} label={d} value={d} />)}
          </Picker>
        </View>

        <Text style={s.count}>Total {total} lawyers</Text>

        {loading && <ActivityIndicator size="large" color="#1d4ed8" style={{ marginVertical: 20 }} />}
        {!!error && <Text style={s.error}>{error}</Text>}

        {!loading && lawyers.map((l) => (
          <View key={l.id} style={s.card}>
            <Text style={s.name}>{l.name}</Text>
            <Text style={s.meta}>{catName(l.categoryId)} • {l.district}</Text>
            <Text style={s.meta}>Experience: {l.experienceYears} years • ⭐ {l.rating}</Text>
            {l.isProBono && <Text style={s.badge}>Pro-bono (free)</Text>}
          </View>
        ))}

        <View style={s.pagination}>
          <TouchableOpacity
            style={[s.pageBtn, page === 1 && s.disabled]}
            disabled={page === 1}
            onPress={() => setPage(page - 1)}>
            <Text style={s.pageBtnText}>← Previous</Text>
          </TouchableOpacity>
          <Text style={s.pageInfo}>Page {page} / {totalPages}</Text>
          <TouchableOpacity
            style={[s.pageBtn, page >= totalPages && s.disabled]}
            disabled={page >= totalPages}
            onPress={() => setPage(page + 1)}>
            <Text style={s.pageBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10 },
  pickerBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  count: { color: '#666', marginVertical: 8 },
  error: { color: '#dc2626', marginVertical: 12 },
  card: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginBottom: 10, backgroundColor: '#f9fafb' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { color: '#555', marginTop: 3 },
  badge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#d1fae5', color: '#047857', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 12 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  pageBtn: { backgroundColor: '#1d4ed8', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  pageBtnText: { color: '#fff', fontWeight: '600' },
  disabled: { backgroundColor: '#9ca3af' },
  pageInfo: { fontWeight: '600' },
});
import { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Stack } from 'expo-router';
import { API_URL } from '@/config';

type Category = { id: number; name: string };

export default function CaseFormScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [urgency, setUrgency] = useState('low');
  const [district, setDistrict] = useState('Dhaka');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/categories`).then((r) => r.json()).then(setCategories).catch(() => {});
  }, []);

  const submit = async () => {
    if (!title || !description || !categoryId) {
      Alert.alert('Incomplete', 'Please fill in the title, description and category.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, categoryId, urgency, district }),
      });
      const json = await res.json();
      if (res.ok) {
        Alert.alert('Success', `Case #${json.id} submitted successfully.`);
        setTitle(''); setDescription('');
      } else {
        Alert.alert('Error', json.error ?? 'Something went wrong.');
      }
    } catch {
      Alert.alert('Error', 'Cannot connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: 'Submit a Case' }} />
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Submit Your Legal Issue</Text>

        <Text style={s.label}>Full name</Text>
        <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Your name" />

        <Text style={s.label}>Phone number</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="01XXXXXXXXX" />

        <Text style={s.label}>Case title</Text>
        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="e.g. House rent dispute" />

        <Text style={s.label}>Description</Text>
        <TextInput style={[s.input, { height: 100, textAlignVertical: 'top' }]} value={description}
          onChangeText={setDescription} multiline placeholder="Describe your problem..." />

        <Text style={s.label}>Legal category</Text>
        <View style={s.pickerBox}>
          <Picker selectedValue={categoryId} onValueChange={setCategoryId}>
            <Picker.Item label="-- Select category --" value="" />
            {categories.map((c) => <Picker.Item key={c.id} label={c.name} value={String(c.id)} />)}
          </Picker>
        </View>

        <Text style={s.label}>Urgency</Text>
        <View style={s.pickerBox}>
          <Picker selectedValue={urgency} onValueChange={setUrgency}>
            <Picker.Item label="Low" value="low" />
            <Picker.Item label="Medium" value="medium" />
            <Picker.Item label="High" value="high" />
          </Picker>
        </View>

        <Text style={s.label}>District</Text>
        <View style={s.pickerBox}>
          <Picker selectedValue={district} onValueChange={setDistrict}>
            {['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet'].map((d) => <Picker.Item key={d} label={d} value={d} />)}
          </Picker>
        </View>

        <TouchableOpacity style={[s.button, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
          <Text style={s.buttonText}>{submitting ? 'Submitting...' : 'Submit Case'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 14, marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
  pickerBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  button: { backgroundColor: '#1d4ed8', borderRadius: 8, padding: 14, marginTop: 24, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
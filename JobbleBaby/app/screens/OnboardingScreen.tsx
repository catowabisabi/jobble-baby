import { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { safeSetItem } from '@/app/utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';

const STORAGE_KEY = '@jobble_baby_profile';

interface BabyProfile {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
}

interface OnboardingScreenProps {
  onComplete?: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [gender, setGender] = useState<'boy' | 'girl' | 'prefer_not_to_say' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, padding: 24 },
    header: { marginTop: 40, marginBottom: 32 },
    title: { fontSize: 32, fontWeight: '800', color: C.text, marginBottom: 8 },
    subtitle: { fontSize: 16, color: C.muted },
    form: { flex: 1 },
    label: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8, marginTop: 20 },
    input: { backgroundColor: C.card, borderRadius: 12, padding: 16, fontSize: 16, color: C.text, borderWidth: 1, borderColor: C.border },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateButton: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: C.border },
    dateText: { fontSize: 16, color: C.text },
    genderRow: { flexDirection: 'row', gap: 12 },
    genderBtn: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    genderBtnActive: { borderColor: C.accent, backgroundColor: C.accent + '20' },
    genderText: { fontSize: 16, color: C.text, fontWeight: '500' },
    footer: { paddingBottom: 40 },
    saveBtn: { backgroundColor: C.accent, borderRadius: 16, padding: 18, alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  });

  const handleSave = async () => {
    if (!name.trim() || !birthDate || !gender) {
      Alert.alert('Missing Info', 'Please fill in all fields.');
      return;
    }
    const profile: BabyProfile = {
      name: name.trim(),
      birthDate: birthDate.toISOString(),
      gender,
    };
    await safeSetItem(STORAGE_KEY, JSON.stringify(profile));
    onComplete?.();
  };

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 5);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Jobble Baby</Text>
          <Text style={styles.subtitle}>Let us set up your baby profile</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Baby Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter name"
            placeholderTextColor={C.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Birth Date</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>
                {birthDate ? birthDate.toLocaleDateString() : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={birthDate || new Date()}
              mode="date"
              maximumDate={new Date()}
              minimumDate={minDate}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setBirthDate(date);
              }}
            />
          )}

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {(['boy', 'girl', 'prefer_not_to_say'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                onPress={() => setGender(g)}
              >
                <Text style={styles.genderText}>
                  {g === 'boy' ? 'Boy' : g === 'girl' ? 'Girl' : 'Prefer not to say'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, (!name || !birthDate || !gender) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!name || !birthDate || !gender}
          >
            <Text style={styles.saveBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
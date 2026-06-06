import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const JAUNDICE_KEY = '@jobble/jaundice_entries';
const PHOTO_KEY = '@jobble/phototherapy_entries';
const PROFILE_KEY = '@jobble_baby_profile';
const TRACKING_KEY = '@jobble/tracking_entries';

interface JaundiceEntry {
  id: string;
  date: string;
  bilirubin: number;
  method: 'blood' | 'transcutaneous';
  ageDays: number;
  notes?: string;
}

interface PhotoEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  lampType: string;
  durationMin: number;
}

interface BabyProfile {
  name: string;
  birthDate: string;
  gender?: string;
}

const LAMP_TYPES = ['LED', 'Halogen', 'Fiber Optic', 'BiliBlanket'];

const RISK_THRESHOLDS = {
  breastfed: { low: 8, medium: 12, high: 15, exchange: 20 },
  formula: { low: 10, medium: 15, high: 18, exchange: 25 },
};

function getAgeDays(birthDate: string): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  return Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
}

function getRiskLevel(bilirubin: number, method: 'blood' | 'transcutaneous', ageDays: number): { level: string; color: string } {
  const isBreastfed = true; // assume breastfed unless specified
  const threshold = isBreastfed ? RISK_THRESHOLDS.breastfed : RISK_THRESHOLDS.formula;
  if (bilirubin < threshold.low) return { level: 'Low', color: '#22C55E' };
  if (bilirubin < threshold.medium) return { level: 'Low', color: '#22C55E' };
  if (bilirubin < threshold.high) return { level: 'Moderate', color: '#F59E0B' };
  if (bilirubin < threshold.exchange) return { level: 'High', color: '#EF4444' };
  return { level: 'Exchange', color: '#DC2626' };
}

function getFeedingAvg(trackingEntries: any[]): number {
  if (!trackingEntries || trackingEntries.length === 0) return 0;
  const last7 = trackingEntries.filter(e => {
    const entryDate = new Date(e.date);
    const today = new Date();
    const diff = (today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && e.type === 'feed';
  });
  if (last7.length === 0) return 0;
  const daysWithFeeds = new Set(last7.map(e => e.date)).size;
  return Math.round(last7.length / Math.max(daysWithFeeds, 1));
}

export default function JaundiceScreen() {
  const [entries, setEntries] = useState<JaundiceEntry[]>([]);
  const [photoEntries, setPhotoEntries] = useState<PhotoEntry[]>([]);
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [trackingEntries, setTrackingEntries] = useState<any[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logBilirubin, setLogBilirubin] = useState('');
  const [logMethod, setLogMethod] = useState<'blood' | 'transcutaneous'>('blood');
  const [logNotes, setLogNotes] = useState('');
  const [photoStart, setPhotoStart] = useState('');
  const [photoEnd, setPhotoEnd] = useState('');
  const [photoLamp, setPhotoLamp] = useState(LAMP_TYPES[0]);
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];
  const inputBg = effectiveTheme === 'dark' ? '#1a2a3a' : '#f5f7fa';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [jStore, pStore, profStore, trackStore] = await Promise.all([
        AsyncStorage.getItem(JAUNDICE_KEY),
        AsyncStorage.getItem(PHOTO_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(TRACKING_KEY),
      ]);
      if (jStore) setEntries(JSON.parse(jStore));
      if (pStore) setPhotoEntries(JSON.parse(pStore));
      if (profStore) setProfile(JSON.parse(profStore));
      if (trackStore) setTrackingEntries(JSON.parse(trackStore));
    } catch (e) { /* ignore */ }
  };

  const saveJaundiceEntries = async (newEntries: JaundiceEntry[]) => {
    await AsyncStorage.setItem(JAUNDICE_KEY, JSON.stringify(newEntries));
    setEntries(newEntries);
  };

  const savePhotoEntries = async (newEntries: PhotoEntry[]) => {
    await AsyncStorage.setItem(PHOTO_KEY, JSON.stringify(newEntries));
    setPhotoEntries(newEntries);
  };

  const addJaundiceEntry = async () => {
    if (!logBilirubin) { Alert.alert('Error', 'Please enter bilirubin value'); return; }
    const bilirubin = parseFloat(logBilirubin);
    if (isNaN(bilirubin)) { Alert.alert('Error', 'Invalid bilirubin value'); return; }
    const ageDays = profile ? getAgeDays(profile.birthDate) : 0;
    const newEntry: JaundiceEntry = {
      id: Date.now().toString(),
      date: logDate,
      bilirubin,
      method: logMethod,
      ageDays,
      notes: logNotes || undefined,
    };
    await saveJaundiceEntries([newEntry, ...entries]);
    setShowLogModal(false);
    setLogBilirubin('');
    setLogNotes('');
  };

  const addPhotoEntry = async () => {
    if (!photoStart || !photoEnd) { Alert.alert('Error', 'Please enter start and end times'); return; }
    const [sh, sm] = photoStart.split(':').map(Number);
    const [eh, em] = photoEnd.split(':').map(Number);
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMin <= 0) { Alert.alert('Error', 'End time must be after start time'); return; }
    const newEntry: PhotoEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      startTime: photoStart,
      endTime: photoEnd,
      lampType: photoLamp,
      durationMin,
    };
    await savePhotoEntries([newEntry, ...photoEntries]);
    setShowPhotoModal(false);
    setPhotoStart('');
    setPhotoEnd('');
  };

  const latestEntry = entries[0];
  const latestRisk = latestEntry ? getRiskLevel(latestEntry.bilirubin, latestEntry.method, latestEntry.ageDays) : null;
  const feedingAvg = getFeedingAvg(trackingEntries);
  const ageDays = profile ? getAgeDays(profile.birthDate) : 0;

  const shareReport = async () => {
    if (!profile) { Alert.alert('Error', 'No baby profile'); return; }
    const report = [
      `Jaundice Report — ${profile.name}`,
      `Age: ${ageDays} days`,
      `Birth Date: ${profile.birthDate}`,
      '',
      'Bilirubin Readings:',
      ...entries.map(e => `  ${e.date} — ${e.bilirubin} mg/dL (${e.method === 'blood' ? 'Blood Test' : 'Transcutaneous'}, Age: ${e.ageDays}d)${e.notes ? ` — ${e.notes}` : ''}`),
      '',
      'Phototherapy Sessions:',
      ...photoEntries.map(p => `  ${p.date} — ${p.lampType}, ${p.durationMin}min (${p.startTime}~${p.endTime})`),
      '',
      `Feeding Avg (7 days): ${feedingAvg} feeds/day`,
    ].join('\n');
    try {
      await Share.share({ message: report });
    } catch (e) { /* ignore */ }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Baby Info Header */}
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.babyHeader}>
            <MaterialCommunityIcons name="baby-face" size={32} color={C.accent} />
            <View style={styles.babyInfo}>
              <Text style={[styles.babyName, { color: C.text }]}>{profile?.name || 'Baby'}</Text>
              <Text style={[styles.babyAge, { color: C.muted }]}>
                {ageDays} days old · Born {profile?.birthDate || 'N/A'}
              </Text>
            </View>
          </View>
          {latestRisk && (
            <View style={[styles.riskBadge, { backgroundColor: latestRisk.color + '20' }]}>
              <Text style={[styles.riskText, { color: latestRisk.color }]}>
                Risk: {latestRisk.level}
              </Text>
            </View>
          )}
        </View>

        {/* Alert Banner */}
        {latestEntry && latestEntry.bilirubin > 12 && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEF3C7' }]}>
            <MaterialCommunityIcons name="alert" size={20} color="#D97706" />
            <Text style={[styles.alertText, { color: '#92400E' }]}>
              Bilirubin {latestEntry.bilirubin} mg/dL — Follow up recommended. Consult your pediatrician.
            </Text>
          </View>
        )}

        {/* Feeding Alert */}
        {feedingAvg > 0 && feedingAvg < 6 && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="alert" size={20} color="#DC2626" />
            <Text style={[styles.alertText, { color: '#991B1B' }]}>
              Low feeding ({feedingAvg}/day) — dehydration risk. <Link href="/tracking" style={{ color: C.accent }}>Log feeds →</Link>
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.accent }]} onPress={() => setShowLogModal(true)}>
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Log Reading</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.accent }]} onPress={() => setShowPhotoModal(true)}>
            <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Phototherapy</Text>
          </TouchableOpacity>
        </View>

        {/* Bilirubin Entries */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Bilirubin Log</Text>
          {entries.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>No entries yet. Tap "Log Reading" to add.</Text>
          ) : (
            entries.slice(0, 10).map(entry => {
              const risk = getRiskLevel(entry.bilirubin, entry.method, entry.ageDays);
              return (
                <View key={entry.id} style={[styles.entryRow, { borderBottomColor: C.border }]}>
                  <View style={styles.entryLeft}>
                    <Text style={[styles.entryDate, { color: C.text }]}>{entry.date}</Text>
                    <Text style={[styles.entrySub, { color: C.muted }]}>
                      {entry.bilirubin} mg/dL · {entry.method === 'blood' ? 'Blood' : 'Tc meter'} · {entry.ageDays}d
                    </Text>
                  </View>
                  <View style={[styles.riskPill, { backgroundColor: risk.color + '20' }]}>
                    <Text style={[styles.riskPillText, { color: risk.color }]}>{risk.level}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Phototherapy Sessions */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Phototherapy</Text>
          {photoEntries.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>No sessions recorded.</Text>
          ) : (
            photoEntries.slice(0, 5).map(entry => (
              <View key={entry.id} style={[styles.entryRow, { borderBottomColor: C.border }]}>
                <View style={styles.entryLeft}>
                  <Text style={[styles.entryDate, { color: C.text }]}>{entry.date}</Text>
                  <Text style={[styles.entrySub, { color: C.muted }]}>
                    {entry.lampType} · {entry.durationMin}min · {entry.startTime}~{entry.endTime}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Risk Chart */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Risk Chart (WHO/NICE)</Text>
          <Text style={[styles.chartNote, { color: C.muted }]}>Age-adjusted bilirubin thresholds (mg/dL)</Text>
          <View style={styles.chartTable}>
            <View style={[styles.chartRow, styles.chartHeader]}>
              <Text style={[styles.chartCell, { color: C.text }]}>Age (days)</Text>
              <Text style={[styles.chartCell, { color: C.text }]}>Low</Text>
              <Text style={[styles.chartCell, { color: C.text }]}>Medium</Text>
              <Text style={[styles.chartCell, { color: C.text }]}>High</Text>
            </View>
            {[0, 1, 2, 3, 4, 5, 6, 7].map(age => (
              <View key={age} style={[styles.chartRow, age === ageDays % 7 && { backgroundColor: C.accent + '15' }]}>
                <Text style={[styles.chartCell, { color: C.text }]}>{age}</Text>
                <Text style={[styles.chartCell, { color: '#22C55E' }]}>{'≤8'}</Text>
                <Text style={[styles.chartCell, { color: '#F59E0B' }]}>{'8-12'}</Text>
                <Text style={[styles.chartCell, { color: '#EF4444' }]}>{'>12'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity style={[styles.shareBtn, { backgroundColor: C.accent }]} onPress={shareReport}>
          <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
          <Text style={styles.shareBtnText}>Share Report</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Log Entry Modal */}
      {showLogModal && (
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modal, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Log Bilirubin Reading</Text>
            <Text style={[styles.modalLabel, { color: C.muted }]}>Date</Text>
            <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text }]} value={logDate} onChangeText={setLogDate} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} />
            <Text style={[styles.modalLabel, { color: C.muted }]}>Bilirubin (mg/dL)</Text>
            <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text }]} value={logBilirubin} onChangeText={setLogBilirubin} placeholder="e.g. 10.5" placeholderTextColor={C.muted} keyboardType="decimal-pad" />
            <Text style={[styles.modalLabel, { color: C.muted }]}>Method</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity style={[styles.toggleBtn, logMethod === 'blood' && { backgroundColor: C.accent }]} onPress={() => setLogMethod('blood')}>
                <Text style={[styles.toggleText, logMethod === 'blood' && { color: '#fff' }]}>Blood Test</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, logMethod === 'transcutaneous' && { backgroundColor: C.accent }]} onPress={() => setLogMethod('transcutaneous')}>
                <Text style={[styles.toggleText, logMethod === 'transcutaneous' && { color: '#fff' }]}>Tc Meter</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalLabel, { color: C.muted }]}>Notes (optional)</Text>
            <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text }]} value={logNotes} onChangeText={setLogNotes} placeholder="Any notes..." placeholderTextColor={C.muted} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: C.border }]} onPress={() => setShowLogModal(false)}>
                <Text style={[styles.cancelBtnText, { color: C.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={addJaundiceEntry}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Phototherapy Modal */}
      {showPhotoModal && (
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modal, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Phototherapy Session</Text>
            <Text style={[styles.modalLabel, { color: C.muted }]}>Start Time (HH:MM)</Text>
            <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text }]} value={photoStart} onChangeText={setPhotoStart} placeholder="e.g. 09:00" placeholderTextColor={C.muted} />
            <Text style={[styles.modalLabel, { color: C.muted }]}>End Time (HH:MM)</Text>
            <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text }]} value={photoEnd} onChangeText={setPhotoEnd} placeholder="e.g. 12:00" placeholderTextColor={C.muted} />
            <Text style={[styles.modalLabel, { color: C.muted }]}>Lamp Type</Text>
            <View style={styles.lampRow}>
              {LAMP_TYPES.map(lamp => (
                <TouchableOpacity key={lamp} style={[styles.lampBtn, photoLamp === lamp && { backgroundColor: C.accent }]} onPress={() => setPhotoLamp(lamp)}>
                  <Text style={[styles.lampBtnText, photoLamp === lamp && { color: '#fff' }]}>{lamp}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: C.border }]} onPress={() => setShowPhotoModal(false)}>
                <Text style={[styles.cancelBtnText, { color: C.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={addPhotoEntry}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  babyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  babyInfo: { marginLeft: 12 },
  babyName: { fontSize: 20, fontWeight: '700' },
  babyAge: { fontSize: 14, marginTop: 2 },
  riskBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  riskText: { fontSize: 14, fontWeight: '600' },
  alertBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 12 },
  alertText: { marginLeft: 8, fontSize: 14, flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 6 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  section: { borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  entryLeft: { flex: 1 },
  entryDate: { fontSize: 15, fontWeight: '500' },
  entrySub: { fontSize: 13, marginTop: 2 },
  riskPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  riskPillText: { fontSize: 12, fontWeight: '600' },
  chartTable: { marginTop: 8 },
  chartRow: { flexDirection: 'row', paddingVertical: 6 },
  chartHeader: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  chartCell: { flex: 1, fontSize: 12, textAlign: 'center' },
  chartNote: { fontSize: 12, marginBottom: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, gap: 8, marginTop: 4 },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 8, padding: 10, fontSize: 15 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#E5E7EB' },
  toggleText: { fontSize: 14, fontWeight: '500' },
  lampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lampBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E5E7EB' },
  lampBtnText: { fontSize: 13, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '500' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

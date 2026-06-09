import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Storage keys
const PROCEDURE_LOG_KEY = '@jobble/procedure_log';
const FEEDING_RECOVERY_KEY = '@jobble/feeding_recovery';
const PAIN_COMFORT_KEY = '@jobble/pain_comfort_score';
const MEDICATION_LOG_KEY = '@jobble/medication_log';
const WOUND_PHOTO_KEY = '@jobble/wound_photo';
const RECOVERY_TIMELINE_KEY = '@jobble/recovery_timeline';
const FOLLOW_UP_KEY = '@jobble/follow_up_alert';
const PEDIATRICIAN_ALERT_KEY = '@jobble/pediatrician_alert';
const BIRTHDATE_KEY = '@jobble/baby_birthdate';
const GROWTH_KEY = '@jobble/growth_entries';

// Types
interface ProcedureEntry {
  id: string;
  type: 'frenotomy' | 'frenulectomy' | 'ear_tubes' | 'hernia_repair' | 'other';
  date: string;
  surgeonClinic: string;
  photoUri?: string;
}

interface FeedingRecoveryEntry {
  id: string;
  procedureId: string;
  timestamp: string;
  latchQuality: number;
  bottleAcceptance: 'yes' | 'partial' | 'no';
  feedingDurationMin: number;
  painScore: number;
}

interface MedicationEntry {
  id: string;
  procedureId: string;
  drugName: string;
  doseMg: number;
  timeGiven: string;
  response: 'helped' | 'not_helped';
}

interface PainComfortEntry {
  id: string;
  procedureId: string;
  timestamp: string;
  score: number;
  note?: string;
  feverCelsius?: number;
}

interface WoundPhotoEntry {
  id: string;
  procedureId: string;
  timestamp: string;
  photoUri: string;
  notes?: string;
}

interface RecoveryDayEntry {
  id: string;
  procedureId: string;
  day: number;
  status: 'swelling' | 'improving' | 'baseline';
  notes?: string;
}

interface GrowthEntry {
  id: string;
  date: string;
  height: number;
  weight: number;
}

// Helper
const getTimestamp = () => new Date().toISOString();
const getDateStr = () => new Date().toISOString().split('T')[0];

// Calculate age in months from birthdate
const calculateAgeInMonths = (birthDate: string): number => {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return Math.round(days / 30.44 * 10) / 10;
  } catch {
    return 0;
  }
};

// Get latest weight from growth entries
const getLatestWeight = (entries: GrowthEntry[]): number | null => {
  if (entries.length === 0) return null;
  return entries[0].weight;
};

// Procedure types
const PROCEDURE_TYPES = [
  { value: 'frenotomy', label: 'Frenotomy (Tongue-tie cut)', labelZh: '舌繫帶切割' },
  { value: 'frenulectomy', label: 'Frenulectomy (Upper lip tie)', labelZh: '上唇繫帶切除' },
  { value: 'ear_tubes', label: 'Ear Tubes (Ventilation)', labelZh: '耳管置入' },
  { value: 'hernia_repair', label: 'Hernia Repair', labelZh: '疝氣修補' },
  { value: 'other', label: 'Other Procedure', labelZh: '其他手術' },
];

const PAIN_EMOJIS = ['😀', '🙂', '😐', '😣', '😖'];
const BOTTLE_ACCEPTANCE_OPTIONS = [
  { value: 'yes', label: 'Yes', labelZh: '接受' },
  { value: 'partial', label: 'Partial', labelZh: '部分' },
  { value: 'no', label: 'Refused', labelZh: '拒絕' },
];

// Frenotomy recovery timeline
const FRENOTOMY_TIMELINE = [
  { day: 1, label: 'Day 1-3', status: 'swelling', description: 'Swelling expected, feeding may be difficult' },
  { day: 4, label: 'Day 4-7', status: 'improving', description: 'Swelling decreases, feeding improves' },
  { day: 8, label: 'Week 2', status: 'baseline', description: 'Typically back to baseline feeding' },
];

// Alert colors
const ALERT_GREEN = '#22C55E';
const ALERT_AMBER = '#F59E0B';
const ALERT_RED = '#EF4444';

export default function ProcedureRecovery() {
  const { effectiveTheme } = useTheme();
  const { t, effectiveLanguage } = useLanguage();
  const isDark = effectiveTheme === 'dark';
  const C = COLORS[effectiveTheme];
  const lang = effectiveLanguage;

  const [activeTab, setActiveTab] = useState<'procedure' | 'feeding' | 'medication' | 'wound' | 'recovery'>('procedure');
  const [procedureLog, setProcedureLog] = useState<ProcedureEntry[]>([]);
  const [feedingLog, setFeedingLog] = useState<FeedingRecoveryEntry[]>([]);
  const [medicationLog, setMedicationLog] = useState<MedicationEntry[]>([]);
  const [painLog, setPainLog] = useState<PainComfortEntry[]>([]);
  const [woundPhotos, setWoundPhotos] = useState<WoundPhotoEntry[]>([]);
  const [recoveryTimeline, setRecoveryTimeline] = useState<RecoveryDayEntry[]>([]);

  // Baby profile state
  const [babyBirthdate, setBabyBirthdate] = useState<string | null>(null);
  const [babyAgeMonths, setBabyAgeMonths] = useState<number>(0);
  const [growthEntries, setGrowthEntries] = useState<GrowthEntry[]>([]);

  // Form state
  const [procedureType, setProcedureType] = useState<string>('frenotomy');
  const [procedureDate, setProcedureDate] = useState<string>(getDateStr());
  const [surgeonClinic, setSurgeonClinic] = useState<string>('');
  const [latchQuality, setLatchQuality] = useState<number>(3);
  const [bottleAcceptance, setBottleAcceptance] = useState<'yes' | 'partial' | 'no'>('yes');
  const [feedingDuration, setFeedingDuration] = useState<string>('');
  const [painScore, setPainScore] = useState<number>(3);
  const [feverCelsius, setFeverCelsius] = useState<string>('');
  const [drugName, setDrugName] = useState<string>('Acetaminophen');
  const [doseMg, setDoseMg] = useState<string>('');
  const [weightInput, setWeightInput] = useState<string>('');
  const [medResponse, setMedResponse] = useState<'helped' | 'not_helped'>('helped');
  const [postOpInstructionsUri, setPostOpInstructionsUri] = useState<string>('');

  // Load data
  useEffect(() => {
    loadData(PROCEDURE_LOG_KEY, setProcedureLog);
    loadData(FEEDING_RECOVERY_KEY, setFeedingLog);
    loadData(MEDICATION_LOG_KEY, setMedicationLog);
    loadData(PAIN_COMFORT_KEY, setPainLog);
    loadData(WOUND_PHOTO_KEY, setWoundPhotos);
    loadData(RECOVERY_TIMELINE_KEY, setRecoveryTimeline);
    loadBabyProfile();
    loadGrowthEntries();
    checkAlerts();
  }, []);

  const loadBabyProfile = async () => {
    try {
      const bd = await AsyncStorage.getItem(BIRTHDATE_KEY);
      if (bd) {
        setBabyBirthdate(bd);
        setBabyAgeMonths(calculateAgeInMonths(bd));
      }
    } catch { /* ignore */ }
  };

  const loadGrowthEntries = async () => {
    try {
      const raw = await AsyncStorage.getItem(GROWTH_KEY);
      if (raw) {
        const entries: GrowthEntry[] = JSON.parse(raw);
        setGrowthEntries(entries);
        const latestWeight = getLatestWeight(entries);
        if (latestWeight) setWeightInput(latestWeight.toFixed(1));
      }
    } catch { /* ignore */ }
  };

  const loadData = async (key: string, setter: (data: any[]) => void) => {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) setter(JSON.parse(data));
    } catch (e) { /* ignore */ }
  };

  const saveData = async (key: string, data: any[]) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  };

  const checkAlerts = async () => {
    const feedData = await AsyncStorage.getItem(FEEDING_RECOVERY_KEY);
    if (feedData) {
      const entries: FeedingRecoveryEntry[] = JSON.parse(feedData);
      if (entries.length > 0) {
        const last = entries[entries.length - 1];
        const hoursSince = (Date.now() - new Date(last.timestamp).getTime()) / (1000 * 60 * 60);
        if (hoursSince > 24) {
          Alert.alert(
            t('procedureRecovery.alerts.noFeeding24hTitle') || 'Feeding Alert - 24h+',
            t('procedureRecovery.alerts.noFeeding24hMsg') || 'No feeding logged in 24+ hours. Contact pediatrician immediately.',
            [{ text: 'OK', style: 'destructive' }]
          );
        } else if (hoursSince > 12) {
          Alert.alert(
            t('procedureRecovery.alerts.noFeedingTitle') || 'Feeding Alert',
            t('procedureRecovery.alerts.noFeedingMsg') || 'No feeding logged in 12+ hours. Consider offering milk.',
            [{ text: 'OK' }]
          );
        }
      }
    }
  };

  // Calculate medication dose based on weight
  const calculateDose = (drug: string, weightKg: number): number => {
    if (drug === 'Acetaminophen') {
      return Math.round(weightKg * 15 * 10) / 10; // 15mg/kg
    } else if (drug === 'Ibuprofen') {
      return Math.round(weightKg * 10 * 10) / 10; // 10mg/kg
    }
    return 0;
  };

  // Actions
  const addProcedure = async () => {
    if (!surgeonClinic.trim()) {
      Alert.alert(t('procedureRecovery.errors.required') || 'Please fill in clinic name');
      return;
    }
    const entry: ProcedureEntry = {
      id: Date.now().toString(),
      type: procedureType as ProcedureEntry['type'],
      date: procedureDate,
      surgeonClinic: surgeonClinic.trim(),
    };
    const updated = [...procedureLog, entry];
    setProcedureLog(updated);
    await saveData(PROCEDURE_LOG_KEY, updated);
    setSurgeonClinic('');
    Alert.alert(t('procedureRecovery.saved') || 'Procedure logged');
  };

  const addFeedingRecovery = async () => {
    if (procedureLog.length === 0) {
      Alert.alert(t('procedureRecovery.errors.addProcedureFirst') || 'Log a procedure first');
      return;
    }
    const entry: FeedingRecoveryEntry = {
      id: Date.now().toString(),
      procedureId: procedureLog[procedureLog.length - 1].id,
      timestamp: getTimestamp(),
      latchQuality,
      bottleAcceptance,
      feedingDurationMin: parseInt(feedingDuration) || 0,
      painScore,
    };
    const updated = [...feedingLog, entry];
    setFeedingLog(updated);
    await saveData(FEEDING_RECOVERY_KEY, updated);
    setFeedingDuration('');
  };

  const addMedication = async () => {
    if (procedureLog.length === 0) {
      Alert.alert(t('procedureRecovery.errors.addProcedureFirst') || 'Log a procedure first');
      return;
    }
    const entry: MedicationEntry = {
      id: Date.now().toString(),
      procedureId: procedureLog[procedureLog.length - 1].id,
      drugName,
      doseMg: parseInt(doseMg) || 0,
      timeGiven: getTimestamp(),
      response: medResponse,
    };
    const updated = [...medicationLog, entry];
    setMedicationLog(updated);
    await saveData(MEDICATION_LOG_KEY, updated);
    setDoseMg('');
  };

  const addPainScore = async (score: number, fever?: number) => {
    if (procedureLog.length === 0) return;

    // Check fever alert
    if (fever && fever > 38) {
      Alert.alert(
        t('procedureRecovery.alerts.feverTitle') || 'Fever Alert',
        t('procedureRecovery.alerts.feverMsg') || `Fever ${fever}°C detected. Contact pediatrician immediately.`,
        [{ text: 'Call Pediatrician', style: 'destructive' }, { text: 'OK' }]
      );
    }

    const entry: PainComfortEntry = {
      id: Date.now().toString(),
      procedureId: procedureLog[procedureLog.length - 1].id,
      timestamp: getTimestamp(),
      score,
      feverCelsius: fever,
    };
    const updated = [...painLog, entry];
    setPainLog(updated);
    await saveData(PAIN_COMFORT_KEY, updated);
    setFeverCelsius('');
    checkPediatricianAlert(updated);
  };

  const checkPediatricianAlert = (logs: PainComfortEntry[]) => {
    const recent = logs.filter(l => {
      const hours = (Date.now() - new Date(l.timestamp).getTime()) / (1000 * 60 * 60);
      return hours < 72;
    });
    const highPain = recent.filter(l => l.score >= 4);
    if (highPain.length >= 3) {
      Alert.alert(
        t('procedureRecovery.pediatrician.title') || 'Call Pediatrician',
        t('procedureRecovery.pediatrician.msg') || 'Pain score 4+ for 3+ days. Contact your pediatrician.',
        [{ text: 'Call', onPress: () => {} }, { text: 'Dismiss' }]
      );
    }
  };

  const pickWoundPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const entry: WoundPhotoEntry = {
        id: Date.now().toString(),
        procedureId: procedureLog.length > 0 ? procedureLog[procedureLog.length - 1].id : '',
        timestamp: getTimestamp(),
        photoUri: result.assets[0].uri,
      };
      const updated = [...woundPhotos, entry];
      setWoundPhotos(updated);
      await saveData(WOUND_PHOTO_KEY, updated);
    }
  };

  const pickPostOpInstructionsPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPostOpInstructionsUri(result.assets[0].uri);
      // Save to procedure entry if one exists
      if (procedureLog.length > 0) {
        const latest = procedureLog[procedureLog.length - 1];
        const updated: ProcedureEntry = { ...latest, photoUri: result.assets[0].uri };
        const updatedLog = procedureLog.map(p => p.id === latest.id ? updated : p);
        setProcedureLog(updatedLog);
        await saveData(PROCEDURE_LOG_KEY, updatedLog);
      }
    }
  };

  const getProcedureLabel = (type: string) => {
    const found = PROCEDURE_TYPES.find(p => p.value === type);
    return found ? (lang === 'zh' ? found.labelZh : found.label) : type;
  };

  const latestProcedure = procedureLog.length > 0 ? procedureLog[procedureLog.length - 1] : null;
  const latestWeight = getLatestWeight(growthEntries);
  const displayWeight = weightInput ? parseFloat(weightInput) : latestWeight;

  const renderTabButton = (tab: string, label: string) => (
    <TouchableOpacity
      key={tab}
      onPress={() => setActiveTab(tab as any)}
      style={[styles.tabBtn, { backgroundColor: activeTab === tab ? C.accent : C.card }]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={{ color: activeTab === tab ? '#fff' : C.text, fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );

  const renderScoreButtons = (current: number, setter: (n: number) => void) => (
    <View style={styles.scoreRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity
          key={n}
          onPress={() => setter(n)}
          style={[
            styles.scoreBtn,
            { backgroundColor: current === n ? C.accent : C.card }
          ]}
          accessibilityLabel={`Score ${n}`}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 20 }}>{PAIN_EMOJIS[n - 1]}</Text>
          <Text style={{ fontSize: 10, color: current === n ? '#fff' : C.muted }}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Get alert color based on status
  const getAlertColor = (status: 'normal' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'critical': return ALERT_RED;
      case 'warning': return ALERT_AMBER;
      default: return ALERT_GREEN;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <MaterialCommunityIcons name="medical-bag" size={24} color={C.accent} />
          <Text style={[styles.title, { color: C.text }]}>
            {t('tabs.procedureRecovery') || 'Post-Procedure'}
          </Text>
        </View>

        {/* Baby Age Banner */}
        {babyAgeMonths > 0 && (
          <View style={[styles.babyAgeBanner, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.babyAgeText, { color: C.text }]}>
              👶 {lang === 'zh' ? `寶寶 ${babyAgeMonths} 個月大` : `Baby is ${babyAgeMonths} months old`}
            </Text>
            {displayWeight && (
              <Text style={[styles.babyWeightText, { color: C.muted }]}>
                {lang === 'zh' ? `體重 ${displayWeight} kg` : `Weight: ${displayWeight} kg`}
              </Text>
            )}
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabNav}>
          {renderTabButton('procedure', t('procedureRecovery.tabs.procedure') || 'Procedure')}
          {renderTabButton('feeding', t('procedureRecovery.tabs.feeding') || 'Feeding')}
          {renderTabButton('medication', t('procedureRecovery.tabs.medication') || 'Medication')}
          {renderTabButton('wound', t('procedureRecovery.tabs.wound') || 'Wound')}
          {renderTabButton('recovery', t('procedureRecovery.tabs.recovery') || 'Timeline')}
        </View>

        {/* PROCEDURE TAB */}
        {activeTab === 'procedure' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              {t('procedureRecovery.procedure.title') || 'Log Procedure'}
            </Text>

            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.procedure.type') || 'Procedure Type'}
            </Text>
            <View style={styles.optionRow}>
              {PROCEDURE_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt.value}
                  onPress={() => setProcedureType(pt.value)}
                  style={[styles.optionChip, {
                    backgroundColor: procedureType === pt.value ? C.accent : C.card
                  }]}
                  accessibilityLabel={lang === 'zh' ? pt.labelZh : pt.label}
                  accessibilityRole="button"
                >
                  <Text style={{ color: procedureType === pt.value ? '#fff' : C.text, fontSize: 12 }}>
                    {lang === 'zh' ? pt.labelZh : pt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.procedure.clinic') || 'Surgeon / Clinic Name'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
              value={surgeonClinic}
              onChangeText={setSurgeonClinic}
              placeholder={lang === 'zh' ? '點擊輸入診所名稱' : 'Tap to enter clinic name'}
              placeholderTextColor={C.muted}
            />

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent }]}
              onPress={addProcedure}
              accessibilityLabel={t('procedureRecovery.procedure.save') || 'Save Procedure'}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>{t('procedureRecovery.procedure.save') || 'Save Procedure'}</Text>
            </TouchableOpacity>

            {/* Post-Op Instructions Photo */}
            <Text style={[styles.label, { color: C.muted, marginTop: 16 }]}>
              {t('procedureRecovery.procedure.postOpPhoto') || 'Post-Op Instructions Photo'}
            </Text>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]}
              onPress={pickPostOpInstructionsPhoto}
              accessibilityLabel={t('procedureRecovery.procedure.capturePostOp') || 'Capture Post-Op Instructions'}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="camera" size={20} color={C.text} />
              <Text style={[styles.btnText, { color: C.text }]}>
                {postOpInstructionsUri
                  ? (lang === 'zh' ? '已拍攝' : 'Captured')
                  : (lang === 'zh' ? '拍攝術後說明照片' : 'Capture Post-Op Instructions')}
              </Text>
            </TouchableOpacity>
            {postOpInstructionsUri && (
              <Image source={{ uri: postOpInstructionsUri }} style={styles.postOpPreview} />
            )}

            {/* Pain Score */}
            <Text style={[styles.sectionTitle, { color: C.text, marginTop: 24 }]}>
              {t('procedureRecovery.pain.title') || 'Pain & Comfort Score'}
            </Text>
            <Text style={[styles.hint, { color: C.muted }]}>
              {t('procedureRecovery.pain.hint') || 'Tap to record how baby seems to feel'}
            </Text>
            {renderScoreButtons(painScore, setPainScore)}

            {/* Fever Input */}
            <Text style={[styles.label, { color: C.muted, marginTop: 12 }]}>
              {t('procedureRecovery.pain.fever') || 'Fever Temperature (°C)'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
              value={feverCelsius}
              onChangeText={setFeverCelsius}
              placeholder={lang === 'zh' ? '例如：37.5' : 'e.g. 37.5'}
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
            />
            {feverCelsius ? (
              <Text style={{
                color: parseFloat(feverCelsius) > 38 ? ALERT_RED : parseFloat(feverCelsius) > 37.5 ? ALERT_AMBER : ALERT_GREEN,
                fontSize: 12,
                marginTop: 4
              }}>
                {parseFloat(feverCelsius) > 38
                  ? (lang === 'zh' ? '⚠️ 高燒！立即就醫' : '⚠️ High fever! Seek medical attention')
                  : parseFloat(feverCelsius) > 37.5
                  ? (lang === 'zh' ? '⚡ 輕微發燒' : '⚡ Mild fever')
                  : (lang === 'zh' ? '✓ 體溫正常' : '✓ Normal temperature')}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent, marginTop: 8 }]}
              onPress={() => addPainScore(painScore, feverCelsius ? parseFloat(feverCelsius) : undefined)}
              accessibilityLabel={t('procedureRecovery.pain.save') || 'Log Pain Score'}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>{t('procedureRecovery.pain.save') || 'Log Pain Score'}</Text>
            </TouchableOpacity>

            {/* Recent log */}
            {painLog.length > 0 && (
              <View style={[styles.logList, { backgroundColor: C.card }]}>
                <Text style={[styles.logTitle, { color: C.text }]}>
                  {t('procedureRecovery.recent') || 'Recent Entries'}
                </Text>
                {painLog.slice(-5).reverse().map(entry => (
                  <View key={entry.id} style={styles.logRow}>
                    <Text style={{ fontSize: 18 }}>{PAIN_EMOJIS[entry.score - 1]}</Text>
                    {entry.feverCelsius && (
                      <Text style={{
                        color: entry.feverCelsius > 38 ? ALERT_RED : entry.feverCelsius > 37.5 ? ALERT_AMBER : C.muted,
                        fontSize: 12,
                        marginLeft: 8
                      }}>
                        🌡️{entry.feverCelsius}°C
                      </Text>
                    )}
                    <Text style={{ color: C.muted, marginLeft: 8 }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Navigation Links */}
            <View style={styles.linkRow}>
              <Link href="/tongue-tie" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>📋 {lang === 'zh' ? '舌繫帶資訊' : 'Tongue-tie Info'}</Text>
              </Link>
              <Link href="/growth" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>📈 {lang === 'zh' ? '成長記錄' : 'Growth'}</Text>
              </Link>
            </View>
          </View>
        )}

        {/* FEEDING TAB */}
        {activeTab === 'feeding' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              {t('procedureRecovery.feeding.title') || 'Feeding Recovery'}
            </Text>

            {latestProcedure && (
              <Text style={[styles.hint, { color: C.muted }]}>
                {lang === 'zh' ? `術後追蹤：${getProcedureLabel(latestProcedure.type)}` : `Tracking: ${getProcedureLabel(latestProcedure.type)}`}
              </Text>
            )}

            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.feeding.latch') || 'Latch Quality (1-5)'}
            </Text>
            {renderScoreButtons(latchQuality, setLatchQuality)}

            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.feeding.bottle') || 'Bottle Acceptance'}
            </Text>
            <View style={styles.optionRow}>
              {BOTTLE_ACCEPTANCE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setBottleAcceptance(opt.value as any)}
                  style={[styles.optionChip, {
                    backgroundColor: bottleAcceptance === opt.value ? C.accent : C.card
                  }]}
                  accessibilityLabel={lang === 'zh' ? opt.labelZh : opt.label}
                  accessibilityRole="button"
                >
                  <Text style={{ color: bottleAcceptance === opt.value ? '#fff' : C.text, fontSize: 13 }}>
                    {lang === 'zh' ? opt.labelZh : opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.feeding.duration') || 'Feeding Duration (minutes)'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
              value={feedingDuration}
              onChangeText={setFeedingDuration}
              placeholder={lang === 'zh' ? '例如：15' : 'e.g. 15'}
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent }]}
              onPress={addFeedingRecovery}
              accessibilityLabel={t('procedureRecovery.feeding.save') || 'Log Feeding'}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>{t('procedureRecovery.feeding.save') || 'Log Feeding'}</Text>
            </TouchableOpacity>

            {feedingLog.length > 0 && (
              <View style={[styles.logList, { backgroundColor: C.card }]}>
                <Text style={[styles.logTitle, { color: C.text }]}>
                  {t('procedureRecovery.feeding.history') || 'Feeding History'}
                </Text>
                {feedingLog.slice(-10).reverse().map(entry => (
                  <View key={entry.id} style={styles.logRow}>
                    <Text style={{ color: C.text }}>
                      {PAIN_EMOJIS[entry.latchQuality - 1]} {entry.bottleAcceptance} · {entry.feedingDurationMin}min
                    </Text>
                    <Text style={{ color: C.muted }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Alert for no feeding */}
            {feedingLog.length > 0 && (() => {
              const last = feedingLog[feedingLog.length - 1];
              const hoursSince = (Date.now() - new Date(last.timestamp).getTime()) / (1000 * 60 * 60);
              const alertStatus = hoursSince > 24 ? 'critical' : hoursSince > 12 ? 'warning' : 'normal';
              return (
                <View style={[styles.alertCard, {
                  backgroundColor: C.card,
                  borderColor: getAlertColor(alertStatus),
                  borderWidth: 2
                }]}>
                  <Text style={{ color: getAlertColor(alertStatus), fontWeight: 'bold' }}>
                    {alertStatus === 'critical' ? '🚨 ' + (lang === 'zh' ? '緊急：24小時無餵食' : 'URGENT: 24h+ no feeding')
                      : alertStatus === 'warning' ? '⚠️ ' + (lang === 'zh' ? '注意：12小時無餵食' : 'WARNING: 12h+ no feeding')
                      : '✓ ' + (lang === 'zh' ? '餵食正常' : 'Feeding normal')}
                  </Text>
                </View>
              );
            })()}

            {/* Navigation Links */}
            <View style={styles.linkRow}>
              <Link href="/cry-analyzer" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>🔊 {lang === 'zh' ? '哭聲分析' : 'Cry Analyzer'}</Text>
              </Link>
              <Link href="/medicine-dose" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>💊 {lang === 'zh' ? '劑量計算' : 'Dose Calc'}</Text>
              </Link>
            </View>
          </View>
        )}

        {/* MEDICATION TAB */}
        {activeTab === 'medication' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              {t('procedureRecovery.medication.title') || 'Medication Log'}
            </Text>

            {/* Weight Input */}
            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.medication.weight') || 'Baby Weight (kg)'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
              value={weightInput}
              onChangeText={setWeightInput}
              placeholder={lang === 'zh' ? '例如：5.5' : 'e.g. 5.5'}
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
            />
            {latestWeight && !weightInput && (
              <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>
                {lang === 'zh' ? `從成長記錄載入：${latestWeight} kg` : `Loaded from growth: ${latestWeight} kg`}
              </Text>
            )}

            {/* Dose Calculator Info */}
            {displayWeight && (
              <View style={[styles.doseCalculatorCard, { backgroundColor: C.card, borderColor: C.accent }]}>
                <Text style={{ color: C.text, fontWeight: 'bold', marginBottom: 8 }}>
                  {lang === 'zh' ? '劑量計算參考' : 'Dose Calculator Reference'}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {lang === 'zh' ? 'Acetaminophen (退燒止痛)：15mg/kg' : 'Acetaminophen: 15mg/kg'}
                </Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>
                  {lang === 'zh' ? 'Ibuprofen (消炎止痛)：10mg/kg' : 'Ibuprofen: 10mg/kg'}
                </Text>
                {displayWeight && (
                  <Text style={{ color: C.accent, fontSize: 13, marginTop: 8 }}>
                    {lang === 'zh'
                      ? `體重 ${displayWeight}kg：Acetaminophen ${calculateDose('Acetaminophen', displayWeight)}mg，Ibuprofen ${calculateDose('Ibuprofen', displayWeight)}mg`
                      : `At ${displayWeight}kg: Acetaminophen ${calculateDose('Acetaminophen', displayWeight)}mg, Ibuprofen ${calculateDose('Ibuprofen', displayWeight)}mg`}
                  </Text>
                )}
              </View>
            )}

            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.medication.drug') || 'Medication'}
            </Text>
            <View style={styles.optionRow}>
              {['Acetaminophen', 'Ibuprofen'].map(drug => (
                <TouchableOpacity
                  key={drug}
                  onPress={() => {
                    setDrugName(drug);
                    // Auto-suggest dose if weight is available
                    if (displayWeight) {
                      setDoseMg(calculateDose(drug, displayWeight).toString());
                    }
                  }}
                  style={[styles.optionChip, {
                    backgroundColor: drugName === drug ? C.accent : C.card
                  }]}
                  accessibilityLabel={drug}
                  accessibilityRole="button"
                >
                  <Text style={{ color: drugName === drug ? '#fff' : C.text, fontSize: 13 }}>{drug}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.medication.dose') || 'Dose (mg)'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
              value={doseMg}
              onChangeText={setDoseMg}
              placeholder={lang === 'zh' ? '例如：75' : 'e.g. 75'}
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
            />

            <Text style={[styles.label, { color: C.muted }]}>
              {t('procedureRecovery.medication.response') || 'Response'}
            </Text>
            <View style={styles.optionRow}>
              {[
                { value: 'helped', label: lang === 'zh' ? '有效' : 'Helped' },
                { value: 'not_helped', label: lang === 'zh' ? '無效' : 'Not Helped' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setMedResponse(opt.value as any)}
                  style={[styles.optionChip, {
                    backgroundColor: medResponse === opt.value ? C.accent : C.card
                  }]}
                  accessibilityLabel={opt.label}
                  accessibilityRole="button"
                >
                  <Text style={{ color: medResponse === opt.value ? '#fff' : C.text, fontSize: 13 }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent }]}
              onPress={addMedication}
              accessibilityLabel={t('procedureRecovery.medication.save') || 'Log Medication'}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>{t('procedureRecovery.medication.save') || 'Log Medication'}</Text>
            </TouchableOpacity>

            {medicationLog.length > 0 && (
              <View style={[styles.logList, { backgroundColor: C.card }]}>
                <Text style={[styles.logTitle, { color: C.text }]}>
                  {t('procedureRecovery.medication.history') || 'Medication History'}
                </Text>
                {medicationLog.slice(-10).reverse().map(entry => (
                  <View key={entry.id} style={styles.logRow}>
                    <Text style={{ color: C.text }}>{entry.drugName} · {entry.doseMg}mg</Text>
                    <Text style={{ color: entry.response === 'helped' ? ALERT_GREEN : ALERT_RED }}>
                      {entry.response === 'helped' ? '✓' : '✗'}
                    </Text>
                    <Text style={{ color: C.muted }}>{new Date(entry.timeGiven).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Navigation Links */}
            <View style={styles.linkRow}>
              <Link href="/medicine-dose" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>💊 {lang === 'zh' ? '劑量計算機' : 'Dose Calculator'}</Text>
              </Link>
              <Link href="/clinician-portal" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>👨‍⚕️ {lang === 'zh' ? '醫生聯繫' : 'Doctor Contact'}</Text>
              </Link>
            </View>
          </View>
        )}

        {/* WOUND TAB */}
        {activeTab === 'wound' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              {t('procedureRecovery.wound.title') || 'Wound Monitoring'}
            </Text>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent }]}
              onPress={pickWoundPhoto}
              accessibilityLabel={t('procedureRecovery.wound.capture') || 'Capture Wound Photo'}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="camera" size={20} color="#fff" />
              <Text style={styles.btnText}>
                {t('procedureRecovery.wound.capture') || 'Capture Wound Photo'}
              </Text>
            </TouchableOpacity>

            {/* Alert thresholds with color coding */}
            <View style={[styles.alertCard, { backgroundColor: C.card, borderColor: ALERT_RED, borderWidth: 2 }]}>
              <Text style={{ color: ALERT_RED, fontWeight: 'bold' }}>
                🚨 {t('procedureRecovery.wound.alertTitle') || 'Escalation Triggers'}
              </Text>
              <Text style={{ color: ALERT_RED, marginTop: 4 }}>
                • {lang === 'zh' ? '發燒超過38°C - 立即就醫' : 'Fever above 38°C - Seek care'}
              </Text>
              <Text style={{ color: ALERT_AMBER }}>
                • {lang === 'zh' ? '紅腫加重' : 'Increasing redness/swelling'}
              </Text>
              <Text style={{ color: ALERT_AMBER }}>
                • {lang === 'zh' ? '疼痛評分持續高分' : 'Pain score persistently high'}
              </Text>
            </View>

            {/* Wound Photos with actual Image rendering */}
            {woundPhotos.length > 0 && (
              <View style={styles.photoGrid}>
                {woundPhotos.slice(-6).reverse().map(photo => (
                  <View key={photo.id} style={[styles.photoThumb, { backgroundColor: C.card }]}>
                    <Image
                      source={{ uri: photo.photoUri }}
                      style={styles.woundImage}
                    />
                    <Text style={{ color: C.muted, fontSize: 10 }}>
                      {new Date(photo.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Navigation Links */}
            <View style={styles.linkRow}>
              <Link href="/tongue-tie" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>📋 {lang === 'zh' ? '舌繫帶資訊' : 'Tongue-tie Info'}</Text>
              </Link>
              <Link href="/clinician-portal" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>👨‍⚕️ {lang === 'zh' ? '醫生聯繫' : 'Doctor Contact'}</Text>
              </Link>
            </View>
          </View>
        )}

        {/* RECOVERY TIMELINE TAB */}
        {activeTab === 'recovery' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>
              {t('procedureRecovery.recovery.title') || 'Recovery Timeline'}
            </Text>

            {latestProcedure?.type === 'frenotomy' && (
              <>
                {FRENOTOMY_TIMELINE.map((phase, idx) => {
                  const dayEntry = recoveryTimeline.find(
                    e => e.day === phase.day && e.procedureId === latestProcedure.id
                  );
                  const statusColor = dayEntry
                    ? dayEntry.status === 'swelling' ? ALERT_RED
                      : dayEntry.status === 'improving' ? ALERT_AMBER : ALERT_GREEN
                    : C.border;
                  return (
                    <View key={idx} style={[styles.timelineCard, { backgroundColor: C.card, borderLeftColor: statusColor }]}>
                      <Text style={{ color: C.text, fontWeight: 'bold' }}>{phase.label}</Text>
                      <Text style={{ color: C.muted, fontSize: 13 }}>{phase.description}</Text>
                      <View style={styles.statusRow}>
                        {(['swelling', 'improving', 'baseline'] as const).map(s => (
                          <TouchableOpacity
                            key={s}
                            onPress={async () => {
                              if (!latestProcedure) return;
                              const entry: RecoveryDayEntry = {
                                id: Date.now().toString(),
                                procedureId: latestProcedure.id,
                                day: phase.day,
                                status: s,
                              };
                              const updated = [...recoveryTimeline.filter(e => !(e.day === phase.day && e.procedureId === latestProcedure.id)), entry];
                              setRecoveryTimeline(updated);
                              await saveData(RECOVERY_TIMELINE_KEY, updated);
                            }}
                            style={[styles.statusBtn, {
                              backgroundColor: dayEntry?.status === s ? statusColor : 'transparent',
                              borderColor: statusColor,
                            }]}
                            accessibilityLabel={s}
                            accessibilityRole="button"
                          >
                            <Text style={{ fontSize: 10, color: dayEntry?.status === s ? '#fff' : statusColor }}>
                              {s === 'swelling' ? (lang === 'zh' ? '腫脹' : 'Swelling') :
                               s === 'improving' ? (lang === 'zh' ? '好轉' : 'Improving') :
                               (lang === 'zh' ? '恢復' : 'Baseline')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Recovery Status Alert */}
            {recoveryTimeline.length > 0 && (() => {
              const latestEntry = recoveryTimeline.filter(
                e => e.procedureId === latestProcedure?.id
              ).sort((a, b) => b.day - a.day)[0];
              if (!latestEntry) return null;
              const alertStatus = latestEntry.status === 'swelling' ? 'warning'
                : latestEntry.status === 'improving' ? 'normal' : 'normal';
              return (
                <View style={[styles.alertCard, {
                  backgroundColor: C.card,
                  borderColor: getAlertColor(alertStatus),
                  borderWidth: 2
                }]}>
                  <Text style={{ color: getAlertColor(alertStatus), fontWeight: 'bold' }}>
                    {latestEntry.status === 'swelling' ? '⚠️ ' + (lang === 'zh' ? '康復中：仍有腫脹' : 'Recovering: Swelling present')
                      : latestEntry.status === 'improving' ? '📈 ' + (lang === 'zh' ? '康復中：好轉中' : 'Recovering: Improving')
                      : '✓ ' + (lang === 'zh' ? '已恢復正常' : 'Back to baseline')}
                  </Text>
                </View>
              );
            })()}

            {/* Follow-up alert */}
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent, marginTop: 16 }]}
              onPress={() => Alert.alert(
                t('procedureRecovery.recovery.followup.title') || 'Follow-up Reminder',
                t('procedureRecovery.recovery.followup.msg') || 'Set reminder for your follow-up appointment'
              )}
              accessibilityLabel={t('procedureRecovery.recovery.followup.btn') || 'Set Follow-up Reminder'}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>
                {t('procedureRecovery.recovery.followup.btn') || 'Set Follow-up Reminder'}
              </Text>
            </TouchableOpacity>

            {/* Navigation Links */}
            <View style={styles.linkRow}>
              <Link href="/growth" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>📈 {lang === 'zh' ? '成長記錄' : 'Growth Tracking'}</Text>
              </Link>
              <Link href="/medicine-dose" style={[styles.linkBtn, { backgroundColor: C.card }]}>
                <Text style={[styles.linkText, { color: C.text }]}>💊 {lang === 'zh' ? '劑量計算' : 'Dose Calculator'}</Text>
              </Link>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
  tabNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  label: { fontSize: 13, marginTop: 12, marginBottom: 4 },
  hint: { fontSize: 13, marginBottom: 8 },
  input: {
    padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 },
  scoreBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 2,
    borderRadius: 8,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 12, marginTop: 12, gap: 8,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  logList: { marginTop: 16, padding: 12, borderRadius: 12 },
  logTitle: { fontWeight: 'bold', marginBottom: 8 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  alertCard: {
    marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16,
  },
  photoThumb: {
    width: 80, height: 90, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  woundImage: {
    width: 70, height: 70, borderRadius: 6,
  },
  timelineCard: {
    padding: 12, borderRadius: 12, borderLeftWidth: 4, marginBottom: 12,
  },
  statusRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statusBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  // New styles for enhanced features
  babyAgeBanner: {
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  babyAgeText: { fontSize: 14, fontWeight: '600' },
  babyWeightText: { fontSize: 12, marginTop: 4 },
  postOpPreview: {
    width: '100%', height: 200, borderRadius: 8, marginTop: 8,
  },
  doseCalculatorCard: {
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  linkRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20,
  },
  linkBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  linkText: { fontSize: 12 },
});
import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const PROTO_CONVERSATION_KEY = STORAGE_KEYS.PROTO_CONVERSATION;
const GAZE_ALTERNATION_KEY = STORAGE_KEYS.GAZE_ALTERNATION;
const JOINT_ATTENTION_KEY = STORAGE_KEYS.JOINT_ATTENTION;
const AFFECTIVE_SHARING_KEY = STORAGE_KEYS.AFFECTIVE_SHARING;
const MOTHERESE_RESPONSE_KEY = STORAGE_KEYS.MOTHERESE_RESPONSE;
const IMITATIVE_REPERTOIRE_KEY = STORAGE_KEYS.IMITATIVE_REPERTOIRE;

interface ProtoConversationEntry {
  date: string;
  count: number;
}

interface GazeAlternationEntry {
  date: string;
  count: number;
  objects?: string[];
}

interface JointAttentionEntry {
  id: string;
  date: string;
  duration_seconds: number;
  notes?: string;
}

interface AffectiveSharingEntry {
  date: string;
  score: 0 | 1 | 2 | 3;
  indicators: string[];
}

interface MothereseResponseEntry {
  date: string;
  engaged: boolean;
  note?: string;
}

interface ImitativeItem {
  action: string;
  date_learned?: string;
  notes?: string;
  has_media?: boolean;
}

const DEFAULT_IMITATIVE_ACTIONS = [
  'clap_hands',
  'wave_bye',
  'peek_a_boo',
  'blow_kiss',
  'shake_head_no',
  'nod',
  'pointing',
  'touch_nose',
  'touch_ears',
  'touch_eyes',
];

const BENCHMARKS = [
  { age: '9mo', protoConversation: true, jointAttention: true, gazeAlternation: false, imitativeWords: 0 },
  { age: '12mo', protoConversation: true, jointAttention: true, gazeAlternation: true, imitativeWords: 1 },
  { age: '15mo', protoConversation: true, jointAttention: true, gazeAlternation: true, imitativeWords: 10 },
  { age: '18mo', protoConversation: true, jointAttention: true, gazeAlternation: true, imitativeWords: 50 },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getLast14Days(): string[] {
  const days: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

export default function ProtoconversationScreen() {
  const [protoConversations, setProtoConversations] = useState<ProtoConversationEntry[]>([]);
  const [gazeAlternations, setGazeAlternations] = useState<GazeAlternationEntry[]>([]);
  const [jointAttentionSessions, setJointAttentionSessions] = useState<JointAttentionEntry[]>([]);
  const [affectiveSharing, setAffectiveSharing] = useState<AffectiveSharingEntry[]>([]);
  const [mothereseResponses, setMothereseResponses] = useState<MothereseResponseEntry[]>([]);
  const [imitativeRepertoire, setImitativeRepertoire] = useState<ImitativeItem[]>([]);
  
  const [showAddProto, setShowAddProto] = useState(false);
  const [showAddGaze, setShowAddGaze] = useState(false);
  const [showAddJointAttention, setShowAddJointAttention] = useState(false);
  const [showAffectiveChecklist, setShowAffectiveChecklist] = useState(false);
  const [showAddMotherese, setShowAddMotherese] = useState(false);
  const [showAddImitative, setShowAddImitative] = useState(false);
  const [showBenchmarks, setShowBenchmarks] = useState(false);
  
  const [protoCount, setProtoCount] = useState(1);
  const [gazeObject, setGazeObject] = useState('');
  const [jointDuration, setJointDuration] = useState(0);
  const [jointStartTime, setJointStartTime] = useState<number | null>(null);
  const [affectiveIndicators, setAffectiveIndicators] = useState<string[]>([]);
  const [mothereseEngaged, setMothereseEngaged] = useState(true);
  const [mothereseNote, setMothereseNote] = useState('');
  const [selectedImitative, setSelectedImitative] = useState<string | null>(null);
  const [customAction, setCustomAction] = useState('');

  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [protoRaw, gazeRaw, jointRaw, affectiveRaw, mothereseRaw, imitativeRaw] = await Promise.all([
        safeGetItem(PROTO_CONVERSATION_KEY),
        safeGetItem(GAZE_ALTERNATION_KEY),
        safeGetItem(JOINT_ATTENTION_KEY),
        safeGetItem(AFFECTIVE_SHARING_KEY),
        safeGetItem(MOTHERESE_RESPONSE_KEY),
        safeGetItem(IMITATIVE_REPERTOIRE_KEY),
      ]);
      if (protoRaw) setProtoConversations(JSON.parse(protoRaw));
      if (gazeRaw) setGazeAlternations(JSON.parse(gazeRaw));
      if (jointRaw) setJointAttentionSessions(JSON.parse(jointRaw));
      if (affectiveRaw) setAffectiveSharing(JSON.parse(affectiveRaw));
      if (mothereseRaw) setMothereseResponses(JSON.parse(mothereseRaw));
      if (imitativeRaw) setImitativeRepertoire(JSON.parse(imitativeRaw));
      else {
        const def = DEFAULT_IMITATIVE_ACTIONS.map(action => ({ action, date_learned: undefined, notes: undefined, has_media: false }));
        setImitativeRepertoire(def);
      }
    } catch {}
  };

  const saveProtoConversations = async (entries: ProtoConversationEntry[]) => {
    try {
      await safeSetItem(PROTO_CONVERSATION_KEY, JSON.stringify(entries));
      setProtoConversations(entries);
    } catch {}
  };

  const saveGazeAlternations = async (entries: GazeAlternationEntry[]) => {
    try {
      await safeSetItem(GAZE_ALTERNATION_KEY, JSON.stringify(entries));
      setGazeAlternations(entries);
    } catch {}
  };

  const saveJointAttention = async (entries: JointAttentionEntry[]) => {
    try {
      await safeSetItem(JOINT_ATTENTION_KEY, JSON.stringify(entries));
      setJointAttentionSessions(entries);
    } catch {}
  };

  const saveAffectiveSharing = async (entries: AffectiveSharingEntry[]) => {
    try {
      await safeSetItem(AFFECTIVE_SHARING_KEY, JSON.stringify(entries));
      setAffectiveSharing(entries);
    } catch {}
  };

  const saveMothereseResponses = async (entries: MothereseResponseEntry[]) => {
    try {
      await safeSetItem(MOTHERESE_RESPONSE_KEY, JSON.stringify(entries));
      setMothereseResponses(entries);
    } catch {}
  };

  const saveImitativeRepertoire = async (items: ImitativeItem[]) => {
    try {
      await safeSetItem(IMITATIVE_REPERTOIRE_KEY, JSON.stringify(items));
      setImitativeRepertoire(items);
    } catch {}
  };

  const getTodayProtoCount = (): number => {
    const today = getDateStr();
    const entry = protoConversations.find(e => e.date === today);
    return entry?.count || 0;
  };

  const get7DayStreak = (): number => {
    const last7 = getLast7Days();
    let streak = 0;
    for (let i = last7.length - 1; i >= 0; i--) {
      const entry = protoConversations.find(e => e.date === last7[i]);
      if (entry && entry.count > 0) streak++;
      else break;
    }
    return streak;
  };

  const getTodayGazeCount = (): number => {
    const today = getDateStr();
    const entry = gazeAlternations.find(e => e.date === today);
    return entry?.count || 0;
  };

  const get14DayProtoData = (): { date: string; count: number }[] => {
    const last14 = getLast14Days();
    return last14.map(date => {
      const entry = protoConversations.find(e => e.date === date);
      return { date, count: entry?.count || 0 };
    });
  };

  const getAverageJointDuration = (): number => {
    if (jointAttentionSessions.length === 0) return 0;
    const total = jointAttentionSessions.reduce((sum, s) => sum + s.duration_seconds, 0);
    return Math.round(total / jointAttentionSessions.length);
  };

  const getTodayAffectiveScore = (): number => {
    const today = getDateStr();
    const entry = affectiveSharing.find(e => e.date === today);
    return entry?.score || 0;
  };

  const getMotheresePositiveCount = (): number => {
    return mothereseResponses.filter(r => r.engaged).length;
  };

  const getImitativeCount = (): number => {
    return imitativeRepertoire.filter(i => i.date_learned).length;
  };

  const handleAddProtoConversation = async () => {
    const today = getDateStr();
    const existing = protoConversations.find(e => e.date === today);
    let updated: ProtoConversationEntry[];
    if (existing) {
      updated = protoConversations.map(e => 
        e.date === today ? { ...e, count: e.count + protoCount } : e
      );
    } else {
      updated = [...protoConversations, { date: today, count: protoCount }];
    }
    await saveProtoConversations(updated);
    setShowAddProto(false);
    setProtoCount(1);
  };

  const handleQuickAddProto = async (amount: number) => {
    const today = getDateStr();
    const existing = protoConversations.find(e => e.date === today);
    let updated: ProtoConversationEntry[];
    if (existing) {
      updated = protoConversations.map(e => 
        e.date === today ? { ...e, count: e.count + amount } : e
      );
    } else {
      updated = [...protoConversations, { date: today, count: amount }];
    }
    await saveProtoConversations(updated);
  };

  const handleLogGaze = async () => {
    const today = getDateStr();
    const existing = gazeAlternations.find(e => e.date === today);
    let updated: GazeAlternationEntry[];
    if (existing) {
      updated = gazeAlternations.map(e => {
        if (e.date === today) {
          const objects = gazeObject.trim() ? [...(e.objects || []), gazeObject.trim()] : e.objects;
          return { ...e, count: e.count + 1, objects };
        }
        return e;
      });
    } else {
      updated = [...gazeAlternations, { 
        date: today, 
        count: 1, 
        objects: gazeObject.trim() ? [gazeObject.trim()] : undefined 
      }];
    }
    await saveGazeAlternations(updated);
    setShowAddGaze(false);
    setGazeObject('');
  };

  const handleStartJointAttention = () => {
    setJointStartTime(Date.now());
  };

  const handleStopJointAttention = async () => {
    if (!jointStartTime) return;
    const duration = Math.round((Date.now() - jointStartTime) / 1000);
    const entry: JointAttentionEntry = {
      id: generateId(),
      date: getDateStr(),
      duration_seconds: duration,
    };
    const updated = [entry, ...jointAttentionSessions];
    await saveJointAttention(updated);
    setJointStartTime(null);
    setJointDuration(0);
  };

  const handleSaveAffective = async () => {
    const today = getDateStr();
    const entry: AffectiveSharingEntry = {
      date: today,
      score: affectiveIndicators.length as 0 | 1 | 2 | 3,
      indicators: [...affectiveIndicators],
    };
    const existing = affectiveSharing.find(e => e.date === today);
    let updated: AffectiveSharingEntry[];
    if (existing) {
      updated = affectiveSharing.map(e => e.date === today ? entry : e);
    } else {
      updated = [...affectiveSharing, entry];
    }
    await saveAffectiveSharing(updated);
    setShowAffectiveChecklist(false);
    setAffectiveIndicators([]);
  };

  const handleAddMotherese = async () => {
    const entry: MothereseResponseEntry = {
      date: getDateStr(),
      engaged: mothereseEngaged,
      note: mothereseNote.trim() || undefined,
    };
    const updated = [entry, ...mothereseResponses];
    await saveMothereseResponses(updated);
    setShowAddMotherese(false);
    setMothereseNote('');
  };

  const handleToggleImitative = async (action: string) => {
    const existing = imitativeRepertoire.find(i => i.action === action);
    if (existing?.date_learned) {
      const updated = imitativeRepertoire.map(i => 
        i.action === action ? { ...i, date_learned: undefined } : i
      );
      await saveImitativeRepertoire(updated);
    } else {
      const updated = imitativeRepertoire.map(i => 
        i.action === action ? { ...i, date_learned: getDateStr() } : i
      );
      await saveImitativeRepertoire(updated);
    }
  };

  const handleAddCustomImitative = async () => {
    if (!customAction.trim()) return;
    const newItem: ImitativeItem = {
      action: customAction.trim().toLowerCase().replace(/\s+/g, '_'),
      date_learned: getDateStr(),
    };
    const updated = [...imitativeRepertoire, newItem];
    await saveImitativeRepertoire(updated);
    setCustomAction('');
    setShowAddImitative(false);
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 20 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text, marginTop: 4 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 12 },
    card: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    cardRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardValue: { fontSize: 32, fontWeight: 'bold', color: C.accent },
    cardLabel: { fontSize: 13, color: C.muted },
    quickBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
    quickBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: C.background,
      alignItems: 'center',
    },
    quickBtnText: { fontSize: 14, fontWeight: '600', color: C.text },
    quickBtnPrimary: { backgroundColor: C.accent },
    quickBtnPrimaryText: { color: '#fff' },
    chartContainer: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    chartBarContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 80,
      gap: 4,
    },
    chartBar: {
      flex: 1,
      backgroundColor: C.accent,
      borderRadius: 4,
      minHeight: 4,
    },
    chartLabel: { fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 },
    entryCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    entryType: { fontSize: 15, fontWeight: '600', color: C.text },
    entryDetail: { fontSize: 13, color: C.muted, marginTop: 2 },
    checklistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.background,
    },
    checkbox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: C.accent,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: { backgroundColor: C.accent },
    checklistText: { flex: 1, fontSize: 14, color: C.text },
    milestoneCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    milestoneAge: { fontSize: 16, fontWeight: '700', color: C.accent },
    milestoneItems: { marginTop: 8 },
    milestoneItem: { fontSize: 13, color: C.text, marginBottom: 4 },
    milestoneItemDone: { color: C.accent },
    emptyText: { color: C.muted, textAlign: 'center', paddingVertical: 30 },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 20, textAlign: 'center' },
    inputLabel: { fontSize: 14, color: C.muted, marginBottom: 8 },
    textInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: C.text,
      marginBottom: 16,
    },
    toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    toggleBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: C.background,
      alignItems: 'center',
    },
    toggleBtnActive: { backgroundColor: C.accent + '30', borderWidth: 2, borderColor: C.accent },
    toggleBtnText: { fontSize: 14, fontWeight: '600', color: C.text },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 25,
      backgroundColor: C.background,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 16, fontWeight: '600', color: C.muted },
    saveBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 25,
      backgroundColor: C.accent,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    timerBtn: {
      backgroundColor: C.accent,
      borderRadius: 25,
      paddingVertical: 20,
      alignItems: 'center',
      marginTop: 12,
    },
    timerBtnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    timerDisplay: { fontSize: 48, fontWeight: 'bold', color: C.text, textAlign: 'center', marginVertical: 20 },
    benchmarkBtn: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    benchmarkTitle: { fontSize: 16, fontWeight: '600', color: C.text },
  });

  const chartData = get14DayProtoData();
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('protoconversation.greeting')}</Text>
          <Text style={styles.title}>💬 {t('protoconversation.title')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('protoconversation.protoCounter.title')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardValue}>{getTodayProtoCount()}</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.protoCounter.today')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardValue}>{get7DayStreak()}</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.protoCounter.streak')}</Text>
              </View>
            </View>
            <View style={styles.quickBtns}>
              <TouchableOpacity 
                style={styles.quickBtn} 
                onPress={() => handleQuickAddProto(1)}
                accessibilityLabel={t('protoconversation.protoCounter.add1')}
              >
                <Text style={styles.quickBtnText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickBtn} 
                onPress={() => handleQuickAddProto(5)}
                accessibilityLabel={t('protoconversation.protoCounter.add5')}
              >
                <Text style={styles.quickBtnText}>+5</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickBtn, styles.quickBtnPrimary]} 
                onPress={() => handleQuickAddProto(10)}
                accessibilityLabel={t('protoconversation.protoCounter.add10')}
              >
                <Text style={[styles.quickBtnText, styles.quickBtnPrimaryText]}>+10</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.chartContainer}>
            <Text style={styles.cardLabel}>{t('protoconversation.protoCounter.last14Days')}</Text>
            <View style={styles.chartBarContainer}>
              {chartData.map((d, i) => (
                <View key={d.date} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[styles.chartBar, { height: Math.max((d.count / maxCount) * 60, 4) }]} />
                  {i % 2 === 0 && <Text style={styles.chartLabel}>{d.date.slice(5)}</Text>}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('protoconversation.gazeAlternation.title')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardValue}>{getTodayGazeCount()}</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.gazeAlternation.today')}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.quickBtn, styles.quickBtnPrimary, { marginTop: 12 }]} 
              onPress={handleLogGaze}
              accessibilityLabel={t('protoconversation.gazeAlternation.sawIt')}
            >
              <Text style={[styles.quickBtnText, styles.quickBtnPrimaryText]}>{t('protoconversation.gazeAlternation.sawIt')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('protoconversation.jointAttention.title')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardValue}>{getAverageJointDuration()}s</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.jointAttention.avgDuration')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardValue}>{jointAttentionSessions.length}</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.jointAttention.sessions')}</Text>
              </View>
            </View>
            {jointStartTime ? (
              <TouchableOpacity 
                style={styles.timerBtn} 
                onPress={handleStopJointAttention}
                accessibilityLabel={t('protoconversation.jointAttention.stop')}
              >
                <Text style={styles.timerBtnText}>{t('protoconversation.jointAttention.stop')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.timerBtn} 
                onPress={handleStartJointAttention}
                accessibilityLabel={t('protoconversation.jointAttention.start')}
              >
                <Text style={styles.timerBtnText}>{t('protoconversation.jointAttention.start')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('protoconversation.affectiveSharing.title')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardValue}>{getTodayAffectiveScore()}/3</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.affectiveSharing.todayScore')}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.quickBtn, styles.quickBtnPrimary, { marginTop: 12 }]} 
              onPress={() => setShowAffectiveChecklist(true)}
              accessibilityLabel={t('protoconversation.affectiveSharing.check')}
            >
              <Text style={[styles.quickBtnText, styles.quickBtnPrimaryText]}>{t('protoconversation.affectiveSharing.check')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('protoconversation.motherese.title')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardValue}>{getMotheresePositiveCount()}</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.motherese.positiveResponses')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardValue}>{mothereseResponses.length}</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.motherese.totalLogged')}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.quickBtn, styles.quickBtnPrimary, { marginTop: 12 }]} 
              onPress={() => setShowAddMotherese(true)}
              accessibilityLabel={t('protoconversation.motherese.log')}
            >
              <Text style={[styles.quickBtnText, styles.quickBtnPrimaryText]}>{t('protoconversation.motherese.log')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('protoconversation.imitative.title')}</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View>
                <Text style={styles.cardValue}>{getImitativeCount()}</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.imitative.learned')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardValue}>{imitativeRepertoire.length}</Text>
                <Text style={styles.cardLabel}>{t('protoconversation.imitative.total')}</Text>
              </View>
            </View>
          </View>
          {imitativeRepertoire.slice(0, 5).map(item => (
            <TouchableOpacity 
              key={item.action} 
              style={styles.checklistRow}
              onPress={() => handleToggleImitative(item.action)}
              accessibilityLabel={t(`protoconversation.imitative.actions.${item.action}`)}
            >
              <View style={[styles.checkbox, item.date_learned && styles.checkboxChecked]}>
                {item.date_learned && <MaterialCommunityIcons name="check" size={20} color="#fff" />}
              </View>
              <Text style={[styles.checklistText, item.date_learned && { color: C.accent }]}>
                {t(`protoconversation.imitative.actions.${item.action}`)}
              </Text>
              {item.date_learned && (
                <Text style={{ color: C.muted, fontSize: 12 }}>{item.date_learned.slice(5)}</Text>
              )}
            </TouchableOpacity>
          ))}
          {imitativeRepertoire.length > 5 && (
            <TouchableOpacity 
              style={[styles.quickBtn, { marginTop: 8 }]} 
              onPress={() => {}}
            >
              <Text style={styles.quickBtnText}>+{imitativeRepertoire.length - 5} more</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.benchmarkBtn} 
            onPress={() => setShowBenchmarks(!showBenchmarks)}
            accessibilityLabel={t('protoconversation.benchmarks.title')}
          >
            <Text style={styles.benchmarkTitle}>
              <MaterialCommunityIcons name={showBenchmarks ? "chevron-up" : "chevron-down"} size={20} color={C.text} /> {' '}
              {t('protoconversation.benchmarks.title')}
            </Text>
          </TouchableOpacity>
          {showBenchmarks && BENCHMARKS.map(b => (
            <View key={b.age} style={styles.milestoneCard}>
              <Text style={styles.milestoneAge}>{b.age}</Text>
              <View style={styles.milestoneItems}>
                <Text style={[styles.milestoneItem, b.protoConversation && styles.milestoneItemDone]}>
                  • {t('protoconversation.benchmarks.protoConversation')}: {b.protoConversation ? '✓' : '—'}
                </Text>
                <Text style={[styles.milestoneItem, b.jointAttention && styles.milestoneItemDone]}>
                  • {t('protoconversation.benchmarks.jointAttention')}: {b.jointAttention ? '✓' : '—'}
                </Text>
                <Text style={[styles.milestoneItem, b.gazeAlternation && styles.milestoneItemDone]}>
                  • {t('protoconversation.benchmarks.gazeAlternation')}: {b.gazeAlternation ? '✓' : '—'}
                </Text>
                <Text style={styles.milestoneItem}>
                  • {t('protoconversation.benchmarks.imitativeWords')}: {b.imitativeWords}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {showAffectiveChecklist && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAffectiveChecklist(false)} accessibilityLabel="Close modal" />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('protoconversation.affectiveSharing.checklist')}</Text>
            
            {['smiled_when_I_smiled', 'frowned_when_I_frowned', 'excited_when_I_showed_excitement'].map(indicator => (
              <TouchableOpacity 
                key={indicator}
                style={styles.checklistRow}
                onPress={() => {
                  setAffectiveIndicators(prev => 
                    prev.includes(indicator) 
                      ? prev.filter(i => i !== indicator)
                      : [...prev, indicator]
                  );
                }}
                accessibilityLabel={t(`protoconversation.affectiveSharing.${indicator}`)}
              >
                <View style={[styles.checkbox, affectiveIndicators.includes(indicator) && styles.checkboxChecked]}>
                  {affectiveIndicators.includes(indicator) && <MaterialCommunityIcons name="check" size={20} color="#fff" />}
                </View>
                <Text style={styles.checklistText}>{t(`protoconversation.affectiveSharing.${indicator}`)}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAffectiveChecklist(false)} accessibilityLabel="Cancel">
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAffective} accessibilityLabel="Save">
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showAddMotherese && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAddMotherese(false)} accessibilityLabel="Close modal" />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('protoconversation.motherese.log')}</Text>

            <Text style={styles.inputLabel}>{t('protoconversation.motherese.engaged')}</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, mothereseEngaged && styles.toggleBtnActive]}
                onPress={() => setMothereseEngaged(true)}
                accessibilityLabel={t('protoconversation.motherese.yes')}
              >
                <Text style={styles.toggleBtnText}>{t('protoconversation.motherese.yes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !mothereseEngaged && styles.toggleBtnActive]}
                onPress={() => setMothereseEngaged(false)}
                accessibilityLabel={t('protoconversation.motherese.no')}
              >
                <Text style={styles.toggleBtnText}>{t('protoconversation.motherese.no')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddMotherese(false)} accessibilityLabel="Cancel">
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddMotherese} accessibilityLabel="Save">
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

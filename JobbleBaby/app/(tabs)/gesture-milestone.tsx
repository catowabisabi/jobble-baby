import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const GESTURE_KEY = STORAGE_KEYS.GESTURE_EVENTS;
const MILESTONE_KEY = STORAGE_KEYS.GESTURE_MILESTONES;
const WORD_KEY = STORAGE_KEYS.GESTURE_WORD_BURSTS;
const BRIDGE_KEY = STORAGE_KEYS.GESTURE_BRIDGE_PROGRESS;

interface GestureEvent {
  id: string;
  date: string;
  who: 'baby' | 'caregiver';
  objectName: string;
  jointAttention: boolean;
  gestureType: 'proto_declarative' | 'proto_imperative' | 'social';
  notes?: string;
}

interface GestureMilestone {
  id: string;
  name: string;
  minMonths: number;
  maxMonths: number;
  achieved: boolean;
  dateAchieved?: string;
}

interface WordBurst {
  id: string;
  date: string;
  word: string;
  context: 'spontaneous' | 'elicited';
}

interface BridgeProgress {
  protoDeclarative: boolean;
  jointAttention: boolean;
  firstWords: boolean;
}

const GESTURE_MILESTONES_DEF: Omit<GestureMilestone, 'achieved' | 'dateAchieved'>[] = [
  { id: 'social_smile', name: 'socialSmile', minMonths: 0, maxMonths: 2 },
  { id: 'object_tracking', name: 'objectTracking', minMonths: 2, maxMonths: 4 },
  { id: 'reaching', name: 'reachingObjects', minMonths: 3, maxMonths: 5 },
  { id: 'proto_declarative', name: 'protoDeclarative', minMonths: 9, maxMonths: 14 },
  { id: 'joint_attention', name: 'jointAttention', minMonths: 9, maxMonths: 14 },
  { id: 'symbolic_gestures', name: 'symbolicGestures', minMonths: 9, maxMonths: 14 },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export default function GestureMilestoneScreen() {
  const [gestureEvents, setGestureEvents] = useState<GestureEvent[]>([]);
  const [milestones, setMilestones] = useState<GestureMilestone[]>([]);
  const [wordBursts, setWordBursts] = useState<WordBurst[]>([]);
  const [bridgeProgress, setBridgeProgress] = useState<BridgeProgress>({ protoDeclarative: false, jointAttention: false, firstWords: false });
  const [showAddGesture, setShowAddGesture] = useState(false);
  const [showAddWord, setShowAddWord] = useState(false);
  const [who, setWho] = useState<'baby' | 'caregiver'>('baby');
  const [objectName, setObjectName] = useState('');
  const [jointAttention, setJointAttention] = useState(false);
  const [gestureType, setGestureType] = useState<'proto_declarative' | 'proto_imperative' | 'social'>('proto_declarative');
  const [wordText, setWordText] = useState('');
  const [wordContext, setWordContext] = useState<'spontaneous' | 'elicited'>('spontaneous');

  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [gestureRaw, milestoneRaw, wordRaw, bridgeRaw] = await Promise.all([
        safeGetItem(GESTURE_KEY),
        safeGetItem(MILESTONE_KEY),
        safeGetItem(WORD_KEY),
        safeGetItem(BRIDGE_KEY),
      ]);
      if (gestureRaw) setGestureEvents(JSON.parse(gestureRaw));
      if (milestoneRaw) setMilestones(JSON.parse(milestoneRaw));
      else {
        const def = GESTURE_MILESTONES_DEF.map(m => ({ ...m, achieved: false }));
        setMilestones(def);
      }
      if (wordRaw) setWordBursts(JSON.parse(wordRaw));
      if (bridgeRaw) setBridgeProgress(JSON.parse(bridgeRaw));
    } catch {}
  };

  const saveGestures = async (events: GestureEvent[]) => {
    try {
      await safeSetItem(GESTURE_KEY, JSON.stringify(events));
      setGestureEvents(events);
    } catch {}
  };

  const saveMilestones = async (ms: GestureMilestone[]) => {
    try {
      await safeSetItem(MILESTONE_KEY, JSON.stringify(ms));
      setMilestones(ms);
    } catch {}
  };

  const saveWords = async (words: WordBurst[]) => {
    try {
      await safeSetItem(WORD_KEY, JSON.stringify(words));
      setWordBursts(words);
    } catch {}
  };

  const saveBridge = async (bridge: BridgeProgress) => {
    try {
      await safeSetItem(BRIDGE_KEY, JSON.stringify(bridge));
      setBridgeProgress(bridge);
    } catch {}
  };

  const handleAddGesture = async () => {
    if (!objectName.trim()) {
      Alert.alert(t('common.error') || 'Error', 'Please enter object name');
      return;
    }
    const entry: GestureEvent = {
      id: generateId(),
      date: getDateStr(),
      who,
      objectName: objectName.trim(),
      jointAttention,
      gestureType,
    };
    const updated = [entry, ...gestureEvents];
    await saveGestures(updated);

    if (gestureType === 'proto_declarative' && !bridgeProgress.protoDeclarative) {
      const newBridge = { ...bridgeProgress, protoDeclarative: true };
      await saveBridge(newBridge);
    }
    if (jointAttention && !bridgeProgress.jointAttention) {
      const newBridge = { ...bridgeProgress, jointAttention: true };
      await saveBridge(newBridge);
    }

    setShowAddGesture(false);
    setObjectName('');
    setJointAttention(false);
    setGestureType('proto_declarative');
  };

  const handleAddWord = async () => {
    if (!wordText.trim()) {
      Alert.alert(t('common.error') || 'Error', 'Please enter word');
      return;
    }
    const entry: WordBurst = {
      id: generateId(),
      date: getDateStr(),
      word: wordText.trim(),
      context: wordContext,
    };
    const updated = [entry, ...wordBursts];
    await saveWords(updated);

    if (!bridgeProgress.firstWords) {
      const newBridge = { ...bridgeProgress, firstWords: true };
      await saveBridge(newBridge);
    }

    setShowAddWord(false);
    setWordText('');
    setWordContext('spontaneous');
  };

  const handleMilestoneToggle = async (id: string) => {
    const updated = milestones.map(m => {
      if (m.id === id) {
        return {
          ...m,
          achieved: !m.achieved,
          dateAchieved: !m.achieved ? getDateStr() : undefined,
        };
      }
      return m;
    });
    await saveMilestones(updated);
  };

  const hasOverdueMilestone = (): boolean => {
    const now = new Date();
    const currentMonths = 0;
    return milestones.some(m => {
      if (m.achieved) return false;
      return currentMonths > m.maxMonths + 1;
    });
  };

  const getMilestoneStatus = (m: GestureMilestone): 'achieved' | 'in_window' | 'overdue' | 'pending' => {
    if (m.achieved) return 'achieved';
    return 'pending';
  };

  const getBridgePosition = (): number => {
    if (bridgeProgress.firstWords) return 3;
    if (bridgeProgress.jointAttention) return 2;
    if (bridgeProgress.protoDeclarative) return 1;
    return 0;
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
    alertBanner: {
      backgroundColor: '#EF4444' + '20',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    alertIcon: { marginRight: 12 },
    alertText: { flex: 1 },
    alertTitle: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
    alertBody: { fontSize: 13, color: C.text, marginTop: 2 },
    card: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: { fontSize: 15, fontWeight: '600', color: C.text },
    cardDetail: { fontSize: 13, color: C.muted, marginTop: 2 },
    milestoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.background,
    },
    milestoneCheckbox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: C.accent,
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    milestoneInfo: { flex: 1 },
    milestoneName: { fontSize: 14, fontWeight: '600', color: C.text },
    milestoneWindow: { fontSize: 12, color: C.muted },
    milestoneStatus: { fontSize: 12, fontWeight: '600' },
    bridgeContainer: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
    },
    bridgeTrack: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
    },
    bridgeStep: {
      flex: 1,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bridgeDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.background,
      borderWidth: 2,
      borderColor: C.muted,
    },
    bridgeDotActive: {
      backgroundColor: C.accent,
      borderColor: C.accent,
    },
    bridgeLine: {
      flex: 1,
      height: 2,
      backgroundColor: C.background,
    },
    bridgeLineActive: { backgroundColor: C.accent },
    bridgeLabel: { fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 },
    addBtn: {
      backgroundColor: C.accent,
      borderRadius: 25,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 20,
    },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    addBtnRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    addBtnHalf: {
      flex: 1,
      backgroundColor: C.accent,
      borderRadius: 25,
      paddingVertical: 14,
      alignItems: 'center',
    },
    addBtnHalfText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    entryCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
    },
    entryType: { fontSize: 15, fontWeight: '600', color: C.text },
    entryDetail: { fontSize: 13, color: C.muted, marginTop: 2 },
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
    emptyText: { color: C.muted, textAlign: 'center', paddingVertical: 30 },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('gestureMilestone.greeting')}</Text>
          <Text style={styles.title}>👆 {t('gestureMilestone.title')}</Text>
        </View>

        {hasOverdueMilestone() && (
          <View style={styles.alertBanner}>
            <MaterialCommunityIcons style={styles.alertIcon} name="alert" size={24} color="#EF4444" />
            <View style={styles.alertText}>
              <Text style={styles.alertTitle}>{t('gestureMilestone.earlyWarning')}</Text>
              <Text style={styles.alertBody}>Some milestones are overdue. Consider professional review.</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('gestureMilestone.bridgeViz')}</Text>
          <View style={styles.bridgeContainer}>
            <View style={styles.bridgeTrack}>
              <View style={styles.bridgeStep}>
                <View style={[styles.bridgeDot, bridgeProgress.protoDeclarative && styles.bridgeDotActive]} />
                <Text style={styles.bridgeLabel}>Pointing</Text>
              </View>
              <View style={[styles.bridgeLine, bridgeProgress.jointAttention && styles.bridgeLineActive]} />
              <View style={styles.bridgeStep}>
                <View style={[styles.bridgeDot, bridgeProgress.jointAttention && styles.bridgeDotActive]} />
                <Text style={styles.bridgeLabel}>Joint Attn</Text>
              </View>
              <View style={[styles.bridgeLine, bridgeProgress.firstWords && styles.bridgeLineActive]} />
              <View style={styles.bridgeStep}>
                <View style={[styles.bridgeDot, bridgeProgress.firstWords && styles.bridgeDotActive]} />
                <Text style={styles.bridgeLabel}>Words</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.addBtnRow}>
          <TouchableOpacity
            style={styles.addBtnHalf}
            onPress={() => setShowAddGesture(true)}
            accessibilityLabel="Add gesture entry"
          >
            <Text style={styles.addBtnHalfText}>{t('gestureMilestone.logGesture')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtnHalf}
            onPress={() => setShowAddWord(true)}
            accessibilityLabel="Add word entry"
          >
            <Text style={styles.addBtnHalfText}>{t('gestureMilestone.logWord')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('gestureMilestone.gestureTimeline')}</Text>
          {gestureEvents.length === 0 ? (
            <Text style={styles.emptyText}>{t('gestureMilestone.noGestures')}</Text>
          ) : (
            gestureEvents.slice(0, 10).map(event => (
              <View key={event.id} style={styles.entryCard}>
                <Text style={styles.entryType}>
                  {t(`gestureMilestone.initiator.${event.who}`)} → {event.objectName}
                </Text>
                <Text style={styles.entryDetail}>
                  {t(`gestureMilestone.gestureTypes.${event.gestureType}`)} | {event.date}
                  {event.jointAttention ? ' | ✓ ' + t('gestureMilestone.jointAttention.yes') : ''}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('gestureMilestone.wordBurst')}</Text>
          {wordBursts.length === 0 ? (
            <Text style={styles.emptyText}>{t('gestureMilestone.noWords')}</Text>
          ) : (
            wordBursts.slice(0, 10).map(word => (
              <View key={word.id} style={styles.entryCard}>
                <Text style={styles.entryType}>"{word.word}"</Text>
                <Text style={styles.entryDetail}>{word.date} | {word.context}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {showAddGesture && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAddGesture(false)} accessibilityLabel="Close modal" />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('gestureMilestone.logGesture')}</Text>

            <Text style={styles.inputLabel}>{t('gestureMilestone.initiator.baby')}</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, who === 'baby' && styles.toggleBtnActive]}
                onPress={() => setWho('baby')}
                accessibilityLabel="Baby initiated"
              >
                <Text style={styles.toggleBtnText}>{t('gestureMilestone.initiator.baby')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, who === 'caregiver' && styles.toggleBtnActive]}
                onPress={() => setWho('caregiver')}
                accessibilityLabel="Caregiver initiated"
              >
                <Text style={styles.toggleBtnText}>{t('gestureMilestone.initiator.caregiver')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('gestureMilestone.objectPointed')}</Text>
            <View style={styles.textInput}>
              <TouchableOpacity onPress={() => {}} accessibilityLabel="Object name input">
                <Text style={{ color: objectName ? C.text : C.muted }}>{objectName || 'Tap to enter...'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('gestureMilestone.jointAttention.yes')}</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, jointAttention && styles.toggleBtnActive]}
                onPress={() => setJointAttention(true)}
                accessibilityLabel="Joint attention yes"
              >
                <Text style={styles.toggleBtnText}>{t('gestureMilestone.jointAttention.yes')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, !jointAttention && styles.toggleBtnActive]}
                onPress={() => setJointAttention(false)}
                accessibilityLabel="Joint attention no"
              >
                <Text style={styles.toggleBtnText}>{t('gestureMilestone.jointAttention.no')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddGesture(false)} accessibilityLabel="Cancel">
                <Text style={styles.cancelBtnText}>{t('gestureMilestone.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddGesture} accessibilityLabel="Save gesture">
                <Text style={styles.saveBtnText}>{t('gestureMilestone.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showAddWord && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAddWord(false)} accessibilityLabel="Close modal" />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('gestureMilestone.logWord')}</Text>

            <Text style={styles.inputLabel}>{t('gestureMilestone.word.word')}</Text>
            <View style={styles.textInput}>
              <TouchableOpacity onPress={() => {}} accessibilityLabel="Word input">
                <Text style={{ color: wordText ? C.text : C.muted }}>{wordText || 'Tap to enter...'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>{t('gestureMilestone.context')}</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, wordContext === 'spontaneous' && styles.toggleBtnActive]}
                onPress={() => setWordContext('spontaneous')}
                accessibilityLabel="Spontaneous context"
              >
                <Text style={styles.toggleBtnText}>Spontaneous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, wordContext === 'elicited' && styles.toggleBtnActive]}
                onPress={() => setWordContext('elicited')}
                accessibilityLabel="Elicited context"
              >
                <Text style={styles.toggleBtnText}>Elicited</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddWord(false)} accessibilityLabel="Cancel">
                <Text style={styles.cancelBtnText}>{t('gestureMilestone.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddWord} accessibilityLabel="Save word">
                <Text style={styles.saveBtnText}>{t('gestureMilestone.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

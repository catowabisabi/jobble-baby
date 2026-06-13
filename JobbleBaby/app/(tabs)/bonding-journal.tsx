import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const PROFILE_KEY = '@jobble_baby_profile';
const ENTRIES_KEY = STORAGE_KEYS.BONDING_ENTRIES;
const SKIN_TO_SKIN_KEY = STORAGE_KEYS.SKIN_TO_SKIN;
const MOOD_KEY = STORAGE_KEYS.MOOD_CHECKINS;
const MILESTONES_KEY = STORAGE_KEYS.BONDING_MILESTONES;

interface BabyProfile {
  name: string;
  birthDate: string;
  gender: string;
  photoUri?: string;
}

interface BondingEntry {
  id: string;
  type: 'first_hold' | 'first_smile' | 'first_bath' | 'feeding_bond' | 'lullaby_sung' | 'tummy_time_talk';
  photoUri?: string;
  notes: string;
  timestamp: string;
  date: string;
}

interface SkinToSkinData {
  totalSeconds: number;
  lastSessionSeconds: number;
  lastSessionDate: string;
}

interface MoodEntry {
  date: string;
  score: number;
}

const MOMENT_TYPES = [
  { id: 'first_hold', labelKey: 'bondingJournal.momentFirstHold', icon: 'hand-waving' },
  { id: 'first_smile', labelKey: 'bondingJournal.momentFirstSmile', icon: 'emoticon-happy' },
  { id: 'first_bath', labelKey: 'bondingJournal.momentFirstBath', icon: 'bathtub' },
  { id: 'feeding_bond', labelKey: 'bondingJournal.momentFeedingBond', icon: 'baby-bottle' },
  { id: 'lullaby_sung', labelKey: 'bondingJournal.momentLullabySung', icon: 'music' },
  { id: 'tummy_time_talk', labelKey: 'bondingJournal.momentTummyTimeTalk', icon: 'human-handsup' },
] as const;

const BONDING_MILESTONES = [
  { id: 'first_hug', labelKey: 'bondingJournal.milestoneFirstHug', icon: 'heart' },
  { id: 'first_kiss', labelKey: 'bondingJournal.milestoneFirstKiss', icon: 'heart-multiple' },
  { id: 'first_story', labelKey: 'bondingJournal.milestoneFirstStory', icon: 'book-open-variant' },
  { id: 'first_bath_milestone', labelKey: 'bondingJournal.milestoneFirstBath', icon: 'bathtub' },
  { id: 'first_solid_reaction', labelKey: 'bondingJournal.milestoneFirstSolidReaction', icon: 'food-apple' },
] as const;

// i18n-derived (no longer hardcoded)
const MOOD_LABELS = ((): string[] => {
  const mood = require('../i18n/en.json').bondingJournal.mood as Record<string, string>;
  return mood ? Object.keys(mood) : [];
})();
const MOOD_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981'];

function calculateAgeInMonths(birthDate: string): number {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return Math.round(days / 30.44 * 10) / 10;
  } catch {
    return 0;
  }
}

function formatTimerDisplay(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function BondingJournalScreen() {
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [entries, setEntries] = useState<BondingEntry[]>([]);
  const [skinToSkin, setSkinToSkin] = useState<SkinToSkinData>({ totalSeconds: 0, lastSessionSeconds: 0, lastSessionDate: '' });
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [milestones, setMilestones] = useState<Record<string, boolean>>({});
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [entryNotes, setEntryNotes] = useState('');
  const [entryPhotoUri, setEntryPhotoUri] = useState<string | undefined>();
  const [showMoodPanel, setShowMoodPanel] = useState(false);
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  useEffect(() => {
    loadProfile();
    loadEntries();
    loadSkinToSkin();
    loadMood();
    loadMilestones();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      if (stored) setBabyProfile(JSON.parse(stored));
    } catch {}
  };

  const loadEntries = async () => {
    try {
      const stored = await AsyncStorage.getItem(ENTRIES_KEY);
      if (stored) setEntries(JSON.parse(stored));
    } catch {}
  };

  const loadSkinToSkin = async () => {
    try {
      const stored = await AsyncStorage.getItem(SKIN_TO_SKIN_KEY);
      if (stored) {
        const data: SkinToSkinData = JSON.parse(stored);
        setSkinToSkin(data);
      }
    } catch {}
  };

  const loadMood = async () => {
    try {
      const stored = await AsyncStorage.getItem(MOOD_KEY);
      if (stored) {
        const data: MoodEntry[] = JSON.parse(stored);
        setMoodEntries(data);
        const today = new Date().toISOString().split('T')[0];
        const todayEntry = data.find(e => e.date === today);
        if (todayEntry) setTodayMood(todayEntry.score);
      }
    } catch {}
  };

  const loadMilestones = async () => {
    try {
      const stored = await AsyncStorage.getItem(MILESTONES_KEY);
      if (stored) setMilestones(JSON.parse(stored));
    } catch {}
  };

  const saveSkinToSkin = async (data: SkinToSkinData) => {
    try {
      await AsyncStorage.setItem(SKIN_TO_SKIN_KEY, JSON.stringify(data));
    } catch {}
  };

  const saveMood = async (data: MoodEntry[]) => {
    try {
      await AsyncStorage.setItem(MOOD_KEY, JSON.stringify(data));
    } catch {}
  };

  const saveMilestones = async (data: Record<string, boolean>) => {
    try {
      await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(data));
    } catch {}
  };

  const startTimer = () => {
    setTimerRunning(true);
    setTimerSeconds(0);
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    const sessionSeconds = timerSeconds;
    const today = new Date().toISOString().split('T')[0];
    const newData: SkinToSkinData = {
      totalSeconds: skinToSkin.totalSeconds + sessionSeconds,
      lastSessionSeconds: sessionSeconds,
      lastSessionDate: today,
    };
    setSkinToSkin(newData);
    await saveSkinToSkin(newData);
    setTimerSeconds(0);
    if (sessionSeconds > 0) {
      Alert.alert(t('bondingJournal.timerSaved'), t('bondingJournal.sessionSaved', { minutes: Math.floor(sessionSeconds / 60) }));
    }
  };

  const handleAddEntry = async () => {
    if (!selectedType) return;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const newEntry: BondingEntry = {
      id: generateId(),
      type: selectedType as BondingEntry['type'],
      photoUri: entryPhotoUri,
      notes: entryNotes,
      timestamp: now,
      date: today,
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    try {
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
    } catch {}
    setShowAddEntry(false);
    setSelectedType('');
    setEntryNotes('');
    setEntryPhotoUri(undefined);
  };

  const handleMoodSelect = async (score: number) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = moodEntries.filter(e => e.date !== today);
    const updated = [...existing, { date: today, score }];
    setMoodEntries(updated);
    setTodayMood(score);
    await saveMood(updated);
    setShowMoodPanel(false);
  };

  const handleMilestoneToggle = async (id: string) => {
    const updated = { ...milestones, [id]: !milestones[id] };
    setMilestones(updated);
    await saveMilestones(updated);
  };

  const getBabyAgeText = (): string => {
    if (!babyProfile?.birthDate) return '';
    const months = calculateAgeInMonths(babyProfile.birthDate);
    if (months < 24) return `${months} months old`;
    const years = Math.floor(months / 12);
    const remainingMonths = Math.round(months % 12);
    return remainingMonths > 0 ? `${years}y ${remainingMonths}m old` : `${years} years old`;
  };

  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, BondingEntry[]>);

  const formatDateHeader = (dateStr: string): string => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return t('bondingJournal.today');
    if (dateStr === yesterday) return t('bondingJournal.yesterday');
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 20 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    babyInfoCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    babyAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: C.accent + '30',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    babyInfoText: { flex: 1 },
    babyName: { fontSize: 18, fontWeight: '700', color: C.text },
    babyAge: { fontSize: 13, color: C.muted, marginTop: 2 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 12 },
    timerCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
    },
    timerDisplay: {
      fontSize: 56,
      fontWeight: '700',
      color: C.text,
      fontVariant: ['tabular-nums'],
      letterSpacing: 2,
    },
    timerLabel: { fontSize: 14, color: C.muted, marginTop: 4 },
    timerButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
    timerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 25,
      gap: 8,
    },
    timerBtnStart: { backgroundColor: C.accent },
    timerBtnStop: { backgroundColor: '#EF4444' },
    timerBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    totalTimeCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    totalTimeIcon: { marginRight: 12 },
    totalTimeText: { fontSize: 15, color: C.text, flex: 1 },
    totalTimeValue: { fontSize: 15, fontWeight: '700', color: C.accent },
    moodCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    moodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    moodTitle: { fontSize: 16, fontWeight: '600', color: C.text },
    moodDate: { fontSize: 13, color: C.muted },
    moodSelectors: { flexDirection: 'row', justifyContent: 'space-between' },
    moodBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      marginHorizontal: 4,
      borderRadius: 8,
      backgroundColor: C.background,
    },
    moodBtnActive: { backgroundColor: MOOD_COLORS[todayMood ? todayMood - 1 : 2] + '30' },
    moodEmoji: { fontSize: 24 },
    moodLabel: { fontSize: 10, color: C.muted, marginTop: 4 },
    moodBtnLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    milestonesCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    milestonesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    milestoneItem: {
      width: '47%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: C.background,
      borderRadius: 10,
    },
    milestoneCheckbox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: C.accent,
      marginRight: 10,
      justifyContent: 'center',
      alignItems: 'center',
    }, // 44x44px touch target per WCAG 2.1 AA
    milestoneLabel: { fontSize: 13, color: C.text, flex: 1 },
    addEntryBtn: {
      backgroundColor: C.accent,
      borderRadius: 25,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 20,
    },
    addEntryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    historySection: {},
    dateGroup: { marginBottom: 20 },
    dateHeader: { fontSize: 14, fontWeight: '600', color: C.muted, marginBottom: 10, textTransform: 'uppercase' },
    entryCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
    },
    entryPhoto: {
      width: 56,
      height: 56,
      borderRadius: 10,
      backgroundColor: C.background,
      marginRight: 12,
    },
    entryContent: { flex: 1 },
    entryType: { fontSize: 15, fontWeight: '600', color: C.text },
    entryTime: { fontSize: 12, color: C.muted, marginTop: 2 },
    entryNotes: { fontSize: 13, color: C.text, marginTop: 4 },
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
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    typeBtn: {
      width: '47%',
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: C.background,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    typeBtnActive: { backgroundColor: C.accent + '20', borderWidth: 2, borderColor: C.accent },
    typeIcon: { fontSize: 20 },
    typeLabel: { fontSize: 13, color: C.text, flex: 1 },
    notesInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: C.text,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 16,
    },
    modalActions: { flexDirection: 'row', gap: 12 },
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
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('bondingJournal.greeting')}</Text>
          <Text style={styles.title}>💝 {t('bondingJournal.title')}</Text>
        </View>

        {babyProfile && (
          <View style={styles.babyInfoCard}>
            <View style={styles.babyAvatar}>
              <MaterialCommunityIcons name="baby-face" size={28} color={C.accent} />
            </View>
            <View style={styles.babyInfoText}>
              <Text style={styles.babyName}>{babyProfile.name || 'Baby'}</Text>
              <Text style={styles.babyAge}>{getBabyAgeText()}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('bondingJournal.skinToSkin')}</Text>
          <View style={styles.timerCard}>
            <Text style={styles.timerDisplay}>{formatTimerDisplay(timerRunning ? timerSeconds : 0)}</Text>
            <Text style={styles.timerLabel}>{timerRunning ? t('bondingJournal.timerRunning') : t('bondingJournal.timerIdle')}</Text>
            <View style={styles.timerButtons}>
              {timerRunning ? (
                <TouchableOpacity style={[styles.timerBtn, styles.timerBtnStop]} onPress={stopTimer}>
                                accessibilityLabel="Stop bonding-journal timer"
                  <MaterialCommunityIcons name="stop" size={22} color="#fff" />
                  <Text style={styles.timerBtnText}>{t('bondingJournal.stop')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.timerBtn, styles.timerBtnStart]} onPress={startTimer}>
                                accessibilityLabel="Start bonding-journal timer"
                  <MaterialCommunityIcons name="play" size={22} color="#fff" />
                  <Text style={styles.timerBtnText}>{t('bondingJournal.startTimer')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {skinToSkin.totalSeconds > 0 && (
            <View style={styles.totalTimeCard}>
              <MaterialCommunityIcons style={styles.totalTimeIcon} name="clock-outline" size={22} color={C.accent} />
              <Text style={styles.totalTimeText}>{t('bondingJournal.totalTime')}</Text>
              <Text style={styles.totalTimeValue}>{formatTimerDisplay(skinToSkin.totalSeconds)}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('bondingJournal.moodCheckIn')}</Text>
          <TouchableOpacity style={styles.moodCard} onPress={() => setShowMoodPanel(!showMoodPanel)}>
                          accessibilityLabel="Toggle bonding-journal panel"
            <View style={styles.moodHeader}>
              <Text style={styles.moodTitle}>{t('bondingJournal.howAreYou')}</Text>
              <Text style={styles.moodDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
            </View>
            <View style={styles.moodSelectors}>
              {[1, 2, 3, 4, 5].map(score => (
                <TouchableOpacity
                                accessibilityLabel="TouchableOpacity in bonding-journal"
                  key={score}
                  style={[styles.moodBtn, todayMood === score && styles.moodBtnActive]}
                  onPress={() => handleMoodSelect(score)}
                >
                  <Text style={styles.moodEmoji}>{['', '😔', '😕', '😐', '😊', '😄'][score]}</Text>
                  <Text style={[styles.moodLabel, todayMood === score && { color: MOOD_COLORS[score - 1] }]}>{t(`bondingJournal.mood.${MOOD_LABELS[score - 1]}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('bondingJournal.milestones')}</Text>
          <View style={styles.milestonesCard}>
            <View style={styles.milestonesGrid}>
              {BONDING_MILESTONES.map(milestone => (
                <TouchableOpacity
                                accessibilityLabel="TouchableOpacity in bonding-journal"
                  key={milestone.id}
                  style={styles.milestoneItem}
                  onPress={() => handleMilestoneToggle(milestone.id)}
                >
                  <View style={styles.milestoneCheckbox}>
                    {milestones[milestone.id] && <MaterialCommunityIcons name="check" size={16} color={C.accent} />}
                  </View>
                  <Text style={styles.milestoneLabel}>{t(milestone.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.addEntryBtn} onPress={() => setShowAddEntry(true)}>
                        accessibilityLabel="Toggle bonding-journal panel"
          <MaterialCommunityIcons name="plus" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addEntryBtnText}>{t('bondingJournal.addMoment')}</Text>
        </TouchableOpacity>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('bondingJournal.history')}</Text>
          {Object.keys(groupedEntries).length === 0 ? (
            <Text style={{ color: C.muted, textAlign: 'center', paddingVertical: 30 }}>
              {t('bondingJournal.noEntries')}
            </Text>
          ) : (
            Object.entries(groupedEntries).map(([date, dateEntries]) => (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{formatDateHeader(date)}</Text>
                {dateEntries.map(entry => {
                  const momentType = MOMENT_TYPES.find(m => m.id === entry.type);
                  return (
                    <View key={entry.id} style={styles.entryCard}>
                      {entry.photoUri ? (
                        <Image source={{ uri: entry.photoUri }} style={styles.entryPhoto} />
                      ) : (
                        <View style={[styles.entryPhoto, { justifyContent: 'center', alignItems: 'center' }]}>
                          <MaterialCommunityIcons name="image-outline" size={24} color={C.muted} />
                        </View>
                      )}
                      <View style={styles.entryContent}>
                        <Text style={styles.entryType}>{momentType ? t(momentType.labelKey) : entry.type}</Text>
                        <Text style={styles.entryTime}>{entry.timestamp}</Text>
                        {entry.notes ? <Text style={styles.entryNotes}>{entry.notes}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {showAddEntry && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowAddEntry(false)} />
                          accessibilityLabel="Toggle bonding-journal panel"
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('bondingJournal.addMoment')}</Text>
            <View style={styles.typeGrid}>
              {MOMENT_TYPES.map(mt => (
                <TouchableOpacity
                                accessibilityLabel="TouchableOpacity in bonding-journal"
                  key={mt.id}
                  style={[styles.typeBtn, selectedType === mt.id && styles.typeBtnActive]}
                  onPress={() => setSelectedType(mt.id)}
                >
                  <Text style={styles.typeIcon}>{
                    mt.id === 'first_hold' ? '👋' :
                    mt.id === 'first_smile' ? '😊' :
                    mt.id === 'first_bath' ? '🛁' :
                    mt.id === 'feeding_bond' ? '🍼' :
                    mt.id === 'lullaby_sung' ? '🎵' : '🗣️'
                  }</Text>
                  <Text style={styles.typeLabel}>{t(mt.labelKey)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder={t('bondingJournal.notesPlaceholder')}
              placeholderTextColor={C.muted}
              value={entryNotes}
              onChangeText={setEntryNotes}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddEntry(false)}>
                              accessibilityLabel="Toggle bonding-journal panel"
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                              accessibilityLabel="TouchableOpacity in bonding-journal"
                style={[styles.saveBtn, !selectedType && { opacity: 0.5 }]}
                onPress={handleAddEntry}
                disabled={!selectedType}
              >
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
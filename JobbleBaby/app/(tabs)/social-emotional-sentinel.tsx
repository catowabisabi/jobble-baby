import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { STORAGE_KEYS } from '../../store/storage-keys';
import { COLORS } from '../theme';

const STORAGE_KEY = STORAGE_KEYS.SOCIAL_EMOTIONAL_LOG;

type JealousyContext = 'sibling' | 'diverted' | 'toy' | 'other';
type SocialRefTrigger = 'newFood' | 'newPerson' | 'newObject' | 'stranger' | 'unfamiliarPlace';
type SocialRefResponse = 'approached' | 'hesitated' | 'rejected';
type JointEmpathyType = 'jointAttention' | 'empathyExpression' | 'triadicEngagement';
type FrustrationLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface BabyProfile {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
}

interface SocialEmotionalEntry {
  id: string;
  timestamp: string;
  type: 'jealousy' | 'socialRef' | 'jointEmpathy' | 'frustration';
  data: JealousyData | SocialRefData | JointEmpathyData | FrustrationData;
  babyAgeAtEntry: { years: number; months: number; days: number };
}

interface JealousyData {
  context: JealousyContext;
  intensity: number;
  notes: string;
}

interface SocialRefData {
  trigger: SocialRefTrigger;
  response: SocialRefResponse;
  lookedAtCaregiver: boolean;
}

interface JointEmpathyData {
  type: JointEmpathyType;
  detail: string;
}

interface FrustrationData {
  level: FrustrationLevel;
  context: string;
}

const COLORS_SOCIAL = {
  jealousy: '#F97316',
  socialRef: '#3B82F6',
  jointEmpathy: '#22C55E',
  background: '#0F172A',
  card: '#1E293B',
  cardAlt: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
};

const CONTEXT_OPTIONS: { value: JealousyContext; labelKey: string }[] = [
  { value: 'sibling', labelKey: 'socialEmotional.contextSibling' },
  { value: 'diverted', labelKey: 'socialEmotional.contextDiverted' },
  { value: 'toy', labelKey: 'socialEmotional.contextToy' },
  { value: 'other', labelKey: 'socialEmotional.contextOther' },
];

const TRIGGER_OPTIONS: { value: SocialRefTrigger; labelKey: string }[] = [
  { value: 'newFood', labelKey: 'socialEmotional.section2.triggerNewFood' },
  { value: 'newPerson', labelKey: 'socialEmotional.section2.triggerNewPerson' },
  { value: 'newObject', labelKey: 'socialEmotional.section2.triggerNewObject' },
  { value: 'stranger', labelKey: 'socialEmotional.section2.triggerStranger' },
  { value: 'unfamiliarPlace', labelKey: 'socialEmotional.section2.triggerUnfamiliarPlace' },
];

const RESPONSE_OPTIONS: { value: SocialRefResponse; labelKey: string }[] = [
  { value: 'approached', labelKey: 'socialEmotional.approached' },
  { value: 'hesitated', labelKey: 'socialEmotional.hesitated' },
  { value: 'rejected', labelKey: 'socialEmotional.rejected' },
];

const JOINT_DETAIL_OPTIONS: Record<JointEmpathyType, { value: string; labelKey: string }[]> = {
  jointAttention: [
    { value: 'point', labelKey: 'socialEmotional.section3.jointPoint' },
    { value: 'eyeGaze', labelKey: 'socialEmotional.section3.jointEyeGaze' },
    { value: 'show', labelKey: 'socialEmotional.section3.jointShow' },
  ],
  empathyExpression: [
    { value: 'comfort', labelKey: 'socialEmotional.section3.empathyComfort' },
    { value: 'concern', labelKey: 'socialEmotional.section3.empathyConcern' },
    { value: 'help', labelKey: 'socialEmotional.section3.empathyHelp' },
  ],
  triadicEngagement: [
    { value: 'reached', labelKey: 'socialEmotional.section3.triadicReached' },
    { value: 'shared', labelKey: 'socialEmotional.section3.triadicShared' },
  ],
};

const FRUSTRATION_LABELS: Record<FrustrationLevel, string> = {
  0: 'socialEmotional.section4.level0',
  1: 'socialEmotional.section4.level1',
  2: 'socialEmotional.section4.level2',
  3: 'socialEmotional.section4.level3',
  4: 'socialEmotional.section4.level4',
  5: 'socialEmotional.section4.level5',
};

function getBabyAge(birthDateStr: string): { years: number; months: number; days: number } {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;
    return { years, months, days };
  } catch {
    return { years: 0, months: 0, days: 0 };
  }
}

function getBabyAgeInMonths(birthDateStr: string): number {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(totalDays / 30.44);
  } catch {
    return 0;
  }
}

export default function SocialEmotionalSentinelScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<SocialEmotionalEntry[]>([]);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);

  // Section 1: Jealousy
  const [jealousyContext, setJealousyContext] = useState<JealousyContext>('sibling');
  const [jealousyIntensity, setJealousyIntensity] = useState(3);
  const [jealousyNotes, setJealousyNotes] = useState('');

  // Section 2: Social Referencing
  const [refTrigger, setRefTrigger] = useState<SocialRefTrigger>('newPerson');
  const [refResponse, setRefResponse] = useState<SocialRefResponse>('approached');
  const [refLookedAtCaregiver, setRefLookedAtCaregiver] = useState(false);

  // Section 3: Joint Attention & Empathy
  const [jointType, setJointType] = useState<JointEmpathyType>('jointAttention');
  const [jointDetail, setJointDetail] = useState('point');

  // Section 4: Frustration Tolerance
  const [frustrationLevel, setFrustrationLevel] = useState<FrustrationLevel>(2);
  const [frustrationContext, setFrustrationContext] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stored, profileRaw] = await Promise.all([
        safeGetItem(STORAGE_KEY),
        safeGetItem('@jobble_baby_profile'),
      ]);
      if (stored) setEntries(JSON.parse(stored));
      if (profileRaw) setBabyProfile(JSON.parse(profileRaw));
    } catch { /* ignore */ }
  };

  const saveEntry = async (entry: SocialEmotionalEntry) => {
    const updated = [entry, ...entries];
    setEntries(updated);
    await safeSetItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleSaveJealousy = async () => {
    const age = babyProfile?.birthDate ? getBabyAge(babyProfile.birthDate) : { years: 0, months: 0, days: 0 };
    const entry: SocialEmotionalEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'jealousy',
      data: { context: jealousyContext, intensity: jealousyIntensity, notes: jealousyNotes } as JealousyData,
      babyAgeAtEntry: age,
    };
    await saveEntry(entry);
    setJealousyNotes('');
    setJealousyIntensity(3);
    Alert.alert(t('socialEmotional.entriesSaved'));
  };

  const handleSaveSocialRef = async () => {
    const age = babyProfile?.birthDate ? getBabyAge(babyProfile.birthDate) : { years: 0, months: 0, days: 0 };
    const entry: SocialEmotionalEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'socialRef',
      data: { trigger: refTrigger, response: refResponse, lookedAtCaregiver: refLookedAtCaregiver } as SocialRefData,
      babyAgeAtEntry: age,
    };
    await saveEntry(entry);
    Alert.alert(t('socialEmotional.entriesSaved'));
  };

  const handleSaveJointEmpathy = async () => {
    const age = babyProfile?.birthDate ? getBabyAge(babyProfile.birthDate) : { years: 0, months: 0, days: 0 };
    const entry: SocialEmotionalEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'jointEmpathy',
      data: { type: jointType, detail: jointDetail } as JointEmpathyData,
      babyAgeAtEntry: age,
    };
    await saveEntry(entry);
    Alert.alert(t('socialEmotional.entriesSaved'));
  };

  const handleSaveFrustration = async () => {
    const age = babyProfile?.birthDate ? getBabyAge(babyProfile.birthDate) : { years: 0, months: 0, days: 0 };
    const entry: SocialEmotionalEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: 'frustration',
      data: { level: frustrationLevel, context: frustrationContext } as FrustrationData,
      babyAgeAtEntry: age,
    };
    await saveEntry(entry);
    setFrustrationContext('');
    Alert.alert(t('socialEmotional.entriesSaved'));
  };

  const babyMonths = babyProfile?.birthDate ? getBabyAgeInMonths(babyProfile.birthDate) : 0;
  const showUnder9moNote = babyMonths < 9;

  // Timeline data - last 14 days
  const getLast14Days = (): Date[] => {
    const days: Date[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    return days;
  };

  const getEntriesForDay = (date: Date, type: 'jealousy' | 'socialRef' | 'jointEmpathy'): number => {
    return entries.filter(entry => {
      if (entry.type !== type) return false;
      const entryDate = new Date(entry.timestamp);
      return entryDate.toDateString() === date.toDateString();
    }).length;
  };

  const renderChipRow = <T extends string>(
    options: { value: T; labelKey: string }[],
    selected: T,
    onSelect: (v: T) => void,
    activeColor: string
  ) => (
    <View style={styles.chipRow}>
      {options.map(opt => (
        <Pressable
          key={opt.value}
          style={[styles.chip, selected === opt.value && { backgroundColor: activeColor }]}
          onPress={() => onSelect(opt.value)}
          accessibilityLabel={t(opt.labelKey)}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === opt.value }}
        >
          <Text style={[styles.chipText, selected === opt.value && { color: '#fff', fontWeight: '600' }]}>
            {t(opt.labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderSection1 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('socialEmotional.section1.title')}</Text>

      <Text style={styles.label}>{t('socialEmotional.section1.contextLabel')}:</Text>
      {renderChipRow(CONTEXT_OPTIONS, jealousyContext, setJealousyContext, COLORS_SOCIAL.jealousy)}

      <Text style={styles.label}>{t('socialEmotional.section1.intensityLabel')}: {jealousyIntensity}/5</Text>
      <View style={styles.intensityRow}>
        {[1, 2, 3, 4, 5].map(level => (
          <Pressable
            key={level}
            style={[
              styles.intensityBtn,
              { backgroundColor: level <= jealousyIntensity ? COLORS_SOCIAL.jealousy : COLORS_SOCIAL.cardAlt }
            ]}
            onPress={() => setJealousyIntensity(level)}
            accessibilityLabel={`Intensity ${level}`}
            accessibilityRole="button"
          >
            <Text style={styles.intensityBtnText}>{level}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('socialEmotional.section1.notesLabel')}</Text>
      <TextInput
        style={styles.textInput}
        value={jealousyNotes}
        onChangeText={setJealousyNotes}
        placeholder={t('socialEmotional.section1.notesPlaceholder')}
        placeholderTextColor="#64748B"
        multiline
        accessibilityLabel={t('socialEmotional.section1.notesLabel')}
      />

      <Pressable
        style={[styles.saveBtn, { backgroundColor: COLORS_SOCIAL.jealousy }]}
        onPress={handleSaveJealousy}
        accessibilityLabel={t('socialEmotional.section1.saveBtn')}
      >
        <Text style={styles.saveBtnText}>{t('socialEmotional.section1.saveBtn')}</Text>
      </Pressable>
    </View>
  );

  const renderSection2 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('socialEmotional.section2.title')}</Text>

      <Text style={styles.label}>{t('socialEmotional.section2.triggerLabel')}:</Text>
      {renderChipRow(TRIGGER_OPTIONS, refTrigger, setRefTrigger, COLORS_SOCIAL.socialRef)}

      <Text style={styles.label}>{t('socialEmotional.section2.responseLabel')}:</Text>
      {renderChipRow(RESPONSE_OPTIONS, refResponse, setRefResponse, COLORS_SOCIAL.socialRef)}

      <Text style={styles.label}>{t('socialEmotional.section2.lookedAtCaregiver')}:</Text>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, refLookedAtCaregiver && { backgroundColor: COLORS_SOCIAL.socialRef }]}
          onPress={() => setRefLookedAtCaregiver(true)}
          accessibilityLabel={t('socialEmotional.section2.yes')}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleBtnText, refLookedAtCaregiver && { color: '#fff', fontWeight: '600' }]}>
            {t('socialEmotional.section2.yes')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, !refLookedAtCaregiver && { backgroundColor: COLORS_SOCIAL.socialRef }]}
          onPress={() => setRefLookedAtCaregiver(false)}
          accessibilityLabel={t('socialEmotional.section2.no')}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleBtnText, !refLookedAtCaregiver && { color: '#fff', fontWeight: '600' }]}>
            {t('socialEmotional.section2.no')}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: COLORS_SOCIAL.socialRef }]}
        onPress={handleSaveSocialRef}
        accessibilityLabel={t('socialEmotional.section2.saveBtn')}
      >
        <Text style={styles.saveBtnText}>{t('socialEmotional.section2.saveBtn')}</Text>
      </Pressable>
    </View>
  );

  const renderSection3 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('socialEmotional.section3.title')}</Text>

      {showUnder9moNote && (
        <View style={styles.noteCard}>
          <MaterialCommunityIcons name="information" size={16} color={COLORS_SOCIAL.textSecondary} />
          <Text style={styles.noteText}>{t('socialEmotional.under9moNote')}</Text>
        </View>
      )}

      <Text style={styles.label}>{t('socialEmotional.section3.typeLabel')}:</Text>
      <View style={styles.chipRow}>
        {(['jointAttention', 'empathyExpression', 'triadicEngagement'] as JointEmpathyType[]).map(type => (
          <Pressable
            key={type}
            style={[styles.chip, jointType === type && { backgroundColor: COLORS_SOCIAL.jointEmpathy }]}
            onPress={() => {
              setJointType(type);
              setJointDetail(JOINT_DETAIL_OPTIONS[type][0].value);
            }}
            accessibilityLabel={t(`socialEmotional.section3.${type === 'jointAttention' ? 'jointAttention' : type === 'empathyExpression' ? 'empathyExpression' : 'triadicEngagement'}`)}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, jointType === type && { color: '#fff', fontWeight: '600' }]}>
              {t(`socialEmotional.section3.${type === 'jointAttention' ? 'jointAttention' : type === 'empathyExpression' ? 'empathyExpression' : 'triadicEngagement'}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('socialEmotional.logEntry')}:</Text>
      {renderChipRow(
        JOINT_DETAIL_OPTIONS[jointType],
        jointDetail as string as any,
        (v) => setJointDetail(v as any),
        COLORS_SOCIAL.jointEmpathy
      )}

      <Pressable
        style={[styles.saveBtn, { backgroundColor: COLORS_SOCIAL.jointEmpathy }]}
        onPress={handleSaveJointEmpathy}
        accessibilityLabel={t('socialEmotional.section3.saveBtn')}
      >
        <Text style={styles.saveBtnText}>{t('socialEmotional.section3.saveBtn')}</Text>
      </Pressable>
    </View>
  );

  const renderSection4 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('socialEmotional.section4.title')}</Text>

      <Text style={styles.label}>{t('socialEmotional.section4.weeklyLabel')}: {frustrationLevel}/5</Text>
      <View style={styles.intensityRow}>
        {([0, 1, 2, 3, 4, 5] as FrustrationLevel[]).map(level => (
          <Pressable
            key={level}
            style={[
              styles.frustrationBtn,
              { backgroundColor: level <= frustrationLevel ? COLORS_SOCIAL.jealousy : COLORS_SOCIAL.cardAlt }
            ]}
            onPress={() => setFrustrationLevel(level)}
            accessibilityLabel={t(FRUSTRATION_LABELS[level])}
            accessibilityRole="button"
          >
            <Text style={styles.intensityBtnText}>{level}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.frustrationLabel}>{t(FRUSTRATION_LABELS[frustrationLevel])}</Text>

      <Text style={styles.label}>{t('socialEmotional.section4.contextLabel')}</Text>
      <TextInput
        style={styles.textInput}
        value={frustrationContext}
        onChangeText={setFrustrationContext}
        placeholder={t('socialEmotional.section4.contextPlaceholder')}
        placeholderTextColor="#64748B"
        multiline
        accessibilityLabel={t('socialEmotional.section4.contextLabel')}
      />

      <Pressable
        style={[styles.saveBtn, { backgroundColor: COLORS_SOCIAL.jealousy }]}
        onPress={handleSaveFrustration}
        accessibilityLabel={t('socialEmotional.section4.saveBtn')}
      >
        <Text style={styles.saveBtnText}>{t('socialEmotional.section4.saveBtn')}</Text>
      </Pressable>
    </View>
  );

  const renderSection5 = () => {
    const last14Days = getLast14Days();
    const maxEntries = Math.max(
      1,
      ...last14Days.map(d => Math.max(
        getEntriesForDay(d, 'jealousy'),
        getEntriesForDay(d, 'socialRef'),
        getEntriesForDay(d, 'jointEmpathy')
      ))
    );

    const showSocialRefAlert = babyMonths >= 12 && !entries.some(e => e.type === 'socialRef');
    const showJointAlert = babyMonths >= 14 && !entries.some(e => e.type === 'jointEmpathy');

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('socialEmotional.section5.title')}</Text>

        {showSocialRefAlert && (
          <View style={styles.alertCard}>
            <MaterialCommunityIcons name="alert" size={16} color="#fff" />
            <Text style={styles.alertText}>{t('socialEmotional.alertSocialRefDelay')}</Text>
          </View>
        )}

        {showJointAlert && (
          <View style={styles.alertCard}>
            <MaterialCommunityIcons name="alert" size={16} color="#fff" />
            <Text style={styles.alertText}>{t('socialEmotional.alertJointDelay')}</Text>
          </View>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS_SOCIAL.jealousy }]} />
            <Text style={styles.legendText}>{t('socialEmotional.section5.jealousyLabel')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS_SOCIAL.socialRef }]} />
            <Text style={styles.legendText}>{t('socialEmotional.section5.socialRefLabel')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS_SOCIAL.jointEmpathy }]} />
            <Text style={styles.legendText}>{t('socialEmotional.section5.jointLabel')}</Text>
          </View>
        </View>

        <View style={styles.timeline}>
          {last14Days.map((day, idx) => {
            const jealousyCount = getEntriesForDay(day, 'jealousy');
            const socialRefCount = getEntriesForDay(day, 'socialRef');
            const jointCount = getEntriesForDay(day, 'jointEmpathy');

            return (
              <View key={idx} style={styles.timelineDay}>
                <Text style={styles.timelineDate}>
                  {day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.timelineBars}>
                  <View
                    style={[
                      styles.timelineBar,
                      {
                        backgroundColor: COLORS_SOCIAL.jealousy,
                        height: Math.max(4, (jealousyCount / maxEntries) * 60),
                        width: jealousyCount > 0 ? 12 : 4,
                      }
                    ]}
                  />
                  <View
                    style={[
                      styles.timelineBar,
                      {
                        backgroundColor: COLORS_SOCIAL.socialRef,
                        height: Math.max(4, (socialRefCount / maxEntries) * 60),
                        width: socialRefCount > 0 ? 12 : 4,
                      }
                    ]}
                  />
                  <View
                    style={[
                      styles.timelineBar,
                      {
                        backgroundColor: COLORS_SOCIAL.jointEmpathy,
                        height: Math.max(4, (jointCount / maxEntries) * 60),
                        width: jointCount > 0 ? 12 : 4,
                      }
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {entries.length === 0 && (
          <Text style={styles.noDataText}>{t('socialEmotional.section5.noData')}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>💛 {t('socialEmotional.jealousyTitle').replace(' Tracker', '')}</Text>
          <Text style={styles.subtitle}>{t('socialEmotional.socialRefTitle')} • {t('socialEmotional.jointTitle')}</Text>
        </View>

        {renderSection1()}
        {renderSection2()}
        {renderSection3()}
        {renderSection4()}
        {renderSection5()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS_SOCIAL.background },
  container: { flex: 1, backgroundColor: COLORS_SOCIAL.background },
  content: { padding: 16, paddingBottom: 100 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS_SOCIAL.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS_SOCIAL.textSecondary },
  section: { backgroundColor: COLORS_SOCIAL.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS_SOCIAL.textPrimary, marginBottom: 16 },
  label: { fontSize: 14, color: COLORS_SOCIAL.textSecondary, marginBottom: 8, marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: COLORS_SOCIAL.cardAlt },
  chipText: { fontSize: 13, color: COLORS_SOCIAL.textSecondary },
  intensityRow: { flexDirection: 'row', gap: 8 },
  intensityBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
  },
  intensityBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  frustrationBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  frustrationLabel: { fontSize: 12, color: COLORS_SOCIAL.textSecondary, marginTop: 8, textAlign: 'center' },
  textInput: {
    backgroundColor: COLORS_SOCIAL.cardAlt,
    borderRadius: 8,
    padding: 12,
    color: COLORS_SOCIAL.textPrimary,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveBtn: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: COLORS_SOCIAL.cardAlt,
  },
  toggleBtnText: { fontSize: 14, color: COLORS_SOCIAL.textSecondary },
  noteCard: {
    backgroundColor: COLORS_SOCIAL.cardAlt,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  noteText: { fontSize: 13, color: COLORS_SOCIAL.textSecondary, flex: 1 },
  alertCard: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  alertText: { fontSize: 13, color: '#fff', flex: 1 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS_SOCIAL.textSecondary },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80 },
  timelineDay: { alignItems: 'center', flex: 1 },
  timelineDate: { fontSize: 8, color: COLORS_SOCIAL.textSecondary, marginBottom: 4 },
  timelineBars: { flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: 64 },
  timelineBar: { borderRadius: 2 },
  noDataText: { textAlign: 'center', color: COLORS_SOCIAL.textSecondary, fontSize: 13, marginTop: 16 },
});

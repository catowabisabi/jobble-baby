import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const LIP_SEAL_LOG_KEY = STORAGE_KEYS.LIP_SEAL_LOG;
const NASAL_BREATHING_KEY = STORAGE_KEYS.NASAL_BREATHING_TIMELINE;
const FACIAL_MILESTONES_KEY = STORAGE_KEYS.FACIAL_MILESTONES;
const PROFILE_KEY = '@jobble_baby_profile';

type LipSealQuality = 'sealed' | 'partiallyOpen' | 'mouthBreathing';
type NasalStatus = 'yes' | 'no' | 'unknown';
type FeedingQuality = 'goodLatch' | 'fair' | 'poor';
type InnerTab = 'assessment' | 'nasalTimeline' | 'feeding' | 'milestones' | 'alerts';

interface LipSealEntry {
  id: string;
  date: string;
  quality: LipSealQuality;
  state: 'sleep' | 'awake';
  feedingQuality?: FeedingQuality;
  notes?: string;
  babyAgeMonths: number;
}

interface NasalEntry {
  id: string;
  date: string;
  nasalSleep: NasalStatus;
  nasalAwake: NasalStatus;
  babyAgeMonths: number;
}

interface FacialMilestones {
  mouthRestClosed: { achieved: boolean; date?: string };
  tongueOnPalate: { achieved: boolean; date?: string };
  noOpenMouth: { achieved: boolean; date?: string };
  midfaceNormal: { achieved: boolean; date?: string };
}

const QUALITY_COLORS: Record<LipSealQuality, string> = {
  sealed: '#22C55E',
  partiallyOpen: '#F59E0B',
  mouthBreathing: '#EF4444',
};

const NASAL_COLORS: Record<NasalStatus, string> = {
  yes: '#22C55E',
  no: '#EF4444',
  unknown: '#9CA3AF',
};

function calculateAgeInMonths(birthDate: string): number {
  try {
    const birth = new Date(birthDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return Math.round(days / 30.44 * 10) / 10;
  } catch { return 0; }
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export default function LipSealNavigator() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];
  const [innerTab, setInnerTab] = useState<InnerTab>('assessment');
  const [lipSealLog, setLipSealLog] = useState<LipSealEntry[]>([]);
  const [nasalLog, setNasalLog] = useState<NasalEntry[]>([]);
  const [milestones, setMilestones] = useState<FacialMilestones>({
    mouthRestClosed: { achieved: false },
    tongueOnPalate: { achieved: false },
    noOpenMouth: { achieved: false },
    midfaceNormal: { achieved: false },
  });
  const [babyAge, setBabyAge] = useState(0);
  const [loading, setLoading] = useState(true);

  // New entry form state
  const [newDate, setNewDate] = useState(today());
  const [newQuality, setNewQuality] = useState<LipSealQuality>('sealed');
  const [newState, setNewState] = useState<'sleep' | 'awake'>('sleep');
  const [newFeedingQuality, setNewFeedingQuality] = useState<FeedingQuality | ''>('');
  const [newNotes, setNewNotes] = useState('');

  // Nasal form
  const [nasalDate, setNasalDate] = useState(today());
  const [nasalSleep, setNasalSleep] = useState<NasalStatus>('unknown');
  const [nasalAwake, setNasalAwake] = useState<NasalStatus>('unknown');

  useEffect(() => {
    async function load() {
      const [logRaw, nasalRaw, milesRaw, profileRaw] = await Promise.all([
        safeGetItem(LIP_SEAL_LOG_KEY),
        safeGetItem(NASAL_BREATHING_KEY),
        safeGetItem(FACIAL_MILESTONES_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (logRaw) {
        try { setLipSealLog(JSON.parse(logRaw)); } catch {}
      }
      if (nasalRaw) {
        try { setNasalLog(JSON.parse(nasalRaw)); } catch {}
      }
      if (milesRaw) {
        try { setMilestones(JSON.parse(milesRaw)); } catch {}
      }
      if (profileRaw) {
        try {
          const p = JSON.parse(profileRaw);
          if (p.birthDate) setBabyAge(calculateAgeInMonths(p.birthDate));
        } catch {}
      }
      setLoading(false);
    }
    load();
  }, []);

  const saveLipSeal = useCallback(async (entries: LipSealEntry[]) => {
    await safeSetItem(LIP_SEAL_LOG_KEY, JSON.stringify(entries));
    setLipSealLog(entries);
  }, []);

  const saveNasal = useCallback(async (entries: NasalEntry[]) => {
    await safeSetItem(NASAL_BREATHING_KEY, JSON.stringify(entries));
    setNasalLog(entries);
  }, []);

  const saveMilestones = useCallback(async (m: FacialMilestones) => {
    await safeSetItem(FACIAL_MILESTONES_KEY, JSON.stringify(m));
    setMilestones(m);
  }, []);

  const addLipSealEntry = async () => {
    const entry: LipSealEntry = {
      id: uid(),
      date: newDate,
      quality: newQuality,
      state: newState,
      feedingQuality: newFeedingQuality || undefined,
      notes: newNotes || undefined,
      babyAgeMonths: babyAge,
    };
    await saveLipSeal([entry, ...lipSealLog]);
    setNewNotes('');
    setNewFeedingQuality('');
  };

  const addNasalEntry = async () => {
    const entry: NasalEntry = {
      id: uid(),
      date: nasalDate,
      nasalSleep,
      nasalAwake,
      babyAgeMonths: babyAge,
    };
    await saveNasal([entry, ...nasalLog]);
  };

  const toggleMilestone = async (key: keyof FacialMilestones) => {
    const updated = {
      ...milestones,
      [key]: {
        achieved: !milestones[key].achieved,
        date: !milestones[key].achieved ? today() : undefined,
      },
    };
    await saveMilestones(updated);
  };

  const latestLipSeal = lipSealLog[0];
  const mouthBreathingAfter6mo = lipSealLog.some(
    e => e.quality === 'mouthBreathing' && e.babyAgeMonths >= 6
  );
  const allMilestonesDelayed = babyAge >= 9 &&
    !milestones.mouthRestClosed.achieved &&
    !milestones.tongueOnPalate.achieved &&
    !milestones.noOpenMouth.achieved &&
    !milestones.midfaceNormal.achieved;

  // Correlation: lip seal quality vs feeding quality
  const correlatedEntries = lipSealLog.filter(e => e.feedingQuality);
  const sealedFeedingGood = correlatedEntries.filter(
    e => e.quality === 'sealed' && e.feedingQuality === 'goodLatch'
  ).length;
  const sealedFeedingPoor = correlatedEntries.filter(
    e => e.quality === 'sealed' && e.feedingQuality === 'poor'
  ).length;

  const qualityLabel = (q: LipSealQuality) => t(`lipSeal.${q}`) || q;
  const nasalLabel = (s: NasalStatus) => t(`lipSeal.nasal${s.charAt(0).toUpperCase() + s.slice(1)}`) || s;
  const feedingLabel = (f: FeedingQuality) => t(`lipSeal.feeding${f.charAt(0).toUpperCase() + f.slice(1)}`) || f;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
        <Text style={{ color: C.text }}>{t('common.loading') || 'Loading...'}</Text>
      </SafeAreaView>
    );
  }

  const bg = C.background;
  const card = C.card;
  const text = C.text;
  const muted = C.muted;
  const border = C.border;

  const INNER_TABS: { key: InnerTab; label: string; icon: string }[] = [
    { key: 'assessment', label: t('lipSeal.assessTitle') || 'Assessment', icon: 'face-man' },
    { key: 'nasalTimeline', label: t('lipSeal.nasalTitle') || 'Nasal', icon: 'nose' },
    { key: 'feeding', label: t('lipSeal.feedingTitle') || 'Feeding', icon: 'food-drumstick' },
    { key: 'milestones', label: t('lipSeal.milestoneTitle') || 'Milestones', icon: 'check-circle' },
    { key: 'alerts', label: t('lipSeal.alertsTitle') || 'Alerts', icon: 'alert-circle' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.headerCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.headerTitle, { color: text }]}>{t('lipSeal.title') || 'Lip Seal Navigator'}</Text>
          {latestLipSeal && (
            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: QUALITY_COLORS[latestLipSeal.quality] + '22' }]}>
                <Text style={[styles.badgeText, { color: QUALITY_COLORS[latestLipSeal.quality] }]}>
                  {qualityLabel(latestLipSeal.quality)} · {latestLipSeal.date}
                </Text>
              </View>
            </View>
          )}
          {babyAge > 0 && (
            <Text style={[styles.ageText, { color: muted }]}>
              Baby age: {babyAge.toFixed(1)} months
            </Text>
          )}
        </View>

        {/* Inner tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
          {INNER_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setInnerTab(tab.key)}
              style={[
                styles.innerTab,
                { borderColor: innerTab === tab.key ? C.accent : border, backgroundColor: innerTab === tab.key ? C.accent + '18' : 'transparent' },
              ]}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={16}
                color={innerTab === tab.key ? C.accent : muted}
              />
              <Text style={[styles.innerTabText, { color: innerTab === tab.key ? C.accent : muted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section 1: Lip Seal Assessment */}
        {innerTab === 'assessment' && (
          <View style={styles.section}>
            {/* Add entry */}
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: text }]}>{t('lipSeal.addEntry') || 'Log Entry'}</Text>

              <Text style={[styles.label, { color: text }]}>{t('lipSeal.date') || 'Date'}</Text>
              <TextInput
                value={newDate}
                onChangeText={setNewDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={muted}
                style={[styles.input, { backgroundColor: bg, color: text, borderColor: border }]}
              />

              <Text style={[styles.label, { color: text }]}>{t('lipSeal.state') || 'State'}</Text>
              <View style={styles.btnRow}>
                {(['sleep', 'awake'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setNewState(s)}
                    style={[styles.toggleBtn, { borderColor: newState === s ? C.accent : border, backgroundColor: newState === s ? C.accent + '18' : 'transparent' }]}
                  >
                    <Text style={{ color: newState === s ? C.accent : muted, fontSize: 13 }}>
                      {t(`lipSeal.${s}`) || s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: text }]}>{t('lipSeal.quality') || 'Lip Seal Quality'}</Text>
              <View style={styles.btnCol}>
                {(['sealed', 'partiallyOpen', 'mouthBreathing'] as const).map(q => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => setNewQuality(q)}
                    style={[styles.qualityBtn, { borderColor: newQuality === q ? QUALITY_COLORS[q] : border, backgroundColor: newQuality === q ? QUALITY_COLORS[q] + '18' : 'transparent' }]}
                  >
                    <View style={[styles.qualityDot, { backgroundColor: QUALITY_COLORS[q] }]} />
                    <Text style={{ color: newQuality === q ? QUALITY_COLORS[q] : muted, fontSize: 13 }}>
                      {qualityLabel(q)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={addLipSealEntry} style={[styles.addBtn, { backgroundColor: C.accent }]}>
                <Text style={styles.addBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>

            {/* History */}
            <Text style={[styles.sectionTitle, { color: text }]}>{t('lipSeal.history') || 'History'}</Text>
            {lipSealLog.length === 0 && (
              <Text style={[styles.emptyText, { color: muted }]}>
                {t('lipSeal.noEntries') || 'No entries yet.'}
              </Text>
            )}
            {lipSealLog.map(entry => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: card, borderColor: border }]}>
                <View style={styles.entryRow}>
                  <View style={[styles.qualityIndicator, { backgroundColor: QUALITY_COLORS[entry.quality] }]} />
                  <View style={styles.entryInfo}>
                    <Text style={[styles.entryTitle, { color: text }]}>{entry.date}</Text>
                    <Text style={[styles.entrySub, { color: muted }]}>
                      {qualityLabel(entry.quality)} · {t(`lipSeal.${entry.state}`) || entry.state}
                      {entry.feedingQuality ? ` · ${feedingLabel(entry.feedingQuality)}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.ageTag, { color: muted }]}>{entry.babyAgeMonths.toFixed(1)}mo</Text>
                </View>
                {entry.notes && <Text style={[styles.notesText, { color: muted }]}>📝 {entry.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Section 2: Nasal Breathing Timeline */}
        {innerTab === 'nasalTimeline' && (
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: text }]}>{t('lipSeal.nasalTitle') || 'Nasal Breathing Log'}</Text>

              <Text style={[styles.label, { color: text }]}>{t('lipSeal.date') || 'Date'}</Text>
              <TextInput
                value={nasalDate}
                onChangeText={setNasalDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={muted}
                style={[styles.input, { backgroundColor: bg, color: text, borderColor: border }]}
              />

              <Text style={[styles.label, { color: text }]}>{t('lipSeal.nasalSleep') || 'Nasal Breathing During Sleep'}</Text>
              <View style={styles.btnRow}>
                {(['yes', 'no', 'unknown'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setNasalSleep(s)}
                    style={[styles.toggleBtn, { borderColor: nasalSleep === s ? NASAL_COLORS[s] : border, backgroundColor: nasalSleep === s ? NASAL_COLORS[s] + '18' : 'transparent' }]}
                  >
                    <Text style={{ color: nasalSleep === s ? NASAL_COLORS[s] : muted, fontSize: 13 }}>
                      {nasalLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: text }]}>{t('lipSeal.nasalAwake') || 'Nasal Breathing While Awake'}</Text>
              <View style={styles.btnRow}>
                {(['yes', 'no', 'unknown'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setNasalAwake(s)}
                    style={[styles.toggleBtn, { borderColor: nasalAwake === s ? NASAL_COLORS[s] : border, backgroundColor: nasalAwake === s ? NASAL_COLORS[s] + '18' : 'transparent' }]}
                  >
                    <Text style={{ color: nasalAwake === s ? NASAL_COLORS[s] : muted, fontSize: 13 }}>
                      {nasalLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={addNasalEntry} style={[styles.addBtn, { backgroundColor: C.accent }]}>
                <Text style={styles.addBtnText}>{t('common.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>

            {/* Timeline */}
            {nasalLog.length === 0 && (
              <Text style={[styles.emptyText, { color: muted }]}>
                {t('lipSeal.nasalNoEntries') || 'No entries yet.'}
              </Text>
            )}
            {nasalLog.map(entry => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: card, borderColor: border }]}>
                <Text style={[styles.entryTitle, { color: text }]}>{entry.date}</Text>
                <View style={styles.nasalRow}>
                  <Text style={[styles.nasalLabel, { color: muted }]}>😴 {t('lipSeal.nasalSleep') || 'Sleep'}:</Text>
                  <View style={[styles.nasalBadge, { backgroundColor: NASAL_COLORS[entry.nasalSleep] + '22' }]}>
                    <Text style={{ color: NASAL_COLORS[entry.nasalSleep], fontSize: 12 }}>{nasalLabel(entry.nasalSleep)}</Text>
                  </View>
                  <Text style={[styles.nasalLabel, { color: muted }]}>☀️ {t('lipSeal.nasalAwake') || 'Awake'}:</Text>
                  <View style={[styles.nasalBadge, { backgroundColor: NASAL_COLORS[entry.nasalAwake] + '22' }]}>
                    <Text style={{ color: NASAL_COLORS[entry.nasalAwake], fontSize: 12 }}>{nasalLabel(entry.nasalAwake)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Section 3: Feeding Efficiency */}
        {innerTab === 'feeding' && (
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: text }]}>{t('lipSeal.feedingTitle') || 'Feeding Correlation'}</Text>
              <Text style={[styles.hint, { color: muted }]}>
                {t('lipSeal.feedingHint') || 'Log lip seal entries with feeding quality to see correlation.'}
              </Text>
            </View>

            {correlatedEntries.length > 0 && (
              <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
                <Text style={[styles.cardTitle, { color: text }]}>{t('lipSeal.correlation') || 'Correlation (30 days)'}</Text>
                <View style={styles.corrRow}>
                  <View style={styles.corrItem}>
                    <Text style={[styles.corrNum, { color: '#22C55E' }]}>{sealedFeedingGood}</Text>
                    <Text style={[styles.corrLabel, { color: muted }]}>{t('lipSeal.sealedGoodLatch') || 'Sealed + Good Latch'}</Text>
                  </View>
                  <View style={styles.corrItem}>
                    <Text style={[styles.corrNum, { color: '#EF4444' }]}>{sealedFeedingPoor}</Text>
                    <Text style={[styles.corrLabel, { color: muted }]}>{t('lipSeal.sealedPoor') || 'Sealed + Poor'}</Text>
                  </View>
                </View>
                {sealedFeedingGood > sealedFeedingPoor && (
                  <View style={[styles.positiveBanner, { backgroundColor: '#22C55E22' }]}>
                    <Text style={{ color: '#22C55E' }}>
                      ✓ {t('lipSeal.positiveCorrelation') || 'Good lip seal correlates with better feeding!'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: text }]}>{t('lipSeal.recentFeedingEntries') || 'Recent Feeding Entries'}</Text>
            {correlatedEntries.length === 0 && (
              <Text style={[styles.emptyText, { color: muted }]}>
                {t('lipSeal.noFeedingEntries') || 'No feeding entries yet. Add feeding quality to assessment entries.'}
              </Text>
            )}
            {correlatedEntries.slice(0, 10).map(entry => (
              <View key={entry.id} style={[styles.entryCard, { backgroundColor: card, borderColor: border }]}>
                <View style={styles.entryRow}>
                  <View style={[styles.qualityIndicator, { backgroundColor: QUALITY_COLORS[entry.quality] }]} />
                  <View>
                    <Text style={[styles.entryTitle, { color: text }]}>{entry.date}</Text>
                    <Text style={[styles.entrySub, { color: muted }]}>
                      {qualityLabel(entry.quality)} → {feedingLabel(entry.feedingQuality!)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Section 4: Facial Milestones */}
        {innerTab === 'milestones' && (
          <View style={styles.section}>
            <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.cardTitle, { color: text }]}>{t('lipSeal.milestoneTitle') || 'Facial Development Milestones'}</Text>
              <Text style={[styles.hint, { color: muted }]}>
                {t('lipSeal.milestoneHint') || 'Track key facial and oral motor development milestones.'}
              </Text>
            </View>

            {(Object.keys(milestones) as (keyof FacialMilestones)[]).map(key => {
              const m = milestones[key];
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleMilestone(key)}
                  style={[styles.milestoneCard, { backgroundColor: card, borderColor: m.achieved ? '#22C55E' : border }]}
                >
                  <View style={styles.milestoneRow}>
                    <View style={[styles.checkCircle, { borderColor: m.achieved ? '#22C55E' : border }]}>
                      {m.achieved && <MaterialCommunityIcons name="check" size={16} color="#22C55E" />}
                    </View>
                    <View style={styles.milestoneInfo}>
                      <Text style={[styles.milestoneTitle, { color: text }]}>
                        {t(`lipSeal.${key}`) || key}
                      </Text>
                      {m.date && (
                        <Text style={[styles.milestoneDate, { color: muted }]}>
                          {t('lipSeal.achievedOn') || 'Achieved'}: {m.date}
                        </Text>
                      )}
                    </View>
                    <MaterialCommunityIcons
                      name={m.achieved ? 'check-circle' : 'circle-outline'}
                      size={24}
                      color={m.achieved ? '#22C55E' : muted}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Section 5: Alerts */}
        {innerTab === 'alerts' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: text }]}>{t('lipSeal.alertsTitle') || 'Alert History'}</Text>

            {!mouthBreathingAfter6mo && !allMilestonesDelayed && (
              <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
                <MaterialCommunityIcons name="check-circle" size={40} color="#22C55E" />
                <Text style={[styles.cardTitle, { color: text, marginTop: 8 }]}>
                  {t('lipSeal.noAlerts') || 'No Alerts'}
                </Text>
                <Text style={[styles.hint, { color: muted }]}>
                  {t('lipSeal.allClear') || 'Lip seal and facial development tracking looks healthy.'}
                </Text>
              </View>
            )}

            {mouthBreathingAfter6mo && (
              <View style={[styles.alertCard, { backgroundColor: '#EF444418', borderColor: '#EF4444' }]}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: '#EF4444' }]}>
                    {t('lipSeal.alertMouthBreathing') || 'Mouth Breathing After 6 Months'}
                  </Text>
                  <Text style={[styles.alertBody, { color: text }]}>
                    {t('lipSeal.alertMouthBreathingBody') || 'Persistent mouth breathing after 6 months is associated with altered facial development. Consider consulting a pediatric dentist or ENT specialist.'}
                  </Text>
                </View>
              </View>
            )}

            {allMilestonesDelayed && (
              <View style={[styles.alertCard, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B' }]}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#F59E0B" />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: '#F59E0B' }]}>
                    {t('lipSeal.alertMilestonesDelayed') || 'Facial Milestones Delayed'}
                  </Text>
                  <Text style={[styles.alertBody, { color: text }]}>
                    {t('lipSeal.alertMilestonesBody') || 'At 9+ months, all facial development milestones remain unachieved. Consult your pediatrician for evaluation.'}
                  </Text>
                </View>
              </View>
            )}

            {babyAge >= 4 && (
              <View style={[styles.alertCard, { backgroundColor: '#3B82F618', borderColor: '#3B82F6' }]}>
                <MaterialCommunityIcons name="doctor" size={24} color="#3B82F6" />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertTitle, { color: '#3B82F6' }]}>
                    {t('lipSeal.alertLipTieScreening') || 'Lip Tie Screening'}
                  </Text>
                  <Text style={[styles.alertBody, { color: text }]}>
                    {t('lipSeal.alertLipTieBody') || 'Consider lip tie screening at your next pediatrician or pediatric dentist visit, especially if breastfeeding challenges exist.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS_primary = '#6366F1';

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 100 },
  headerCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  ageText: { fontSize: 12, marginTop: 4 },
  tabRow: { flexDirection: 'row', marginBottom: 12 },
  innerTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    marginRight: 6, borderWidth: 1,
  },
  innerTabText: { fontSize: 12, fontWeight: '600' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  hint: { fontSize: 12, marginTop: -4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 4 },
  btnRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  btnCol: { gap: 6 },
  qualityBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  qualityDot: { width: 10, height: 10, borderRadius: 5 },
  addBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyText: { fontSize: 13, textAlign: 'center', marginVertical: 20 },
  entryCard: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 6 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryInfo: { flex: 1 },
  entryTitle: { fontSize: 14, fontWeight: '600' },
  entrySub: { fontSize: 12, marginTop: 2 },
  ageTag: { fontSize: 11 },
  notesText: { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  qualityIndicator: { width: 4, height: 36, borderRadius: 2 },
  nasalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  nasalLabel: { fontSize: 12 },
  nasalBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  corrRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  corrItem: { flex: 1, alignItems: 'center' },
  corrNum: { fontSize: 28, fontWeight: '800' },
  corrLabel: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  positiveBanner: { marginTop: 12, padding: 10, borderRadius: 8, alignItems: 'center' },
  milestoneCard: { borderRadius: 10, padding: 14, borderWidth: 1, marginBottom: 8 },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  milestoneInfo: { flex: 1 },
  milestoneTitle: { fontSize: 14, fontWeight: '600' },
  milestoneDate: { fontSize: 12, marginTop: 2 },
  alertCard: { flexDirection: 'row', gap: 12, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 8 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  alertBody: { fontSize: 13, lineHeight: 18 },
});

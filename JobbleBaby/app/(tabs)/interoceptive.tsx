import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
const COLORS = {
  primary: '#3B82F6',
  teal: '#14B8A6',
  amber: '#F59E0B',
};

const DIARY_KEY = '@jobble/interoceptive_diary';
const BODY_SCAN_KEY = '@jobble/body_scan_session';
const SIGNAL_MATCH_KEY = '@jobble/signal_match';
const GAMES_KEY = '@jobble/interoceptive_games';

type NeedType = 'feed' | 'diaper' | 'sleep' | 'comfort' | 'play' | 'stimulation_reduction' | 'nothing';
type BodyRegion = 'head' | 'chest' | 'abdomen' | 'pelvis' | 'limbs' | 'throat';
type EmotionalValence = 'calm' | 'anxious' | 'frustrated' | 'neutral';
type GameType = 'hot_cold_belly' | 'belly_breathing_buddy' | 'body_part_point';

interface DiaryEntry {
  id: string;
  date: string;
  gut_feeling: string;
  gut_intensity: number;
  body_region: BodyRegion;
  emotional_valence: EmotionalValence;
  parent_guess: NeedType;
  actual_outcome: NeedType;
  matched: boolean;
  linked_log_type: 'feed' | 'sleep' | 'diaper' | 'none';
  linked_log_id: string;
}

interface BodyScanSession {
  id: string;
  date: string;
  duration_sec: number;
  hrv_before: number;
  hrv_after: number;
  hrv_delta: number;
}

interface SignalMatch {
  id: string;
  date: string;
  challenge_index: number;
  parent_guess: NeedType;
  actual_outcome: NeedType;
  matched: boolean;
}

interface GameEntry {
  id: string;
  date: string;
  game_type: GameType;
  baby_age_months: number;
  reaction: string;
  notes: string;
}

type TabView = 'dashboard' | 'body_scan' | 'diary' | 'precision' | 'signal' | 'games';

const NEED_OPTIONS: { value: NeedType; label: string }[] = [
  { value: 'feed', label: 'Feed' },
  { value: 'diaper', label: 'Diaper' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'play', label: 'Play' },
  { value: 'stimulation_reduction', label: 'Less stimulation' },
  { value: 'nothing', label: 'Nothing identified' },
];

const BODY_REGIONS: { value: BodyRegion; label: string }[] = [
  { value: 'head', label: 'Head' },
  { value: 'throat', label: 'Throat' },
  { value: 'chest', label: 'Chest' },
  { value: 'abdomen', label: 'Abdomen' },
  { value: 'pelvis', label: 'Pelvis' },
  { value: 'limbs', label: 'Limbs' },
];

const EMOTIONAL_VALENCES: { value: EmotionalValence; label: string }[] = [
  { value: 'calm', label: 'Calm' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'frustrated', label: 'Frustrated' },
  { value: 'neutral', label: 'Neutral' },
];

const GAME_TYPES: { value: GameType; label: string; age_months: number }[] = [
  { value: 'hot_cold_belly', label: 'Hot/Cold Belly', age_months: 6 },
  { value: 'belly_breathing_buddy', label: 'Belly Breathing Buddy', age_months: 9 },
  { value: 'body_part_point', label: 'Body Part Point', age_months: 12 },
];

export default function Interoceptive() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [bodyScanSessions, setBodyScanSessions] = useState<BodyScanSession[]>([]);
  const [signalMatches, setSignalMatches] = useState<SignalMatch[]>([]);
  const [gameEntries, setGameEntries] = useState<GameEntry[]>([]);
  const [showBodyScan, setShowBodyScan] = useState(false);
  const [showDiaryEntry, setShowDiaryEntry] = useState(false);
  const [showSignalChallenge, setShowSignalChallenge] = useState(false);
  const [scanDuration, setScanDuration] = useState(5);
  const [scanPhase, setScanPhase] = useState(0);
  const [hrvBefore, setHrvBefore] = useState('');
  const [hrvAfter, setHrvAfter] = useState('');
  const [gutFeeling, setGutFeeling] = useState('');
  const [gutIntensity, setGutIntensity] = useState(3);
  const [bodyRegion, setBodyRegion] = useState<BodyRegion>('chest');
  const [emotionalValence, setEmotionalValence] = useState<EmotionalValence>('neutral');
  const [parentGuess, setParentGuess] = useState<NeedType>('feed');
  const [actualOutcome, setActualOutcome] = useState<NeedType>('feed');
  const [linkedLogType, setLinkedLogType] = useState<'feed' | 'sleep' | 'diaper' | 'none'>('none');
  const [gameType, setGameType] = useState<GameType>('hot_cold_belly');
  const [gameReaction, setGameReaction] = useState('');
  const [gameNotes, setGameNotes] = useState('');
  const [babyAgeMonths, setBabyAgeMonths] = useState(6);
  const [challengeIndex, setChallengeIndex] = useState(1);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [d, b, s, g] = await Promise.all([
        AsyncStorage.getItem(DIARY_KEY),
        AsyncStorage.getItem(BODY_SCAN_KEY),
        AsyncStorage.getItem(SIGNAL_MATCH_KEY),
        AsyncStorage.getItem(GAMES_KEY),
      ]);
      if (d) setDiaryEntries(JSON.parse(d));
      if (b) setBodyScanSessions(JSON.parse(b));
      if (s) setSignalMatches(JSON.parse(s));
      if (g) setGameEntries(JSON.parse(g));
    } catch (e) { }
  };

  const saveDiary = async (entry: DiaryEntry) => {
    const updated = [entry, ...diaryEntries];
    setDiaryEntries(updated);
    await AsyncStorage.setItem(DIARY_KEY, JSON.stringify(updated));
  };

  const saveBodyScan = async (session: BodyScanSession) => {
    const updated = [session, ...bodyScanSessions];
    setBodyScanSessions(updated);
    await AsyncStorage.setItem(BODY_SCAN_KEY, JSON.stringify(updated));
  };

  const saveSignalMatch = async (match: SignalMatch) => {
    const updated = [match, ...signalMatches];
    setSignalMatches(updated);
    await AsyncStorage.setItem(SIGNAL_MATCH_KEY, JSON.stringify(updated));
  };

  const saveGame = async (entry: GameEntry) => {
    const updated = [entry, ...gameEntries];
    setGameEntries(updated);
    await AsyncStorage.setItem(GAMES_KEY, JSON.stringify(updated));
  };

  const computePrecisionScore = (): number => {
    if (diaryEntries.length < 3) return 0;
    const recent = diaryEntries.slice(0, 30);
    const matchRate = recent.filter(e => e.matched).length / recent.length;
    const hrvTrend = computeHrvTrend();
    const scanEngagement = Math.min(bodyScanSessions.length / 7, 1);
    return Math.round((matchRate * 0.5 + hrvTrend * 0.25 + scanEngagement * 0.25) * 100);
  };

  const computeHrvTrend = (): number => {
    if (bodyScanSessions.length < 2) return 0.5;
    const recent = bodyScanSessions.slice(0, 7);
    const avgDelta = recent.reduce((sum, s) => sum + s.hrv_delta, 0) / recent.length;
    return Math.max(0, Math.min(1, 0.5 + avgDelta / 50));
  };

  const getStreak = (): number => {
    let streak = 0;
    const today = new Date().toDateString();
    for (let i = 0; i < signalMatches.length; i++) {
      const m = signalMatches[i];
      const mDate = new Date(m.date).toDateString();
      if (i === 0 && mDate !== today) return 0;
      if (m.matched) streak++;
      else { if (streak > 0) break; }
    }
    return streak;
  };

  const precisionScore = computePrecisionScore();
  const streak = getStreak();
  const scoreColor = precisionScore >= 75 ? COLORS.teal : precisionScore >= 45 ? COLORS.amber : '#EF4444';

  const SCAN_PHASES = ['head', 'throat', 'chest', 'abdomen', 'pelvis', 'limbs'];

  const startBodyScan = () => {
    setShowBodyScan(true);
    setScanPhase(0);
    setHrvBefore('');
    setHrvAfter('');
    const interval = setInterval(() => {
      setScanPhase(prev => {
        if (prev >= SCAN_PHASES.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, (scanDuration * 60 * 1000) / SCAN_PHASES.length);
  };

  const completeBodyScan = async () => {
    const before = parseInt(hrvBefore) || 50;
    const after = parseInt(hrvAfter) || 50;
    const session: BodyScanSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration_sec: scanDuration * 60,
      hrv_before: before,
      hrv_after: after,
      hrv_delta: after - before,
    };
    await saveBodyScan(session);
    setShowBodyScan(false);
    Alert.alert(t('interoceptive.bodyScanComplete') || 'Body scan complete!');
  };

  const addDiaryEntry = async () => {
    const matched = parentGuess === actualOutcome;
    const entry: DiaryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      gut_feeling: gutFeeling,
      gut_intensity: gutIntensity,
      body_region: bodyRegion,
      emotional_valence: emotionalValence,
      parent_guess: parentGuess,
      actual_outcome: actualOutcome,
      matched,
      linked_log_type: linkedLogType,
      linked_log_id: '',
    };
    await saveDiary(entry);
    setShowDiaryEntry(false);
    setGutFeeling('');
    setGutIntensity(3);
    setParentGuess('feed');
    setActualOutcome('feed');
  };

  const addSignalChallenge = async () => {
    const matched = parentGuess === actualOutcome;
    const match: SignalMatch = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      challenge_index: challengeIndex,
      parent_guess: parentGuess,
      actual_outcome: actualOutcome,
      matched,
    };
    await saveSignalMatch(match);
    if (challengeIndex >= 3) {
      setShowSignalChallenge(false);
      setChallengeIndex(1);
    } else {
      setChallengeIndex(c => c + 1);
    }
    setParentGuess('feed');
    setActualOutcome('feed');
  };

  const addGameEntry = async () => {
    const entry: GameEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      game_type: gameType,
      baby_age_months: babyAgeMonths,
      reaction: gameReaction,
      notes: gameNotes,
    };
    await saveGame(entry);
    setGameReaction('');
    setGameNotes('');
    Alert.alert(t('interoceptive.gameReaction') || 'Game logged!');
  };

  const renderTabButton = (tab: TabView, label: string) => (
    <TouchableOpacity
      style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
      onPress={() => setActiveTab(tab)}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderDashboard = () => (
    <View style={styles.section}>
      <View style={[styles.card, { borderLeftColor: scoreColor }]}>
        <Text style={styles.cardTitle}>{t('interoceptive.precisionScoreTitle')}</Text>
        <Text style={[styles.bigNumber, { color: scoreColor }]}>{precisionScore}</Text>
        <Text style={styles.cardDesc}>{t('interoceptive.precisionScoreDesc')}</Text>
        {bodyScanSessions.length >= 3 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Body Scan Streak: {bodyScanSessions.length} sessions</Text>
          </View>
        )}
        {streak >= 7 && (
          <View style={[styles.badge, { backgroundColor: COLORS.teal }]}>
            <Text style={styles.badgeText}>Signal Master: {streak}-day streak</Text>
          </View>
        )}
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowBodyScan(true)} accessibilityLabel="Start body scan">
          <Text style={styles.actionBtnText}>{t('interoceptive.bodyScanStart')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowDiaryEntry(true)} accessibilityLabel="Add diary entry">
          <Text style={styles.actionBtnText}>{t('interoceptive.diaryTitle')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowSignalChallenge(true)} accessibilityLabel="Signal match challenge">
          <Text style={styles.actionBtnText}>{t('interoceptive.signalMatchTitle')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t('interoceptive.diaryTitle')}</Text>
      {diaryEntries.slice(0, 5).map(e => (
        <View key={e.id} style={styles.entryRow}>
          <Text style={styles.entryDate}>{new Date(e.date).toLocaleDateString()}</Text>
          <Text style={styles.entryText}>{e.gut_feeling || 'No gut feeling logged'}</Text>
          <Text style={[styles.entryMatch, { color: e.matched ? COLORS.teal : '#EF4444' }]}>
            {e.matched ? 'Matched' : 'Missed'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderBodyScan = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('interoceptive.bodyScanTitle')}</Text>
      <View style={styles.durationPicker}>
        <Text style={styles.label}>Duration:</Text>
        {[3, 5, 10].map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, scanDuration === d && styles.chipActive]}
            onPress={() => setScanDuration(d)}
            accessibilityLabel={`${d} minutes`}
          >
            <Text style={[styles.chipText, scanDuration === d && styles.chipTextActive]}>{d} min</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.startScanBtn} onPress={startBodyScan} accessibilityLabel="Begin body scan">
        <Text style={styles.startScanBtnText}>{t('interoceptive.bodyScanStart')}</Text>
      </TouchableOpacity>
      {bodyScanSessions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {bodyScanSessions.slice(0, 5).map(s => (
            <View key={s.id} style={styles.entryRow}>
              <Text style={styles.entryDate}>{new Date(s.date).toLocaleDateString()}</Text>
              <Text style={styles.entryText}>HRV: {s.hrv_before} → {s.hrv_after} ({s.hrv_delta >= 0 ? '+' : ''}{s.hrv_delta})</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );

  const renderDiary = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('interoceptive.diaryTitle')}</Text>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowDiaryEntry(true)} accessibilityLabel="Add diary entry">
        <Text style={styles.addBtnText}>+ New Entry</Text>
      </TouchableOpacity>
      {diaryEntries.map(e => (
        <View key={e.id} style={styles.diaryCard}>
          <View style={styles.diaryHeader}>
            <Text style={styles.entryDate}>{new Date(e.date).toLocaleDateString()}</Text>
            <Text style={[styles.entryMatch, { color: e.matched ? COLORS.teal : '#EF4444' }]}>
              {e.matched ? '✓ Matched' : '✗ Missed'}
            </Text>
          </View>
          <Text style={styles.diaryText}>Gut: {e.gut_feeling}</Text>
          <Text style={styles.diaryMeta}>Intensity: {e.gut_intensity}/5 · {e.body_region} · {e.emotional_valence}</Text>
          <Text style={styles.diaryMeta}>Guess: {e.parent_guess} → Actual: {e.actual_outcome}</Text>
        </View>
      ))}
    </View>
  );

  const renderPrecision = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('interoceptive.precisionScoreTitle')}</Text>
      <View style={[styles.card, { borderLeftColor: scoreColor }]}>
        <Text style={[styles.bigNumber, { color: scoreColor }]}>{precisionScore}</Text>
        <Text style={styles.cardDesc}>{t('interoceptive.precisionScoreDesc')}</Text>
        <Text style={styles.cardDesc}>{t('interoceptive.scoreTrend')}: 30-day rolling</Text>
      </View>
      <View style={styles.scoreBreakdown}>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>Diary consistency</Text>
          <Text style={styles.scoreItemValue}>{diaryEntries.length > 0 ? Math.round(diaryEntries.slice(0, 30).filter(e => e.matched).length / Math.min(diaryEntries.length, 30) * 100) : 0}%</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>HRV correlation</Text>
          <Text style={styles.scoreItemValue}>{Math.round(computeHrvTrend() * 100)}%</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={styles.scoreItemLabel}>Body scan engagement</Text>
          <Text style={styles.scoreItemValue}>{Math.round(Math.min(bodyScanSessions.length / 7, 1) * 100)}%</Text>
        </View>
      </View>
      {precisionScore < 45 && (
        <View style={[styles.alertCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.alertText}>{t('interoceptive.scoreAlert')}</Text>
        </View>
      )}
    </View>
  );

  const renderSignal = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('interoceptive.signalMatchTitle')}</Text>
      <View style={styles.streakCard}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>{t('interoceptive.signalStreak')}</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowSignalChallenge(true)} accessibilityLabel="Start challenge">
        <Text style={styles.addBtnText}>+ New Challenge</Text>
      </TouchableOpacity>
      {signalMatches.slice(0, 10).map(m => (
        <View key={m.id} style={styles.entryRow}>
          <Text style={styles.entryDate}>{new Date(m.date).toLocaleDateString()}</Text>
          <Text style={styles.entryText}>Challenge #{m.challenge_index}: {m.parent_guess} → {m.actual_outcome}</Text>
          <Text style={[styles.entryMatch, { color: m.matched ? COLORS.teal : '#EF4444' }]}>
            {m.matched ? '✓' : '✗'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderGames = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('interoceptive.gameTitle')}</Text>
      <View style={styles.ageInput}>
        <Text style={styles.label}>Baby age (months):</Text>
        <TextInput
          style={styles.textInput}
          value={String(babyAgeMonths)}
          onChangeText={v => setBabyAgeMonths(parseInt(v) || 0)}
          keyboardType="number-pad"
          accessibilityLabel="Baby age in months"
        />
      </View>
      <View style={styles.gameTypePicker}>
        {GAME_TYPES.map(g => (
          <TouchableOpacity
            key={g.value}
            style={[styles.gameCard, babyAgeMonths < g.age_months && styles.gameCardDisabled]}
            onPress={() => babyAgeMonths >= g.age_months && setGameType(g.value)}
            accessibilityLabel={`${g.label} (${g.age_months}+ months)`}
          >
            <Text style={styles.gameCardTitle}>{g.label}</Text>
            <Text style={styles.gameCardAge}>{g.age_months}+ months</Text>
            {babyAgeMonths < g.age_months && <Text style={styles.gameCardLock}>🔒 Not yet available</Text>}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.gameInput}>
        <Text style={styles.label}>Reaction:</Text>
        <TextInput
          style={[styles.textInput, { height: 60 }]}
          value={gameReaction}
          onChangeText={setGameReaction}
          multiline
          placeholder="How did baby react?"
          accessibilityLabel="Game reaction notes"
        />
      </View>
      <View style={styles.gameInput}>
        <Text style={styles.label}>Notes:</Text>
        <TextInput
          style={[styles.textInput, { height: 60 }]}
          value={gameNotes}
          onChangeText={setGameNotes}
          multiline
          placeholder="Additional observations"
          accessibilityLabel="Game notes"
        />
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={addGameEntry} accessibilityLabel="Log game entry">
        <Text style={styles.addBtnText}>Log Game</Text>
      </TouchableOpacity>
      {gameEntries.map(e => (
        <View key={e.id} style={styles.diaryCard}>
          <View style={styles.diaryHeader}>
            <Text style={styles.entryDate}>{new Date(e.date).toLocaleDateString()}</Text>
            <Text style={styles.entryText}>{GAME_TYPES.find(g => g.value === e.game_type)?.label}</Text>
          </View>
          <Text style={styles.diaryText}>{e.reaction}</Text>
          <Text style={styles.diaryMeta}>{e.notes}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tabBar}>
          {renderTabButton('dashboard', 'Dashboard')}
          {renderTabButton('body_scan', 'Body Scan')}
          {renderTabButton('diary', 'Diary')}
          {renderTabButton('precision', 'Score')}
          {renderTabButton('signal', 'Signal')}
          {renderTabButton('games', 'Games')}
        </View>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'body_scan' && renderBodyScan()}
        {activeTab === 'diary' && renderDiary()}
        {activeTab === 'precision' && renderPrecision()}
        {activeTab === 'signal' && renderSignal()}
        {activeTab === 'games' && renderGames()}
      </ScrollView>

      {/* Body Scan Modal */}
      <Modal visible={showBodyScan} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('interoceptive.bodyScanTitle')}</Text>
            {scanPhase < SCAN_PHASES.length ? (
              <>
                <Text style={styles.scanPhaseText}>
                  {t(`interoceptive.scan${SCAN_PHASES[scanPhase].charAt(0).toUpperCase() + SCAN_PHASES[scanPhase].slice(1)}`) || SCAN_PHASES[scanPhase]}
                </Text>
                <View style={styles.scanProgress}>
                  <View style={[styles.scanProgressBar, { width: `${((scanPhase + 1) / SCAN_PHASES.length) * 100}%` }]} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Complete HRV Entry</Text>
                <View style={styles.hrvInput}>
                  <Text style={styles.label}>{t('interoceptive.hrvBefore')}:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={hrvBefore}
                    onChangeText={setHrvBefore}
                    keyboardType="number-pad"
                    placeholder="50"
                    accessibilityLabel="HRV before scan"
                  />
                </View>
                <View style={styles.hrvInput}>
                  <Text style={styles.label}>{t('interoceptive.hrvAfter')}:</Text>
                  <TextInput
                    style={styles.textInput}
                    value={hrvAfter}
                    onChangeText={setHrvAfter}
                    keyboardType="number-pad"
                    placeholder="50"
                    accessibilityLabel="HRV after scan"
                  />
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={completeBodyScan} accessibilityLabel="Save body scan">
                  <Text style={styles.addBtnText}>Save Session</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowBodyScan(false)} accessibilityLabel="Close">
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Diary Entry Modal */}
      <Modal visible={showDiaryEntry} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('interoceptive.diaryTitle')}</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('interoceptive.gutFeeling')}:</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                value={gutFeeling}
                onChangeText={setGutFeeling}
                multiline
                placeholder="What is your gut feeling?"
                accessibilityLabel="Gut feeling description"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('interoceptive.gutIntensity')}: {gutIntensity}/5</Text>
              <View style={styles.intensityPicker}>
                {[1, 2, 3, 4, 5].map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.chip, gutIntensity === v && styles.chipActive]}
                    onPress={() => setGutIntensity(v)}
                    accessibilityLabel={`Intensity ${v}`}
                  >
                    <Text style={[styles.chipText, gutIntensity === v && styles.chipTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('interoceptive.bodyRegion')}:</Text>
              <View style={styles.optionGrid}>
                {BODY_REGIONS.map(r => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.chip, bodyRegion === r.value && styles.chipActive]}
                    onPress={() => setBodyRegion(r.value)}
                    accessibilityLabel={r.label}
                  >
                    <Text style={[styles.chipText, bodyRegion === r.value && styles.chipTextActive]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('interoceptive.emotionalValence')}:</Text>
              <View style={styles.optionGrid}>
                {EMOTIONAL_VALENCES.map(v => (
                  <TouchableOpacity
                    key={v.value}
                    style={[styles.chip, emotionalValence === v.value && styles.chipActive]}
                    onPress={() => setEmotionalValence(v.value)}
                    accessibilityLabel={v.label}
                  >
                    <Text style={[styles.chipText, emotionalValence === v.value && styles.chipTextActive]}>{v.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('interoceptive.babyState')} (your guess):</Text>
              <View style={styles.optionGrid}>
                {NEED_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.value}
                    style={[styles.chip, parentGuess === o.value && styles.chipActive]}
                    onPress={() => setParentGuess(o.value)}
                    accessibilityLabel={o.label}
                  >
                    <Text style={[styles.chipText, parentGuess === o.value && styles.chipTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={addDiaryEntry} accessibilityLabel="Save diary entry">
              <Text style={styles.addBtnText}>Save Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDiaryEntry(false)} accessibilityLabel="Close">
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Signal Challenge Modal */}
      <Modal visible={showSignalChallenge} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('interoceptive.signalMatchTitle')} — Challenge #{challengeIndex}/3</Text>
            <Text style={styles.modalSubtitle}>{t('interoceptive.signalChallenge')}</Text>
            <View style={styles.optionGrid}>
              {NEED_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.chip, parentGuess === o.value && styles.chipActive]}
                  onPress={() => setParentGuess(o.value)}
                  accessibilityLabel={o.label}
                >
                  <Text style={[styles.chipText, parentGuess === o.value && styles.chipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalSubtitle}>What actually resolved it?</Text>
            <View style={styles.optionGrid}>
              {NEED_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.chip, actualOutcome === o.value && styles.chipActive]}
                  onPress={() => setActualOutcome(o.value)}
                  accessibilityLabel={o.label}
                >
                  <Text style={[styles.chipText, actualOutcome === o.value && styles.chipTextActive]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={addSignalChallenge} accessibilityLabel="Submit challenge">
              <Text style={styles.addBtnText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => { setShowSignalChallenge(false); setChallengeIndex(1); }} accessibilityLabel="Close">
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 100 },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E2E8F0' },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 12, color: '#64748B' },
  tabBtnTextActive: { color: '#fff', fontWeight: '600' },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderLeftWidth: 4 },
  cardTitle: { fontSize: 14, color: '#64748B', marginBottom: 4 },
  bigNumber: { fontSize: 48, fontWeight: '800' },
  cardDesc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  badge: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { flex: 1, minWidth: 100, backgroundColor: COLORS.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 10, gap: 8 },
  entryDate: { fontSize: 11, color: '#94A3B8' },
  entryText: { flex: 1, fontSize: 13, color: '#334155' },
  entryMatch: { fontSize: 12, fontWeight: '600' },
  durationPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E2E8F0' },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, color: '#64748B' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  startScanBtn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  startScanBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  diaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4 },
  diaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diaryText: { fontSize: 14, color: '#1E293B' },
  diaryMeta: { fontSize: 12, color: '#94A3B8' },
  scoreBreakdown: { gap: 8, marginTop: 12 },
  scoreItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  scoreItemLabel: { fontSize: 13, color: '#64748B' },
  scoreItemValue: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  alertCard: { borderRadius: 8, padding: 12, marginTop: 8 },
  alertText: { fontSize: 13, color: '#92400E' },
  streakCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, alignItems: 'center' },
  streakNumber: { fontSize: 48, fontWeight: '800', color: COLORS.primary },
  streakLabel: { fontSize: 14, color: '#64748B', marginTop: 4 },
  ageInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameTypePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gameCard: { flex: 1, minWidth: 100, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center' },
  gameCardDisabled: { opacity: 0.5 },
  gameCardTitle: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  gameCardAge: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  gameCardLock: { fontSize: 10, color: '#EF4444', marginTop: 4 },
  gameInput: { gap: 4 },
  label: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  textInput: { backgroundColor: '#fff', borderRadius: 8, padding: 10, fontSize: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  formGroup: { gap: 8, marginBottom: 12 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 16, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#64748B', marginTop: 12, marginBottom: 8 },
  scanPhaseText: { fontSize: 24, fontWeight: '700', color: COLORS.primary, textAlign: 'center', marginVertical: 20 },
  scanProgress: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, marginHorizontal: 20 },
  scanProgressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  hrvInput: { marginBottom: 12 },
  closeBtn: { marginTop: 12, padding: 12, alignItems: 'center' },
  closeBtnText: { color: '#94A3B8', fontSize: 14 },
  intensityPicker: { flexDirection: 'row', gap: 6 },
});

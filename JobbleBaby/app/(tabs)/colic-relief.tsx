import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Platform
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  cryingLog: '@jobble/crying_log',
  colicComfortLog: '@jobble/colic_comfort_log',
  whiteNoisePref: '@jobble/white_noise_pref',
  colicBadge: '@jobble/colic_badge',
};

// i18n-derived arrays (no longer hardcoded)
const TRIGGERS = ((): string[] => {
  const i18n = require('../i18n/en.json').colicRelief;
  return Object.keys(i18n).filter(k => k.startsWith('trigger_')).map(k => k.replace('trigger_', ''));
})();
const WHITE_NOISE_SOUNDS = ((): string[] => {
  const i18n = require('../i18n/en.json').colicRelief;
  return Object.keys(i18n).filter(k => k.startsWith('sound_')).map(k => k.replace('sound_', ''));
})();
const COMFORT_ACTIONS = [
  { id: 'bicycle', label: 'Bicycle Legs', icon: '🫠' },
  { id: 'massage', label: 'Belly Massage', icon: '🤚' },
  { id: 'warm', label: 'Warm Compress', icon: '🌡️' },
  { id: 'gripe', label: 'Gripe Water', icon: '💧' },
  { id: 'probiotic', label: 'Probiotic Drops', icon: '💊' },
];

interface CryingEntry {
  id: string;
  date: string;
  duration: number; // minutes
  intensity: number; // 1-10
  trigger: string;
}

interface ComfortEntry {
  id: string;
  date: string;
  action: string;
  duration: number; // minutes
}

interface WhiteNoisePref {
  sound: string;
  timer: number; // minutes, 0 = continuous
}

export default function ColicReliefScreen() {
  const { t } = useLanguage();
  const [cryingLog, setCryingLog] = useState<CryingEntry[]>([]);
  const [comfortLog, setComfortLog] = useState<ComfortEntry[]>([]);
  const [whiteNoise, setWhiteNoise] = useState<WhiteNoisePref>({ sound: '', timer: 0 });
  const [badge, setBadge] = useState(false);
  const [activeTab, setActiveTab] = useState<'tracker' | 'guide' | 'comfort' | 'education' | 'timer' | 'whitenoise'>('tracker');

  // Crying tracker state
  const [cryingDuration, setCryingDuration] = useState('');
  const [cryingIntensity, setCryingIntensity] = useState(5);
  const [cryingTrigger, setCryingTrigger] = useState('unknown');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // White noise state
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [soundTimer, setSoundTimer] = useState(0);
  const soundTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Timer effect
  useEffect(() => {
    if (timerRunning && timerStart) {
      timerRef.current = setInterval(() => {
        setTimerElapsed(Math.floor((Date.now() - timerStart) / 1000));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timerStart]);

  // Sound timer effect
  useEffect(() => {
    if (playingSound && soundTimer > 0) {
      soundTimerRef.current = setInterval(() => {
        setSoundTimer(prev => {
          if (prev <= 1) {
            setPlayingSound(null);
            return 0;
          }
          return prev - 1;
        });
      }, 60000);
    } else if (soundTimerRef.current) {
      clearInterval(soundTimerRef.current);
    }
    return () => { if (soundTimerRef.current) clearInterval(soundTimerRef.current); };
  }, [playingSound, soundTimer]);

  const loadData = async () => {
    try {
      const [crying, comfort, wn, badgeData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.cryingLog),
        AsyncStorage.getItem(STORAGE_KEYS.colicComfortLog),
        AsyncStorage.getItem(STORAGE_KEYS.whiteNoisePref),
        AsyncStorage.getItem(STORAGE_KEYS.colicBadge),
      ]);
      if (crying) setCryingLog(JSON.parse(crying));
      if (comfort) setComfortLog(JSON.parse(comfort));
      if (wn) setWhiteNoise(JSON.parse(wn));
      if (badgeData === 'true') setBadge(true);
    } catch (e) { /* silently fail */ }
  };

  const saveCryingLog = async (log: CryingEntry[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.cryingLog, JSON.stringify(log));
    setCryingLog(log);
    checkBadge(log);
  };

  const saveComfortLog = async (log: ComfortEntry[]) => {
    await AsyncStorage.setItem(STORAGE_KEYS.colicComfortLog, JSON.stringify(log));
    setComfortLog(log);
  };

  const checkBadge = async (log: CryingEntry[]) => {
    // Check if user logged 7 consecutive days
    const today = new Date();
    let consecutive = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const hasEntry = log.some(e => e.date.startsWith(dateStr));
      if (hasEntry) consecutive++;
      else break;
    }
    if (consecutive >= 7) {
      setBadge(true);
      await AsyncStorage.setItem(STORAGE_KEYS.colicBadge, 'true');
    }
  };

  const addCryingEntry = async () => {
    const duration = parseInt(cryingDuration) || 0;
    if (duration <= 0) { Alert.alert(t('colicRelief.error'), t('colicRelief.enterDuration')); return; }
    const entry: CryingEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration,
      intensity: cryingIntensity,
      trigger: cryingTrigger,
    };
    await saveCryingLog([...cryingLog, entry]);
    setCryingDuration('');
    setCryingIntensity(5);
    Alert.alert(t('colicRelief.logged'), t('colicRelief.cryingLogged'));
  };

  const addComfortEntry = async (action: string) => {
    const entry: ComfortEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      action,
      duration: 10,
    };
    await saveComfortLog([...comfortLog, entry]);
  };

  const startTimer = () => {
    setTimerStart(Date.now());
    setTimerRunning(true);
    setTimerElapsed(0);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    if (timerStart) {
      const minutes = Math.floor((Date.now() - timerStart) / 60000);
      if (minutes > 0) {
        const entry: CryingEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          duration: minutes,
          intensity: cryingIntensity,
          trigger: 'unknown',
        };
        saveCryingLog([...cryingLog, entry]);
      }
    }
    setTimerStart(null);
    setTimerElapsed(0);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const totalCryingToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return cryingLog
      .filter(e => e.date.startsWith(today))
      .reduce((sum, e) => sum + e.duration, 0);
  };

  const weeklyData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const total = cryingLog
        .filter(e => e.date.startsWith(dateStr))
        .reduce((sum, e) => sum + e.duration, 0);
      data.push({ day: date.toLocaleDateString('en', { weekday: 'short' }), total });
    }
    return data;
  };

  const playSound = (sound: string, minutes: number) => {
    setPlayingSound(sound);
    setSoundTimer(minutes);
    setWhiteNoise({ sound, timer: minutes });
    AsyncStorage.setItem(STORAGE_KEYS.whiteNoisePref, JSON.stringify({ sound, timer: minutes }));
  };

  const stopSound = () => {
    setPlayingSound(null);
    setSoundTimer(0);
  };

  const todayTotal = totalCryingToday();
  const showStressAlert = todayTotal >= 300; // 5 hours

  const renderTab = (tab: 'tracker' | 'guide' | 'comfort' | 'education' | 'timer' | 'whitenoise', label: string) => (
    <TouchableOpacity
      style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
      onPress={() => setActiveTab(tab)}
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === tab }}
    >
      <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderTracker = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('colicRelief.cryingPatternTracker')}</Text>
      {showStressAlert && (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>{t('colicRelief.stressAlert')}</Text>
        </View>
      )}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{t('colicRelief.todayTotal')}</Text>
        <Text style={styles.summaryValue}>{todayTotal} {t('colicRelief.minutes')}</Text>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('colicRelief.duration')}</Text>
        <TextInput
          style={styles.input}
          value={cryingDuration}
          onChangeText={setCryingDuration}
          placeholder={t('colicRelief.durationPlaceholder')}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('colicRelief.intensity')}: {cryingIntensity}</Text>
        <View style={styles.intensityRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <TouchableOpacity
              key={n}
              style={[styles.intensityBtn, cryingIntensity === n && styles.intensityBtnActive]}
              onPress={() => setCryingIntensity(n)}
              accessibilityLabel={`${t('colicRelief.intensity')} ${n}`}
              accessibilityRole="button"
              accessibilityState={{ selected: cryingIntensity === n }}
            >
              <Text style={styles.intensityBtnText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('colicRelief.trigger')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.triggerScroll}>
          {TRIGGERS.map(tr => (
            <TouchableOpacity
              key={tr}
              style={[styles.triggerBtn, cryingTrigger === tr && styles.triggerBtnActive]}
              onPress={() => setCryingTrigger(tr)}
              accessibilityLabel={t(`colicRelief.trigger_${tr}`)}
              accessibilityRole="button"
              accessibilityState={{ selected: cryingTrigger === tr }}
            >
              <Text style={[styles.triggerBtnText, cryingTrigger === tr && styles.triggerBtnTextActive]}>
                {t(`colicRelief.trigger_${tr}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={addCryingEntry}
        accessibilityLabel={t('colicRelief.logEpisode')}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>{t('colicRelief.logEpisode')}</Text>
      </TouchableOpacity>
      <Text style={styles.logTitle}>{t('colicRelief.recentLog')}</Text>
      {cryingLog.slice(-5).reverse().map(entry => (
        <View key={entry.id} style={styles.logEntry}>
          <Text style={styles.logEntryText}>
            {new Date(entry.date).toLocaleString()} — {entry.duration}m @ {entry.intensity}/10 [{t(`colicRelief.trigger_${entry.trigger}`)}]
          </Text>
        </View>
      ))}
    </View>
  );

  const renderGuide = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('colicRelief.fiveSGuide')}</Text>
      {[
        { s: 'Swaddle', desc: t('colicRelief.swaddleDesc'), icon: '👶' },
        { s: 'Side-hold', desc: t('colicRelief.sideHoldDesc'), icon: '🤗' },
        { s: 'Shush', desc: t('colicRelief.shushDesc'), icon: '🤫' },
        { s: 'Swing', desc: t('colicRelief.swingDesc'), icon: '🪁' },
        { s: 'Suck', desc: t('colicRelief.suckDesc'), icon: '🍼' },
      ].map(item => (
        <View key={item.s} style={styles.card5S}>
          <Text style={styles.card5SIcon}>{item.icon}</Text>
          <View style={styles.card5SText}>
            <Text style={styles.card5STitle}>{item.s}</Text>
            <Text style={styles.card5SDesc}>{item.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderComfort = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('colicRelief.colicComfortArsenal')}</Text>
      <View style={styles.comfortGrid}>
        {COMFORT_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.id}
            style={styles.comfortCard}
            onPress={() => addComfortEntry(action.id)}
            accessibilityLabel={t(`colicRelief.${action.id}`)}
            accessibilityRole="button"
          >
            <Text style={styles.comfortIcon}>{action.icon}</Text>
            <Text style={styles.comfortLabel}>{t(`colicRelief.${action.id}`)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.logTitle}>{t('colicRelief.comfortLog')}</Text>
      {comfortLog.slice(-5).reverse().map(entry => (
        <View key={entry.id} style={styles.logEntry}>
          <Text style={styles.logEntryText}>
            {new Date(entry.date).toLocaleString()} — {t(`colicRelief.${entry.action}`)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderEducation = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('colicRelief.purpleCryingEducation')}</Text>
      <View style={styles.eduCard}>
        <Text style={styles.eduTitle}>{t('colicRelief.whatIsPurple')}</Text>
        <Text style={styles.eduText}>{t('colicRelief.purpleDesc')}</Text>
      </View>
      <View style={styles.eduCard}>
        <Text style={styles.eduTitle}>{t('colicRelief.whenToSeekHelp')}</Text>
        <Text style={styles.eduText}>{t('colicRelief.seekHelpDesc')}</Text>
      </View>
      <View style={styles.eduCard}>
        <Text style={styles.eduTitle}>⚠️ {t('colicRelief.intussusception')}</Text>
        <Text style={styles.eduText}>{t('colicRelief.intussusceptionDesc')}</Text>
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🏆 {t('colicRelief.survivedPurple')}</Text>
        </View>
      )}
    </View>
  );

  const renderTimer = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('colicRelief.cryingTimer')}</Text>
      <View style={styles.timerDisplay}>
        <Text style={styles.timerText}>{formatTime(timerElapsed)}</Text>
      </View>
      <View style={styles.timerControls}>
        {!timerRunning ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={startTimer}
            accessibilityLabel={t('colicRelief.startTimer')}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>{t('colicRelief.startTimer')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={stopTimer}
            accessibilityLabel={t('colicRelief.stopTimer')}
            accessibilityRole="button"
          >
            <Text style={styles.stopBtnText}>{t('colicRelief.stopTimer')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.logTitle}>{t('colicRelief.weeklyTrend')}</Text>
      <View style={styles.weeklyChart}>
        {weeklyData().map((d, i) => (
          <View key={i} style={styles.chartBar}>
            <View style={[styles.bar, { height: Math.min(d.total / 60 * 40, 80) }]} />
            <Text style={styles.barLabel}>{d.day}</Text>
            <Text style={styles.barValue}>{d.total}m</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderWhiteNoise = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('colicRelief.whiteNoiseLibrary')}</Text>
      <View style={styles.soundGrid}>
        {WHITE_NOISE_SOUNDS.map(sound => (
          <TouchableOpacity
            key={sound}
            style={[styles.soundCard, playingSound === sound && styles.soundCardActive]}
            onPress={() => playingSound === sound ? stopSound() : playSound(sound, 30)}
            accessibilityLabel={t(`colicRelief.sound_${sound}`)}
            accessibilityRole="button"
            accessibilityState={{ selected: playingSound === sound }}
          >
            <Text style={styles.soundIcon}>
              {sound === 'vacuum' ? '🧹' : sound === 'fan' ? '🌀' : sound === 'shusher' ? '🤫' : '🌊'}
            </Text>
            <Text style={styles.soundLabel}>{t(`colicRelief.sound_${sound}`)}</Text>
            {playingSound === sound && <Text style={styles.soundTimer}>{soundTimer}m</Text>}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.timerPresets}>
        <Text style={styles.inputLabel}>{t('colicRelief.timerPresets')}</Text>
        <View style={styles.presetRow}>
          {[15, 30, 60].map(m => (
            <TouchableOpacity
              key={m}
              style={styles.presetBtn}
              onPress={() => playingSound ? playSound(playingSound, m) : null}
              accessibilityLabel={`${m} minutes`}
              accessibilityRole="button"
            >
              <Text style={styles.presetBtnText}>{m}m</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.tabBar}>
        {renderTab('tracker', t('colicRelief.tabTracker'))}
        {renderTab('guide', t('colicRelief.tabGuide'))}
        {renderTab('comfort', t('colicRelief.tabComfort'))}
        {renderTab('education', t('colicRelief.tabEducation'))}
        {renderTab('timer', t('colicRelief.tabTimer'))}
        {renderTab('whitenoise', t('colicRelief.tabWhiteNoise'))}
      </View>
      {activeTab === 'tracker' && renderTracker()}
      {activeTab === 'guide' && renderGuide()}
      {activeTab === 'comfort' && renderComfort()}
      {activeTab === 'education' && renderEducation()}
      {activeTab === 'timer' && renderTimer()}
      {activeTab === 'whitenoise' && renderWhiteNoise()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f4ff' },
  content: { padding: 16, paddingBottom: 40 },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 6 },
  tabBtn: { paddingHorizontal: 10, paddingVertical: 11, borderRadius: 16, backgroundColor: '#e8e0f0', marginRight: 4, marginBottom: 4 },
  tabBtnActive: { backgroundColor: '#7c3aed' },
  tabBtnText: { fontSize: 11, color: '#444', fontWeight: '600' },
  tabBtnTextActive: { color: '#fff' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 16 },
  alertBox: { backgroundColor: '#ff4444', padding: 12, borderRadius: 12, marginBottom: 12 },
  alertText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  summaryCard: { backgroundColor: '#ede9fe', padding: 16, borderRadius: 12, marginBottom: 16 },
  summaryLabel: { fontSize: 12, color: '#7c3aed', marginBottom: 4 },
  summaryValue: { fontSize: 28, fontWeight: '700', color: '#7c3aed' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0' },
  intensityRow: { flexDirection: 'row', gap: 4 },
  intensityBtn: { minHeight: 44, paddingHorizontal: 4, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e0e0e0' },
  intensityBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  intensityBtnText: { fontSize: 12, fontWeight: '600', color: '#333' },
  triggerScroll: { flexDirection: 'row' },
  triggerBtn: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#fff', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  triggerBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  triggerBtnText: { fontSize: 12, color: '#333' },
  triggerBtnTextActive: { color: '#fff' },
  primaryBtn: { backgroundColor: '#7c3aed', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  stopBtn: { backgroundColor: '#dc2626', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  stopBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  logTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 8 },
  logEntry: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#f0f0f0' },
  logEntryText: { fontSize: 12, color: '#333' },
  card5S: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ede9fe' },
  card5SIcon: { fontSize: 32, marginRight: 16 },
  card5SText: { flex: 1 },
  card5STitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  card5SDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
  comfortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  comfortCard: { width: '47%', backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ede9fe' },
  comfortIcon: { fontSize: 28, marginBottom: 8 },
  comfortLabel: { fontSize: 13, fontWeight: '600', color: '#333', textAlign: 'center' },
  eduCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#7c3aed' },
  eduTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 6 },
  eduText: { fontSize: 13, color: '#555', lineHeight: 20 },
  badge: { backgroundColor: '#fbbf24', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  badgeText: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  timerDisplay: { backgroundColor: '#1a1a2e', padding: 32, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  timerText: { fontSize: 48, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] },
  timerControls: { alignItems: 'center', marginBottom: 16 },
  weeklyChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', backgroundColor: '#fff', padding: 16, borderRadius: 12, height: 140 },
  chartBar: { alignItems: 'center', flex: 1 },
  bar: { width: 24, backgroundColor: '#7c3aed', borderRadius: 4, marginBottom: 4 },
  barLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  barValue: { fontSize: 9, color: '#999' },
  soundGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  soundCard: { width: '47%', backgroundColor: '#fff', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#e0e0e0' },
  soundCardActive: { borderColor: '#7c3aed', backgroundColor: '#f3e8ff' },
  soundIcon: { fontSize: 32, marginBottom: 8 },
  soundLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  soundTimer: { fontSize: 12, color: '#7c3aed', marginTop: 4, fontWeight: '700' },
  timerPresets: { marginTop: 8 },
  presetRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  presetBtn: { flex: 1, minHeight: 44, paddingVertical: 10, backgroundColor: '#ede9fe', borderRadius: 8, alignItems: 'center' },
  presetBtnText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },
});

import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, STATUS_COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

type WarmingMethod = 'bottleWarmer' | 'warmWaterBath' | 'ambient';
type SafetyVerdict = 'safe' | 'caution' | 'unsafe';

interface MilkWarmingSession {
  startedAt: number;
  method: WarmingMethod;
  maxDurationMs: number;
  thawedAt?: number;
}

const WARMING_LIMITS: Record<WarmingMethod, { maxMinutes: number; label: string }> = {
  bottleWarmer: { maxMinutes: 5, label: 'Bottle Warmer' },
  warmWaterBath: { maxMinutes: 10, label: 'Warm Water Bath' },
  ambient: { maxMinutes: 20, label: 'Ambient Warming' },
};

const TARGET_TEMP = 37;
const POST_WARMING_EXPIRY_HOURS = 2;
const THAWED_MILK_EXPIRY_HOURS = 24;

const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const getSafetyVerdict = (temp: number): SafetyVerdict | null => {
  if (temp >= 36 && temp <= 40) return 'safe';
  if (temp > 40) return 'unsafe';
  if (temp < 36) return 'caution';
  return null;
};

const getTempAlert = (temp: number): string | null => {
  if (temp > 40) return 'milkThermalSafety.alertAbove40';
  if (temp < 36) return 'milkThermalSafety.alertBelow36';
  return null;
};

export default function MilkThermalSafetyCheckerScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [warmingMethod, setWarmingMethod] = useState<WarmingMethod>('bottleWarmer');
  const [currentTemp, setCurrentTemp] = useState<string>('');
  const [timer, setTimer] = useState<MilkWarmingSession | null>(null);
  const [timerDisplay, setTimerDisplay] = useState<string>('--:--');
  const [timerExpired, setTimerExpired] = useState(false);
  const [thawedTimestamp, setThawedTimestamp] = useState<number | null>(null);
  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadSession = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.MILK_WARMING_SESSION);
        if (saved) {
          const session: MilkWarmingSession = JSON.parse(saved);
          const elapsed = Date.now() - session.startedAt;
          if (elapsed < session.maxDurationMs) {
            setTimer(session);
            setTimerExpired(false);
          } else {
            setTimerExpired(true);
            setTimer(session);
          }
        }
      } catch {
        // Silent fail
      }
    };
    loadSession();
  }, []);

  useEffect(() => {
    if (!timer) {
      setTimerDisplay('--:--');
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - timer.startedAt;
      const remaining = timer.maxDurationMs - elapsed;
      if (remaining <= 0) {
        setTimerDisplay('00:00');
        setTimerExpired(true);
      } else {
        setTimerDisplay(formatCountdown(remaining));
        setTimerExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const isPostWarmingExpired = useCallback((): boolean => {
    if (!timer) return false;
    const elapsed = Date.now() - timer.startedAt;
    const expiryMs = POST_WARMING_EXPIRY_HOURS * 60 * 60 * 1000;
    return elapsed >= expiryMs;
  }, [timer]);

  const isThawedExpired = useCallback((): boolean => {
    if (!thawedTimestamp) return false;
    const elapsed = Date.now() - thawedTimestamp;
    const expiryMs = THAWED_MILK_EXPIRY_HOURS * 60 * 60 * 1000;
    return elapsed >= expiryMs;
  }, [thawedTimestamp]);

  const startTimer = async () => {
    const methodConfig = WARMING_LIMITS[warmingMethod];
    const maxDurationMs = methodConfig.maxMinutes * 60 * 1000;
    const newTimer: MilkWarmingSession = {
      startedAt: Date.now(),
      method: warmingMethod,
      maxDurationMs,
      thawedAt: thawedTimestamp || undefined,
    };
    setTimer(newTimer);
    setTimerExpired(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MILK_WARMING_SESSION, JSON.stringify(newTimer));
    } catch {
      // Silent fail
    }
  };

  const stopTimer = async () => {
    setTimer(null);
    setTimerDisplay('--:--');
    setTimerExpired(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.MILK_WARMING_SESSION);
    } catch {
      // Silent fail
    }
  };

  const handleThawedTimeSet = () => {
    if (!thawedTimestamp) {
      setThawedTimestamp(Date.now());
    } else {
      setThawedTimestamp(null);
    }
  };

  const toggleTip = (key: string) => {
    setExpandedTips((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const tempValue = parseFloat(currentTemp);
  const verdict = !isNaN(tempValue) ? getSafetyVerdict(tempValue) : null;
  const tempAlert = !isNaN(tempValue) ? getTempAlert(tempValue) : null;
  const postWarmingExpired = isPostWarmingExpired();
  const thawedExpired = isThawedExpired();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    sectionTitle: {
      fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 12, marginTop: 24,
    },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
    },
    methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    methodButton: {
      flex: 1, borderRadius: 12, padding: 12, alignItems: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    methodButtonActive: { backgroundColor: C.accent, borderColor: C.accent },
    methodButtonText: { fontSize: 12, fontWeight: '600', color: C.text },
    methodButtonTextActive: { color: '#fff' },
    targetTempContainer: {
      alignItems: 'center',
      paddingVertical: 16,
    },
    targetTempValue: { fontSize: 48, fontWeight: '700', color: C.text },
    targetTempLabel: { fontSize: 14, color: C.muted, marginTop: 4 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    input: {
      flex: 1, backgroundColor: C.background, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 16,
    },
    inputLabel: { fontSize: 14, color: C.muted, marginBottom: 8 },
    verdictBadge: {
      borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16,
      alignSelf: 'flex-start', marginTop: 12,
    },
    verdictText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    alertCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderLeftWidth: 4,
    },
    alertText: { fontSize: 13, color: C.text },
    timerDisplay: { fontSize: 48, fontWeight: '700', color: C.text, textAlign: 'center', marginVertical: 16 },
    timerStatus: { fontSize: 14, color: C.muted, textAlign: 'center' },
    timerRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    timerButton: {
      flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    },
    timerButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    expiredBanner: {
      backgroundColor: STATUS_COLORS.error, borderRadius: 12, padding: 16, marginBottom: 16,
    },
    expiredText: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
    stopButton: {
      borderRadius: 12, paddingVertical: 12, alignItems: 'center',
      borderWidth: 1, borderColor: STATUS_COLORS.error,
    },
    stopButtonText: { fontSize: 14, fontWeight: '600', color: STATUS_COLORS.error },
    maxDurationRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 8 },
    maxDurationText: { fontSize: 12, color: C.muted },
    tipItem: {
      backgroundColor: C.card, borderRadius: 12, marginBottom: 8,
      borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    },
    tipHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    tipTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
    tipChevron: { fontSize: 16, color: C.muted },
    tipBody: { padding: 16, paddingTop: 0, fontSize: 13, color: C.muted, lineHeight: 20 },
    thawedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    thawedLabel: { fontSize: 14, color: C.muted },
    thawedButton: {
      borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
      borderWidth: 1, borderColor: C.border,
    },
    thawedButtonText: { fontSize: 12, fontWeight: '600', color: C.text },
    thawedButtonActive: { backgroundColor: C.accent, borderColor: C.accent },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('milkThermalSafety.greeting')}</Text>
          <Text style={styles.title}>{t('milkThermalSafety.title')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('milkThermalSafety.methodTitle')}</Text>
        <View style={styles.card}>
          <View style={styles.methodRow}>
            <TouchableOpacity
              accessibilityLabel={t('milkThermalSafety.methodBottleWarmer')}
              accessibilityHint="Select bottle warmer method"
              style={[styles.methodButton, warmingMethod === 'bottleWarmer' && styles.methodButtonActive]}
              onPress={() => setWarmingMethod('bottleWarmer')}
            >
              <Text style={[styles.methodButtonText, warmingMethod === 'bottleWarmer' && styles.methodButtonTextActive]}>
                {t('milkThermalSafety.methodBottleWarmer')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={t('milkThermalSafety.methodWarmWaterBath')}
              accessibilityHint="Select warm water bath method"
              style={[styles.methodButton, warmingMethod === 'warmWaterBath' && styles.methodButtonActive]}
              onPress={() => setWarmingMethod('warmWaterBath')}
            >
              <Text style={[styles.methodButtonText, warmingMethod === 'warmWaterBath' && styles.methodButtonTextActive]}>
                {t('milkThermalSafety.methodWarmWaterBath')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={t('milkThermalSafety.methodAmbient')}
              accessibilityHint="Select ambient warming method"
              style={[styles.methodButton, warmingMethod === 'ambient' && styles.methodButtonActive]}
              onPress={() => setWarmingMethod('ambient')}
            >
              <Text style={[styles.methodButtonText, warmingMethod === 'ambient' && styles.methodButtonTextActive]}>
                {t('milkThermalSafety.methodAmbient')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('milkThermalSafety.targetTemp')}</Text>
        <View style={styles.card}>
          <View style={styles.targetTempContainer}>
            <Text style={styles.targetTempValue}>{t('milkThermalSafety.tempCelsius', { temp: TARGET_TEMP })}</Text>
            <Text style={styles.targetTempLabel}>{t('milkThermalSafety.targetTemp')}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('milkThermalSafety.timerTitle')}</Text>
        <View style={styles.card}>
          {!timer && !timerExpired && (
            <>
              <TouchableOpacity
                accessibilityLabel={t('milkThermalSafety.startTimer')}
                accessibilityHint="Starts the safe warming timer"
                style={[styles.timerButton, { backgroundColor: C.accent }]}
                onPress={startTimer}
              >
                <Text style={styles.timerButtonText}>{t('milkThermalSafety.startTimer')}</Text>
              </TouchableOpacity>
              <View style={styles.maxDurationRow}>
                <Text style={styles.maxDurationText}>
                  {t('milkThermalSafety.maxDuration')}: {t('milkThermalSafety.minutes', { min: WARMING_LIMITS[warmingMethod].maxMinutes })}
                </Text>
              </View>
            </>
          )}
          {timer && !timerExpired && (
            <>
              <Text style={styles.timerDisplay}>{timerDisplay}</Text>
              <Text style={styles.timerStatus}>{t('milkThermalSafety.timerRunning')}</Text>
              <TouchableOpacity
                accessibilityLabel={t('milkThermalSafety.stopTimer')}
                accessibilityHint="Stops the warming timer"
                style={[styles.stopButton, { marginTop: 16 }]}
                onPress={stopTimer}
              >
                <Text style={styles.stopButtonText}>{t('milkThermalSafety.stopTimer')}</Text>
              </TouchableOpacity>
            </>
          )}
          {timerExpired && (
            <>
              <View style={styles.expiredBanner}>
                <Text style={styles.expiredText}>{t('milkThermalSafety.timerExpired')}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel={t('milkThermalSafety.stopTimer')}
                accessibilityHint="Stops and resets the timer"
                style={styles.stopButton}
                onPress={stopTimer}
              >
                <Text style={styles.stopButtonText}>{t('milkThermalSafety.stopTimer')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('milkThermalSafety.currentTemp')}</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>{t('milkThermalSafety.enterTemp')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={currentTemp}
              onChangeText={setCurrentTemp}
              keyboardType="numeric"
              placeholder="37"
              placeholderTextColor={C.muted}
            />
          </View>
          {verdict && (
            <View style={[styles.verdictBadge, {
              backgroundColor: STATUS_COLORS[verdict === 'safe' ? 'good' : verdict === 'caution' ? 'warning' : 'error']
            }]}>
              <Text style={styles.verdictText}>
                {t(`milkThermalSafety.status${verdict.charAt(0).toUpperCase() + verdict.slice(1)}`)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('milkThermalSafety.tipsTitle')}</Text>
        <View style={styles.card}>
          {tempAlert && (
            <View style={[styles.alertCard, { borderLeftColor: STATUS_COLORS.error }]}>
              <Text style={styles.alertText}>{t(tempAlert)}</Text>
            </View>
          )}
          {postWarmingExpired && (
            <View style={[styles.alertCard, { borderLeftColor: STATUS_COLORS.error }]}>
              <Text style={styles.alertText}>{t('milkThermalSafety.alertPostWarmingExpired')}</Text>
            </View>
          )}
          {!postWarmingExpired && timer && (
            <View style={[styles.alertCard, { borderLeftColor: STATUS_COLORS.warning }]}>
              <Text style={styles.alertText}>{t('milkThermalSafety.alertNeverReheat')}</Text>
            </View>
          )}
          {thawedExpired && (
            <View style={[styles.alertCard, { borderLeftColor: STATUS_COLORS.error }]}>
              <Text style={styles.alertText}>{t('milkThermalSafety.alertThawed24h')}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('milkThermalSafety.tipsTitle')}</Text>
        <View style={styles.card}>
          <View style={styles.thawedRow}>
            <Text style={styles.thawedLabel}>{t('milkThermalSafety.alertThawed24h')}</Text>
            <TouchableOpacity
              accessibilityLabel="Set thaw time"
              accessibilityHint="Toggle thawed milk tracking"
              style={[styles.thawedButton, thawedTimestamp ? styles.thawedButtonActive : null]}
              onPress={handleThawedTimeSet}
            >
              <Text style={[styles.thawedButtonText, thawedTimestamp ? styles.methodButtonTextActive : null]}>
                {thawedTimestamp ? t('milkThermalSafety.alertThawed24h') : t('milkThermalSafety.tipThawedTitle')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{t('milkThermalSafety.tipsTitle')}</Text>
        <View style={styles.card}>
          {[
            { key: 'reheat', title: t('milkThermalSafety.tipReheatTitle'), body: t('milkThermalSafety.tipReheatBody') },
            { key: 'storage', title: t('milkThermalSafety.tipStorageTitle'), body: t('milkThermalSafety.tipStorageBody') },
            { key: 'thawed', title: t('milkThermalSafety.tipThawedTitle'), body: t('milkThermalSafety.tipThawedBody') },
          ].map((tip) => (
            <View key={tip.key} style={styles.tipItem}>
              <TouchableOpacity
                style={styles.tipHeader}
                onPress={() => toggleTip(tip.key)}
                accessibilityLabel={tip.title}
                accessibilityHint="Toggle tip visibility"
              >
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <MaterialCommunityIcons
                  name={expandedTips[tip.key] ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={C.muted}
                />
              </TouchableOpacity>
              {expandedTips[tip.key] && <Text style={styles.tipBody}>{tip.body}</Text>}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

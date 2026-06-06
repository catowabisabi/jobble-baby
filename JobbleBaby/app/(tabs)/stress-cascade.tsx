import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Animated, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';

interface StressEntry {
  id: string;
  timestamp: string;
  type: 'overwhelmed' | 'sleep_hours' | 'missed_meal' | 'caffeine';
  value?: number;
}

interface SleepNight {
  date: string;
  hoursSlept: number;
  wasRegression?: boolean;
}

const STRESS_LOG_KEY = '@jobble/stress_log';
const STRESS_CHECKIN_KEY = '@jobble/stress_checkin_date';
const SLEEP_TRAINING_NIGHTS_KEY = '@jobble/sleep_training_nights';
const EMERGENCY_CONTACTS_KEY = '@jobble/emergency_contacts';
const INTERVENTIONS_COUNT_KEY = '@jobble/stress_interventions_count';
const SHIFT_HANDOFF_KEY = '@jobble/shift_state';

const PLACEHOLDER_PHONE = '12345678';

export default function StressCascade() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [stressLog, setStressLog] = useState<StressEntry[]>([]);
  const [parentSleepHours, setParentSleepHours] = useState('');
  const [missedMeal, setMissedMeal] = useState(false);
  const [tooMuchCaffeine, setTooMuchCaffeine] = useState(false);
  const [sleepNights, setSleepNights] = useState<SleepNight[]>([]);
  const [interventionsCount, setInterventionsCount] = useState(0);
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale' | 'done'>('inhale');
  const [breathingCycle, setBreathingCycle] = useState(1);
  const [showCheckin, setShowCheckin] = useState(false);
  const [stressCheckinDate, setStressCheckinDate] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showBreathing) {
      runBreathingCycle();
    }
  }, [showBreathing, breathingCycle]);

  const loadData = async () => {
    try {
      const [logRaw, nightsRaw, countRaw, checkinRaw] = await Promise.all([
        AsyncStorage.getItem(STRESS_LOG_KEY),
        AsyncStorage.getItem(SLEEP_TRAINING_NIGHTS_KEY),
        AsyncStorage.getItem(INTERVENTIONS_COUNT_KEY),
        AsyncStorage.getItem(STRESS_CHECKIN_KEY),
      ]);
      if (logRaw) setStressLog(JSON.parse(logRaw));
      if (nightsRaw) setSleepNights(JSON.parse(nightsRaw));
      if (countRaw) setInterventionsCount(parseInt(countRaw, 10));
      if (checkinRaw) setStressCheckinDate(checkinRaw);
    } catch {}
  };

  const saveStressLog = async (log: StressEntry[]) => {
    setStressLog(log);
    try {
      await AsyncStorage.setItem(STRESS_LOG_KEY, JSON.stringify(log));
    } catch {}
  };

  const saveInterventionsCount = async (count: number) => {
    setInterventionsCount(count);
    try {
      await AsyncStorage.setItem(INTERVENTIONS_COUNT_KEY, String(count));
    } catch {}
  };

  const saveStressCheckinDate = async (date: string) => {
    setStressCheckinDate(date);
    try {
      await AsyncStorage.setItem(STRESS_CHECKIN_KEY, date);
    } catch {}
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const handleOverwhelmed = async () => {
    const entry: StressEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'overwhelmed',
    };
    await saveStressLog([...stressLog, entry]);
    await saveInterventionsCount(interventionsCount + 1);

    if (interventionsCount + 1 >= 3) {
      await awardBadge('stress_survival');
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await saveStressCheckinDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleSaveSleepHours = async () => {
    const hours = parseFloat(parentSleepHours);
    if (!isNaN(hours) && hours >= 0 && hours <= 24) {
      const entry: StressEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'sleep_hours',
        value: hours,
      };
      await saveStressLog([...stressLog, entry]);
    }
    if (missedMeal) {
      const entry: StressEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'missed_meal',
      };
      await saveStressLog([...stressLog, entry]);
    }
    if (tooMuchCaffeine) {
      const entry: StressEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        type: 'caffeine',
      };
      await saveStressLog([...stressLog, entry]);
    }
  };

  const getConsecutiveLowSleepDays = (): number => {
    const sortedNights = [...sleepNights].sort((a, b) => b.date.localeCompare(a.date));
    let consecutive = 0;
    for (const night of sortedNights) {
      if (night.hoursSlept < 5) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  };

  const hasSleepRegression = (): boolean => {
    return sleepNights.some((n) => n.wasRegression);
  };

  const hasOverwhelmedFlag = (): boolean => {
    return stressLog.some((e) => e.type === 'overwhelmed');
  };

  const getCascadeLevel = (): 'none' | 'yellow' | 'red' => {
    const lowSleepDays = getConsecutiveLowSleepDays();
    const regression = hasSleepRegression();
    const overwhelmed = hasOverwhelmedFlag();

    if (lowSleepDays >= 5 && overwhelmed) return 'red';
    if (lowSleepDays >= 3 && regression) return 'yellow';
    return 'none';
  };

  const handleCallFriend = async () => {
    try {
      const contactsRaw = await AsyncStorage.getItem(EMERGENCY_CONTACTS_KEY);
      let phone = PLACEHOLDER_PHONE;
      if (contactsRaw) {
        const contacts = JSON.parse(contactsRaw);
        phone = contacts.parent1 || contacts.parent2 || PLACEHOLDER_PHONE;
      }
      Alert.alert('📞 ' + t('stressCascade.callFriend'), `Phone: ${phone}`);
    } catch {
      Alert.alert('📞 ' + t('stressCascade.callFriend'), `Phone: ${PLACEHOLDER_PHONE}`);
    }
  };

  const runBreathingCycle = () => {
    setBreathingPhase('inhale');
    Animated.timing(scaleAnim, { toValue: 1.5, duration: 4000, useNativeDriver: true }).start(() => {
      setBreathingPhase('hold');
      setTimeout(() => {
        setBreathingPhase('exhale');
        Animated.timing(scaleAnim, { toValue: 1, duration: 8000, useNativeDriver: true }).start(() => {
          if (breathingCycle < 3) {
            setBreathingCycle(breathingCycle + 1);
          } else {
            setBreathingPhase('done');
            setShowBreathing(false);
            setBreathingCycle(1);
          }
        });
      }, 7000);
    });
  };

  const handleStartBreathing = () => {
    setShowBreathing(true);
    setBreathingPhase('inhale');
    setBreathingCycle(1);
  };

  useEffect(() => {
    const checkCheckin = async () => {
      if (!stressCheckinDate) return;
      const today = new Date().toISOString().split('T')[0];
      if (today >= stressCheckinDate) {
        setShowCheckin(true);
      }
    };
    checkCheckin();
  }, [stressCheckinDate]);

  const handleCheckinBetter = async () => {
    setShowCheckin(false);
    await awardBadge('stress_survival');
  };

  const handleCheckinStillStressed = () => {
    setShowCheckin(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    saveStressCheckinDate(tomorrow.toISOString().split('T')[0]);
  };

  const handleShiftHandoffDuringStress = async () => {
    try {
      const shiftRaw = await AsyncStorage.getItem(SHIFT_HANDOFF_KEY);
      if (shiftRaw) {
        const shift = JSON.parse(shiftRaw);
        if (shift.lastSwitchTimestamp) {
          await awardBadge('team_player');
        }
      }
    } catch {}
  };

  const cascadeLevel = getCascadeLevel();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: C.muted },
    overwhelmedButton: {
      backgroundColor: '#8B5CF6',
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 20,
    },
    overwhelmedButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
    optionalInputs: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: C.border,
    },
    inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    inputLabel: { fontSize: 14, color: C.text },
    numberInput: {
      backgroundColor: C.background,
      borderRadius: 8,
      padding: 8,
      width: 60,
      textAlign: 'center',
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
    },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    toggleLabel: { fontSize: 14, color: C.text },
    cascadeBanner: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    cascadeBannerYellow: { backgroundColor: '#F59E0B' },
    cascadeBannerRed: { backgroundColor: '#EF4444' },
    cascadeBannerText: { fontSize: 14, fontWeight: '600', color: '#fff', flex: 1, marginLeft: 8 },
    interventionsSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12 },
    interventionCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    interventionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    interventionIcon: { fontSize: 24 },
    interventionTitle: { fontSize: 16, fontWeight: '600', color: C.text },
    interventionDesc: { fontSize: 12, color: C.muted, marginTop: 2 },
    breathingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    breathingCircle: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: '#8B5CF6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    breathingText: { fontSize: 24, fontWeight: '700', color: '#fff' },
    breathingInstruction: { fontSize: 16, color: '#fff', marginTop: 20 },
    breathingCycleText: { fontSize: 14, color: '#fff', marginTop: 10 },
    closeBreathingBtn: {
      position: 'absolute',
      top: 60,
      right: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    closeBreathingText: { fontSize: 14, color: '#fff' },
    checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    checklistText: { fontSize: 14, color: C.text },
    sidsReminder: {
      backgroundColor: '#FEF3C7',
      borderRadius: 12,
      padding: 12,
      marginTop: 12,
      borderWidth: 1,
      borderColor: '#F59E0B',
    },
    sidsReminderText: { fontSize: 13, color: '#92400E' },
    checkinModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    checkinCard: {
      backgroundColor: C.card,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      alignItems: 'center',
    },
    checkinTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 12 },
    checkinMessage: { fontSize: 16, color: C.muted, textAlign: 'center', marginBottom: 20 },
    checkinButton: {
      backgroundColor: '#8B5CF6',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
      marginBottom: 10,
    },
    checkinButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    checkinSecondaryButton: {
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    checkinSecondaryText: { fontSize: 14, color: C.muted },
    interventionsCounter: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 4 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('stressCascade.title')}</Text>
          <Text style={styles.subtitle}>{t('stressCascade.subtitle') || 'You are not alone'}</Text>
        </View>

        {cascadeLevel !== 'none' && (
          <View style={[styles.cascadeBanner, cascadeLevel === 'red' ? styles.cascadeBannerRed : styles.cascadeBannerYellow]}>
            <Text style={styles.cascadeBannerText}>
              {cascadeLevel === 'red' ? t('stressCascade.cascadeRed') : t('stressCascade.cascadeYellow')}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.overwhelmedButton} onPress={handleOverwhelmed} activeOpacity={0.8}>
                        accessibilityLabel="TouchableOpacity in stress-cascade"
          <Text style={styles.overwhelmedButtonText}>{t('stressCascade.overwhelmedButton')}</Text>
        </TouchableOpacity>

        <View style={styles.optionalInputs}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 12 }}>Optional inputs</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>{t('stressCascade.parentSleepHours')}</Text>
            <TextInput
              style={styles.numberInput}
              value={parentSleepHours}
              onChangeText={setParentSleepHours}
              keyboardType="numeric"
              placeholder="0-12"
              placeholderTextColor={C.muted}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('stressCascade.missedMeal')}</Text>
            <Switch value={missedMeal} onValueChange={setMissedMeal} trackColor={{ false: C.border, true: '#8B5CF6' }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('stressCascade.tooMuchCaffeine')}</Text>
            <Switch value={tooMuchCaffeine} onValueChange={setTooMuchCaffeine} trackColor={{ false: C.border, true: '#8B5CF6' }} />
          </View>
          <TouchableOpacity
                          accessibilityLabel="TouchableOpacity in stress-cascade"
            style={{ backgroundColor: C.accent, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 }}
            onPress={handleSaveSleepHours}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.save')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.interventionsSection}>
          <Text style={styles.sectionTitle}>{t('stressCascade.interventions') || 'Interventions'}</Text>

          <TouchableOpacity style={styles.interventionCard} onPress={handleStartBreathing} activeOpacity={0.7}>
                          accessibilityLabel="Start stress-cascade timer"
            <View style={styles.interventionRow}>
              <Text style={styles.interventionIcon}>🌬️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.interventionTitle}>{t('stressCascade.breathingTitle')}</Text>
                <Text style={styles.interventionDesc}>{t('stressCascade.breathingInstructions')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.interventionCard} onPress={handleCallFriend} activeOpacity={0.7}>
                          accessibilityLabel="TouchableOpacity in stress-cascade"
            <View style={styles.interventionRow}>
              <Text style={styles.interventionIcon}>📞</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.interventionTitle}>{t('stressCascade.callFriend')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.interventionCard}>
            <View style={styles.interventionRow}>
              <Text style={styles.interventionIcon}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.interventionTitle}>{t('stressCascade.safeSpaceChecklist')}</Text>
              </View>
            </View>
            <View style={styles.checklistItem}>
              <Text>☑️</Text>
              <Text style={styles.checklistText}>Put baby down in crib</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text>☑️</Text>
              <Text style={styles.checklistText}>You are safe</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text>☑️</Text>
              <Text style={styles.checklistText}>Come back in 5 minutes</Text>
            </View>
          </View>

          <View style={styles.sidsReminder}>
            <Text style={styles.sidsReminderText}>🛑 {t('stressCascade.sidsSwaddleReminder')}</Text>
          </View>
        </View>

        <Text style={styles.interventionsCounter}>
          {t('stressCascade.interventionsCompleted', { count: interventionsCount })}
        </Text>
      </ScrollView>

      {showBreathing && (
        <View style={styles.breathingOverlay}>
          <TouchableOpacity style={styles.closeBreathingBtn} onPress={() => setShowBreathing(false)}>
                          accessibilityLabel="Toggle stress-cascade panel"
            <Text style={styles.closeBreathingText}>✕ {t('common.close')}</Text>
          </TouchableOpacity>
          <Animated.View style={[styles.breathingCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.breathingText}>
              {breathingPhase === 'inhale' ? '4' : breathingPhase === 'hold' ? '7' : breathingPhase === 'exhale' ? '8' : '✓'}
            </Text>
          </Animated.View>
          <Text style={styles.breathingInstruction}>
            {breathingPhase === 'inhale' ? 'Breathe in...' : breathingPhase === 'hold' ? 'Hold...' : breathingPhase === 'exhale' ? 'Breathe out...' : 'Done!'}
          </Text>
          <Text style={styles.breathingCycleText}>Cycle {breathingCycle}/3</Text>
        </View>
      )}

      <Modal visible={showCheckin} transparent animationType="fade">
        <View style={styles.checkinModal}>
          <View style={styles.checkinCard}>
            <Text style={styles.checkinTitle}>{t('stressCascade.checkinPrompt')}</Text>
            <TouchableOpacity style={styles.checkinButton} onPress={handleCheckinBetter}>
                            accessibilityLabel="TouchableOpacity in stress-cascade"
              <Text style={styles.checkinButtonText}>{t('stressCascade.checkinBetter')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkinSecondaryButton} onPress={handleCheckinStillStressed}>
                            accessibilityLabel="TouchableOpacity in stress-cascade"
              <Text style={styles.checkinSecondaryText}>{t('stressCascade.checkinStillStressed') || 'Still feeling overwhelmed'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

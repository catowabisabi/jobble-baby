import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Alert, Animated, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

interface SOSEvent {
  id: string;
  date: string;
  triggered: boolean;
  duration_sec: number;
  checklist_completed: boolean;
  triggers: string[];
  breathing_cycles: number;
}

const SOS_EVENTS_KEY = STORAGE_KEYS.SOS_EVENTS;

const CHECKLIST_ITEMS = [
  'babySecured',
  'sharpRemoved',
  'floorClear',
  'doorLocked',
  'contactsVisible',
] as const;

type ChecklistItem = typeof CHECKLIST_ITEMS[number];

export default function EmergencySOS() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [isPanicMode, setIsPanicMode] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale' | 'done'>('inhale');
  const [breathingCycle, setBreathingCycle] = useState(1);
  const [checklist, setChecklist] = useState<Record<ChecklistItem, boolean>>({
    babySecured: false,
    sharpRemoved: false,
    floorClear: false,
    doorLocked: false,
    contactsVisible: false,
  });
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [sosEvents, setSosEvents] = useState<SOSEvent[]>([]);
  const [completedBreathingCycles, setCompletedBreathingCycles] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds]);

  useEffect(() => {
    if (showBreathing) {
      runBreathingCycle();
    }
  }, [showBreathing, breathingCycle]);

  const loadEvents = async () => {
    try {
      const raw = await safeGetItem(SOS_EVENTS_KEY);
      if (raw) setSosEvents(JSON.parse(raw));
    } catch {}
  };

  const saveEvent = async (event: SOSEvent) => {
    const updated = [...sosEvents, event];
    setSosEvents(updated);
    try {
      await safeSetItem(SOS_EVENTS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const handlePanicActivate = () => {
    setIsPanicMode(true);
    setSessionStart(Date.now());
    setTimerSeconds(300);
    setTimerRunning(true);
    setChecklist({
      babySecured: false,
      sharpRemoved: false,
      floorClear: false,
      doorLocked: false,
      contactsVisible: false,
    });
    setCompletedBreathingCycles(0);
  };

  const handlePanicDeactivate = () => {
    if (sessionStart) {
      const duration_sec = Math.round((Date.now() - sessionStart) / 1000);
      const allChecklistDone = Object.values(checklist).every(Boolean);
      const event: SOSEvent = {
        id: generateId(),
        date: new Date().toISOString(),
        triggered: true,
        duration_sec,
        checklist_completed: allChecklistDone,
        triggers: [],
        breathing_cycles: completedBreathingCycles,
      };
      saveEvent(event);
    }
    setIsPanicMode(false);
    setShowSummary(true);
    setTimerRunning(false);
  };

  const handleToggleChecklist = (item: ChecklistItem) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleStartBreathing = () => {
    setShowBreathing(true);
    setBreathingPhase('inhale');
    setBreathingCycle(1);
  };

  const runBreathingCycle = () => {
    setBreathingPhase('inhale');
    Animated.timing(scaleAnim, { toValue: 1.5, duration: 4000, useNativeDriver: true }).start(() => {
      setBreathingPhase('hold');
      setTimeout(() => {
        setBreathingPhase('exhale');
        Animated.timing(scaleAnim, { toValue: 1, duration: 8000, useNativeDriver: true }).start(() => {
          if (breathingCycle < 4) {
            setBreathingCycle(breathingCycle + 1);
          } else {
            setBreathingPhase('done');
            setCompletedBreathingCycles((prev) => prev + 4);
            setTimeout(() => {
              setShowBreathing(false);
              setBreathingCycle(1);
            }, 1000);
          }
        });
      }, 7000);
    });
  };

  const handleCallDoctor = () => {
    Linking.openURL('tel:12345678').catch(() => {
      Alert.alert(t('emergencySos.contacts.callFailed') || 'Call failed');
    });
  };

  const handleCallHospital = () => {
    Linking.openURL('tel:999').catch(() => {
      Alert.alert(t('emergencySos.contacts.callFailed') || 'Call failed');
    });
  };

  const handleCallSpouse = () => {
    Linking.openURL('tel:98765432').catch(() => {
      Alert.alert(t('emergencySos.contacts.callFailed') || 'Call failed');
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const ratio = timerSeconds / 300;
    if (ratio > 0.6) return '#22C55E';
    if (ratio > 0.3) return '#F59E0B';
    return '#EF4444';
  };

  const getChecklistLabel = (item: ChecklistItem): string => {
    const labels: Record<ChecklistItem, string> = {
      babySecured: t('emergencySos.checklist.babySecured'),
      sharpRemoved: t('emergencySos.checklist.sharpRemoved'),
      floorClear: t('emergencySos.checklist.floorClear'),
      doorLocked: t('emergencySos.checklist.doorLocked'),
      contactsVisible: t('emergencySos.checklist.contactsVisible'),
    };
    return labels[item];
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: C.muted },
    panicButton: {
      backgroundColor: '#DC2626',
      borderRadius: 24,
      padding: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 20,
      minHeight: 120,
      shadowColor: '#DC2626',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
    panicButtonActive: {
      backgroundColor: '#22C55E',
      shadowColor: '#22C55E',
    },
    panicButtonText: { fontSize: 24, fontWeight: '700', color: '#fff' },
    panicButtonSubtext: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    section: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 12 },
    checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, minHeight: 44 },
    checklistCheckbox: {
      width: 28,
      height: 28,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checklistCheckboxFilled: { backgroundColor: '#22C55E' },
    checklistText: { fontSize: 15, color: C.text, flex: 1 },
    contactButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      minHeight: 56,
    },
    contactIcon: { fontSize: 24, marginRight: 12 },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 16, fontWeight: '600', color: C.text },
    contactDesc: { fontSize: 12, color: C.muted },
    timerContainer: { alignItems: 'center', paddingVertical: 20 },
    timerCircle: {
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerText: { fontSize: 36, fontWeight: '700', color: C.text },
    timerLabel: { fontSize: 14, color: C.muted, marginTop: 8 },
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
      backgroundColor: '#F59E0B',
      alignItems: 'center',
      justifyContent: 'center',
    },
    breathingText: { fontSize: 48, fontWeight: '700', color: '#fff' },
    breathingInstruction: { fontSize: 20, color: '#fff', marginTop: 24 },
    breathingCycleText: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 12 },
    closeBreathingBtn: {
      position: 'absolute',
      top: 60,
      right: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
      minWidth: 44,
    },
    closeBreathingText: { fontSize: 14, color: '#fff' },
    summaryOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    summaryCard: {
      backgroundColor: C.card,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    summaryTitle: { fontSize: 22, fontWeight: '700', color: C.text, marginBottom: 16, textAlign: 'center' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    summaryLabel: { fontSize: 14, color: C.muted },
    summaryValue: { fontSize: 14, fontWeight: '600', color: C.text },
    summaryButton: {
      backgroundColor: '#22C55E',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 32,
      marginTop: 16,
      alignItems: 'center',
      minHeight: 48,
      minWidth: 44,
    },
    summaryButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    breathingButton: {
      backgroundColor: '#F59E0B',
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      minHeight: 48,
      minWidth: 44,
    },
    breathingButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  });

  const allChecklistDone = Object.values(checklist).every(Boolean);

  if (isPanicMode) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('emergencySos.panicModeActive')}</Text>
            <Text style={styles.subtitle}>{t('emergencySos.panicModeSubtitle')}</Text>
          </View>

          <TouchableOpacity
            style={[styles.panicButton, styles.panicButtonActive]}
            onPress={handlePanicDeactivate}
            activeOpacity={0.8}
            accessibilityLabel={t('emergencySos.deactivatePanic')}
          >
            <Text style={styles.panicButtonText}>{t('emergencySos.imOkay')}</Text>
            <Text style={styles.panicButtonSubtext}>{t('emergencySos.imOkaySubtext')}</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('emergencySos.safeSpaceChecklist')}</Text>
            {CHECKLIST_ITEMS.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.checklistItem}
                onPress={() => handleToggleChecklist(item)}
                accessibilityLabel={getChecklistLabel(item)}
                accessibilityState={{ checked: checklist[item] }}
              >
                <View style={[styles.checklistCheckbox, checklist[item] && styles.checklistCheckboxFilled]}>
                  {checklist[item] && <Text style={{ color: '#fff', fontSize: 16 }}>✓</Text>}
                </View>
                <Text style={styles.checklistText}>{getChecklistLabel(item)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('emergencySos.contactsQuickDial')}</Text>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleCallDoctor}
              accessibilityLabel={t('emergencySos.contacts.doctor')}
            >
              <Text style={styles.contactIcon}>👨‍⚕️</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{t('emergencySos.contacts.doctor')}</Text>
                <Text style={styles.contactDesc}>{t('emergencySos.contacts.doctorDesc')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleCallHospital}
              accessibilityLabel={t('emergencySos.contacts.hospital')}
            >
              <Text style={styles.contactIcon}>🏥</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{t('emergencySos.contacts.hospital')}</Text>
                <Text style={styles.contactDesc}>{t('emergencySos.contacts.hospitalDesc')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleCallSpouse}
              accessibilityLabel={t('emergencySos.contacts.spouse')}
            >
              <Text style={styles.contactIcon}>👥</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{t('emergencySos.contacts.spouse')}</Text>
                <Text style={styles.contactDesc}>{t('emergencySos.contacts.spouseDesc')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('emergencySos.calmDownTimer')}</Text>
            <View style={styles.timerContainer}>
              <View style={[styles.timerCircle, { borderColor: getTimerColor() }]}>
                <Text style={[styles.timerText, { color: getTimerColor() }]}>{formatTime(timerSeconds)}</Text>
              </View>
              <Text style={styles.timerLabel}>{t('emergencySos.timer.minutes', { count: Math.ceil(timerSeconds / 60) })}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.breathingButton}
            onPress={handleStartBreathing}
            accessibilityLabel={t('emergencySos.startBreathing')}
          >
            <Text style={styles.breathingButtonText}>🌬️ {t('emergencySos.breathing478')}</Text>
          </TouchableOpacity>
        </ScrollView>

        {showBreathing && (
          <View style={styles.breathingOverlay}>
            <TouchableOpacity
              style={styles.closeBreathingBtn}
              onPress={() => setShowBreathing(false)}
              accessibilityLabel={t('common.close')}
            >
              <Text style={styles.closeBreathingText}>✕ {t('common.close')}</Text>
            </TouchableOpacity>
            <Animated.View style={[styles.breathingCircle, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.breathingText}>
                {breathingPhase === 'inhale' ? '4' : breathingPhase === 'hold' ? '7' : breathingPhase === 'exhale' ? '8' : '✓'}
              </Text>
            </Animated.View>
            <Text style={styles.breathingInstruction}>
              {breathingPhase === 'inhale'
                ? t('emergencySos.breathing.inhale')
                : breathingPhase === 'hold'
                ? t('emergencySos.breathing.hold')
                : breathingPhase === 'exhale'
                ? t('emergencySos.breathing.exhale')
                : t('emergencySos.breathing.done')}
            </Text>
            <Text style={styles.breathingCycleText}>
              {t('emergencySos.breathing.cycle', { current: breathingCycle, total: 4 })}
            </Text>
          </View>
        )}

        <Modal visible={showSummary} transparent animationType="fade">
          <View style={styles.summaryOverlay}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('emergencySos.summary.title')}</Text>
              {sessionStart && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('emergencySos.summary.duration')}</Text>
                  <Text style={styles.summaryValue}>
                    {formatTime(Math.round((Date.now() - sessionStart) / 1000))}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('emergencySos.summary.checklist')}</Text>
                <Text style={styles.summaryValue}>
                  {allChecklistDone ? t('common.yes') : t('common.no')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('emergencySos.summary.breathingCycles')}</Text>
                <Text style={styles.summaryValue}>{completedBreathingCycles}</Text>
              </View>
              <TouchableOpacity
                style={styles.summaryButton}
                onPress={() => {
                  setShowSummary(false);
                  setIsPanicMode(false);
                }}
                accessibilityLabel={t('emergencySos.closeSummary')}
              >
                <Text style={styles.summaryButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('emergencySos.title')}</Text>
          <Text style={styles.subtitle}>{t('emergencySos.subtitle')}</Text>
        </View>

        <TouchableOpacity
          style={styles.panicButton}
          onPress={handlePanicActivate}
          activeOpacity={0.8}
          accessibilityLabel={t('emergencySos.panicButton')}
        >
          <Text style={styles.panicButtonText}>{t('emergencySos.panicButton')}</Text>
          <Text style={styles.panicButtonSubtext}>{t('emergencySos.panicButtonSubtext')}</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('emergencySos.breathing478')}</Text>
          <Text style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
            {t('emergencySos.breathing.description')}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#22C55E' }}>4s</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>{t('emergencySos.breathing.inhale')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#F59E0B' }}>7s</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>{t('emergencySos.breathing.hold')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#3B82F6' }}>8s</Text>
              <Text style={{ fontSize: 12, color: C.muted }}>{t('emergencySos.breathing.exhale')}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
            {t('emergencySos.breathing.cycles', { count: 4 })}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('emergencySos.safeSpaceChecklist')}</Text>
          <Text style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
            {t('emergencySos.checklist.description')}
          </Text>
          {CHECKLIST_ITEMS.map((item) => (
            <View key={item} style={styles.checklistItem}>
              <View style={styles.checklistCheckbox}>
                {checklist[item] && <Text style={{ color: '#22C55E', fontSize: 16 }}>✓</Text>}
              </View>
              <Text style={styles.checklistText}>{getChecklistLabel(item)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('emergencySos.contactsQuickDial')}</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleCallDoctor}
            accessibilityLabel={t('emergencySos.contacts.doctor')}
          >
            <Text style={styles.contactIcon}>👨‍⚕️</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{t('emergencySos.contacts.doctor')}</Text>
              <Text style={styles.contactDesc}>{t('emergencySos.contacts.doctorDesc')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleCallHospital}
            accessibilityLabel={t('emergencySos.contacts.hospital')}
          >
            <Text style={styles.contactIcon}>🏥</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{t('emergencySos.contacts.hospital')}</Text>
              <Text style={styles.contactDesc}>{t('emergencySos.contacts.hospitalDesc')}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={handleCallSpouse}
            accessibilityLabel={t('emergencySos.contacts.spouse')}
          >
            <Text style={styles.contactIcon}>👥</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{t('emergencySos.contacts.spouse')}</Text>
              <Text style={styles.contactDesc}>{t('emergencySos.contacts.spouseDesc')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

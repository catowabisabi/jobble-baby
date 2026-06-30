import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Animated, Easing } from 'react-native';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { STORAGE_KEYS } from '../../store/storage-keys';

const COLORS = {
  ventralVagal: '#22C55E',
  sympathetic: '#F59E0B',
  dorsalVagal: '#3B82F6',
  background: '#0F172A',
  card: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
};

const POLYVAGAL_LOG_KEY = STORAGE_KEYS.POLYVAGAL_LOG;
const INTEROCEPTIVE_LOG_KEY = STORAGE_KEYS.INTEROCEPTIVE_LOG;
const PARENT_CAPACITY_KEY = STORAGE_KEYS.PARENT_CAPACITY_INDEX;

type PolyvagalZone = 'ventral' | 'sympathetic' | 'dorsal';
type BabyState = 'calm' | 'fussy' | 'crying' | 'sleeping';
type TensionLocation = 'head' | 'chest' | 'gut' | 'limbs';
type GutFeeling = 'calm' | 'uneasy' | 'anxious' | 'dread';
type HeartRate = 'normal' | 'elevated' | 'racing';
type Energy = 'high' | 'medium' | 'low' | 'depleted';
type RegulationTool = 'breathing' | 'grounding' | 'coregulation';

interface PolyvagalLogEntry {
  id: string;
  timestamp: string;
  zone: PolyvagalZone;
  note: string;
  babyState: BabyState;
}

interface InteroceptiveLogEntry {
  id: string;
  timestamp: string;
  tensionLocation: TensionLocation;
  gutFeeling: GutFeeling;
  heartRate: HeartRate;
  energy: Energy;
}

interface ParentCapacityEntry {
  id: string;
  timestamp: string;
  sleepHours: number;
  stressLevel: number;
  polyvagalState: PolyvagalZone;
  interoceptiveClarity: number;
  readiness: 'Low' | 'Medium' | 'High';
}

const ZONE_COLORS: Record<PolyvagalZone, string> = {
  ventral: COLORS.ventralVagal,
  sympathetic: COLORS.sympathetic,
  dorsal: COLORS.dorsalVagal,
};

const ZONE_I18N: Record<PolyvagalZone, string> = {
  ventral: 'polyvagal.state.ventralVagal',
  sympathetic: 'polyvagal.state.sympathetic',
  dorsal: 'polyvagal.state.dorsalVagal',
};

const BABY_STATE_I18N: Record<BabyState, string> = {
  calm: 'polyvagal.babyState.calm',
  fussy: 'polyvagal.babyState.fussy',
  crying: 'polyvagal.babyState.crying',
  sleeping: 'polyvagal.babyState.sleeping',
};

const TENSION_I18N: Record<TensionLocation, string> = {
  head: 'polyvagal.tension.head',
  chest: 'polyvagal.tension.chest',
  gut: 'polyvagal.tension.gut',
  limbs: 'polyvagal.tension.limbs',
};

const GUT_FEELING_I18N: Record<GutFeeling, string> = {
  calm: 'polyvagal.gutFeeling.calm',
  uneasy: 'polyvagal.gutFeeling.uneasy',
  anxious: 'polyvagal.gutFeeling.anxious',
  dread: 'polyvagal.gutFeeling.dread',
};

const HEART_RATE_I18N: Record<HeartRate, string> = {
  normal: 'polyvagal.heartRate.normal',
  elevated: 'polyvagal.heartRate.elevated',
  racing: 'polyvagal.heartRate.racing',
};

const ENERGY_I18N: Record<Energy, string> = {
  high: 'polyvagal.energy.high',
  medium: 'polyvagal.energy.medium',
  low: 'polyvagal.energy.low',
  depleted: 'polyvagal.energy.depleted',
};

const GROUNDING_STEPS = [
  { count: 5, key: 'grounding.5' },
  { count: 4, key: 'grounding.4' },
  { count: 3, key: 'grounding.3' },
  { count: 2, key: 'grounding.2' },
  { count: 1, key: 'grounding.1' },
];

export default function PolyvagalDashboard() {
  const { t } = useLanguage();

  const ti = (key: string): string => {
    const translated = t(key);
    return translated === key ? key : translated;
  };

  const TENSION_OPTIONS: { value: TensionLocation; label: string }[] = [
    { value: 'head', label: ti(TENSION_I18N.head) },
    { value: 'chest', label: ti(TENSION_I18N.chest) },
    { value: 'gut', label: ti(TENSION_I18N.gut) },
    { value: 'limbs', label: ti(TENSION_I18N.limbs) },
  ];

  const GUT_OPTIONS: { value: GutFeeling; label: string }[] = [
    { value: 'calm', label: ti(GUT_FEELING_I18N.calm) },
    { value: 'uneasy', label: ti(GUT_FEELING_I18N.uneasy) },
    { value: 'anxious', label: ti(GUT_FEELING_I18N.anxious) },
    { value: 'dread', label: ti(GUT_FEELING_I18N.dread) },
  ];

  const HEART_OPTIONS: { value: HeartRate; label: string }[] = [
    { value: 'normal', label: ti(HEART_RATE_I18N.normal) },
    { value: 'elevated', label: ti(HEART_RATE_I18N.elevated) },
    { value: 'racing', label: ti(HEART_RATE_I18N.racing) },
  ];

  const ENERGY_OPTIONS: { value: Energy; label: string }[] = [
    { value: 'high', label: ti(ENERGY_I18N.high) },
    { value: 'medium', label: ti(ENERGY_I18N.medium) },
    { value: 'low', label: ti(ENERGY_I18N.low) },
    { value: 'depleted', label: ti(ENERGY_I18N.depleted) },
  ];

  const BABY_STATE_OPTIONS: { value: BabyState; label: string }[] = [
    { value: 'calm', label: ti(BABY_STATE_I18N.calm) },
    { value: 'fussy', label: ti(BABY_STATE_I18N.fussy) },
    { value: 'crying', label: ti(BABY_STATE_I18N.crying) },
    { value: 'sleeping', label: ti(BABY_STATE_I18N.sleeping) },
  ];

  const [polyvagalLogs, setPolyvagalLogs] = useState<PolyvagalLogEntry[]>([]);
  const [interoceptiveLogs, setInteroceptiveLogs] = useState<InteroceptiveLogEntry[]>([]);
  const [capacityLogs, setCapacityLogs] = useState<ParentCapacityEntry[]>([]);

  const [selectedZone, setSelectedZone] = useState<PolyvagalZone | null>(null);
  const [zoneNote, setZoneNote] = useState('');
  const [selectedBabyState, setSelectedBabyState] = useState<BabyState>('calm');

  const [tensionLocation, setTensionLocation] = useState<TensionLocation>('chest');
  const [gutFeeling, setGutFeeling] = useState<GutFeeling>('calm');
  const [heartRate, setHeartRate] = useState<HeartRate>('normal');
  const [energy, setEnergy] = useState<Energy>('medium');

  const [sleepHours, setSleepHours] = useState(6);
  const [stressLevel, setStressLevel] = useState(5);

  const [activeTool, setActiveTool] = useState<RegulationTool | null>(null);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale' | 'idle'>('idle');
  const [breathingScale] = useState(new Animated.Value(0.6));
  const breathingAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingInput, setGroundingInput] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [poly, intero, cap] = await Promise.all([
        safeGetItem(POLYVAGAL_LOG_KEY),
        safeGetItem(INTEROCEPTIVE_LOG_KEY),
        safeGetItem(PARENT_CAPACITY_KEY),
      ]);
      if (poly) setPolyvagalLogs(JSON.parse(poly));
      if (intero) setInteroceptiveLogs(JSON.parse(intero));
      if (cap) setCapacityLogs(JSON.parse(cap));
    } catch (e) { }
  };

  const savePolyvagalLog = async (entry: PolyvagalLogEntry) => {
    const updated = [entry, ...polyvagalLogs];
    setPolyvagalLogs(updated);
    await safeSetItem(POLYVAGAL_LOG_KEY, JSON.stringify(updated));
  };

  const saveInteroceptiveLog = async (entry: InteroceptiveLogEntry) => {
    const updated = [entry, ...interoceptiveLogs];
    setInteroceptiveLogs(updated);
    await safeSetItem(INTEROCEPTIVE_LOG_KEY, JSON.stringify(updated));
  };

  const saveCapacityLog = async (entry: ParentCapacityEntry) => {
    const updated = [entry, ...capacityLogs];
    setCapacityLogs(updated);
    await safeSetItem(PARENT_CAPACITY_KEY, JSON.stringify(updated));
  };

  const handleZoneLog = () => {
    if (!selectedZone) return;
    const entry: PolyvagalLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      zone: selectedZone,
      note: zoneNote,
      babyState: selectedBabyState,
    };
    savePolyvagalLog(entry);
    setSelectedZone(null);
    setZoneNote('');
  };

  const handleInteroceptiveLog = () => {
    const entry: InteroceptiveLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      tensionLocation,
      gutFeeling,
      heartRate,
      energy,
    };
    saveInteroceptiveLog(entry);
  };

  const calculateReadiness = (): 'Low' | 'Medium' | 'High' => {
    const recentPoly = polyvagalLogs[0];
    const recentIntero = interoceptiveLogs[0];

    let score = 0;
    score += Math.min(sleepHours / 8, 1) * 25;
    score += (10 - stressLevel) / 10 * 25;
    if (recentPoly?.zone === 'ventral') score += 25;
    else if (recentPoly?.zone === 'sympathetic') score += 12;
    else score += 5;
    score += Math.min((recentIntero?.energy ? { high: 25, medium: 18, low: 10, depleted: 3 }[recentIntero.energy] : 12) / 25, 1) * 25;

    if (score >= 65) return 'High';
    if (score >= 35) return 'Medium';
    return 'Low';
  };

  const handleCapacityLog = () => {
    const recentPoly = polyvagalLogs[0];
    const recentIntero = interoceptiveLogs[0];
    const readiness = calculateReadiness();

    const entry: ParentCapacityEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      sleepHours,
      stressLevel,
      polyvagalState: recentPoly?.zone || 'dorsal',
      interoceptiveClarity: recentIntero ? { high: 25, medium: 18, low: 10, depleted: 3 }[recentIntero.energy] : 12,
      readiness,
    };
    saveCapacityLog(entry);
  };

  const startBreathing = () => {
    setActiveTool('breathing');
    setBreathingPhase('inhale');

    const runBreathingCycle = () => {
      setBreathingPhase('inhale');
      Animated.timing(breathingScale, {
        toValue: 1.0,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setBreathingPhase('hold');
        setTimeout(() => {
          setBreathingPhase('exhale');
          Animated.timing(breathingScale, {
            toValue: 0.6,
            duration: 8000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }).start(() => {
            setBreathingPhase('idle');
            setTimeout(runBreathingCycle, 1000);
          });
        }, 4000);
      });
    };

    setTimeout(runBreathingCycle, 500);
  };

  const stopBreathing = () => {
    breathingScale.stopAnimation();
    breathingScale.setValue(0.6);
    setBreathingPhase('idle');
    setActiveTool(null);
  };

  const startGrounding = () => {
    setActiveTool('grounding');
    setGroundingStep(0);
    setGroundingInput('');
  };

  const nextGroundingStep = () => {
    if (groundingStep < GROUNDING_STEPS.length - 1) {
      setGroundingStep(s => s + 1);
      setGroundingInput('');
    } else {
      setActiveTool(null);
      setGroundingStep(0);
      setGroundingInput('');
    }
  };

  const startCoregulation = () => {
    setActiveTool('coregulation');
  };

  const stopTool = () => {
    stopBreathing();
    setActiveTool(null);
    setGroundingStep(0);
    setGroundingInput('');
  };

  const getRecentFussiness = (days: number): number => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const recent = polyvagalLogs.filter(l => new Date(l.timestamp) >= cutoff);
    if (recent.length === 0) return 0;
    const fussyCount = recent.filter(l => l.babyState === 'fussy' || l.babyState === 'crying').length;
    return Math.round((fussyCount / recent.length) * 100);
  };

  const readiness = calculateReadiness();
  const readinessColor = readiness === 'High' ? COLORS.ventralVagal : readiness === 'Medium' ? COLORS.sympathetic : '#EF4444';

  const renderZoneCard = (zone: PolyvagalZone) => {
    const color = ZONE_COLORS[zone];
    const label = ti(ZONE_I18N[zone]);
    const description = ti(`polyvagal.zone.${zone}Desc`);

    return (
      <Pressable
        key={zone}
        style={[
          styles.zoneCard,
          { borderColor: selectedZone === zone ? color : 'transparent' },
        ]}
        onPress={() => setSelectedZone(zone)}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedZone === zone }}
      >
        <View style={[styles.zoneIndicator, { backgroundColor: color }]} />
        <Text style={styles.zoneName}>{label}</Text>
        <Text style={styles.zoneDesc}>{description}</Text>
        {selectedZone === zone && (
          <Pressable
            style={[styles.logZoneBtn, { backgroundColor: color }]}
            onPress={handleZoneLog}
            accessibilityLabel={t('polyvagal.logZone') || 'Log this zone'}
          >
            <Text style={styles.logZoneBtnText}>{t('polyvagal.logZone')}</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  const renderSection1 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('polyvagal.stateLogger')}</Text>
      <View style={styles.zoneCards}>
        {(['ventral', 'sympathetic', 'dorsal'] as PolyvagalZone[]).map(renderZoneCard)}
      </View>
      {selectedZone && (
        <View style={styles.zoneInputRow}>
          <TextInput
            style={styles.noteInput}
            value={zoneNote}
            onChangeText={setZoneNote}
            placeholder={t('polyvagal.notePlaceholder') || 'Optional note...'}
            placeholderTextColor="#64748B"
            accessibilityLabel={t('polyvagal.noteLabel') || 'Zone note'}
          />
          <Text style={styles.babyStateLabel}>{t('polyvagal.babyState')}:</Text>
          <View style={styles.babyStateRow}>
            {BABY_STATE_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[
                  styles.babyStateChip,
                  selectedBabyState === opt.value && styles.babyStateChipActive,
                ]}
                onPress={() => setSelectedBabyState(opt.value)}
                accessibilityLabel={opt.label}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.babyStateChipText,
                    selectedBabyState === opt.value && styles.babyStateChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderSection2 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('polyvagal.interoceptiveCheckIn')}</Text>

      <Text style={styles.checkInLabel}>{t('polyvagal.tensionLocation')}:</Text>
      <View style={styles.chipRow}>
        {TENSION_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, tensionLocation === opt.value && styles.chipActive]}
            onPress={() => setTensionLocation(opt.value)}
            accessibilityLabel={opt.label}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, tensionLocation === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.checkInLabel}>{t('polyvagal.gutFeeling')}:</Text>
      <View style={styles.chipRow}>
        {GUT_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, gutFeeling === opt.value && styles.chipActive]}
            onPress={() => setGutFeeling(opt.value)}
            accessibilityLabel={opt.label}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, gutFeeling === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.checkInLabel}>{t('polyvagal.heartRate')}:</Text>
      <View style={styles.chipRow}>
        {HEART_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, heartRate === opt.value && styles.chipActive]}
            onPress={() => setHeartRate(opt.value)}
            accessibilityLabel={opt.label}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, heartRate === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.checkInLabel}>{t('polyvagal.energy')}:</Text>
      <View style={styles.chipRow}>
        {ENERGY_OPTIONS.map(opt => (
          <Pressable
            key={opt.value}
            style={[styles.chip, energy === opt.value && styles.chipActive]}
            onPress={() => setEnergy(opt.value)}
            accessibilityLabel={opt.label}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, energy === opt.value && styles.chipTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={styles.logCheckInBtn}
        onPress={handleInteroceptiveLog}
        accessibilityLabel={t('polyvagal.logCheckIn') || 'Log check-in'}
      >
        <Text style={styles.logCheckInBtnText}>{t('polyvagal.logCheckIn')}</Text>
      </Pressable>
    </View>
  );

  const renderSection3 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('polyvagal.regulationTools')}</Text>

      {activeTool === 'breathing' && (
        <View style={styles.toolActive}>
          <View style={styles.breathingCircleContainer}>
            <Animated.View
              style={[
                styles.breathingCircle,
                { transform: [{ scale: breathingScale }] },
              ]}
            />
          </View>
          <Text style={styles.breathingPhaseText}>
            {breathingPhase === 'inhale' && t('polyvagal.inhale')}
            {breathingPhase === 'hold' && t('polyvagal.hold')}
            {breathingPhase === 'exhale' && t('polyvagal.exhale')}
            {breathingPhase === 'idle' && t('polyvagal.breathingIdle')}
          </Text>
          <Text style={styles.breathingPattern}>4-4-8</Text>
          <Pressable style={styles.stopToolBtn} onPress={stopTool} accessibilityLabel={t('polyvagal.stop') || 'Stop'}>
            <Text style={styles.stopToolBtnText}>{t('polyvagal.stop')}</Text>
          </Pressable>
        </View>
      )}

      {activeTool === 'grounding' && (
        <View style={styles.toolActive}>
          <Text style={styles.groundingStepLabel}>
            {GROUNDING_STEPS[groundingStep].count}: {ti(GROUNDING_STEPS[groundingStep].key)}
          </Text>
          <TextInput
            style={styles.groundingInput}
            value={groundingInput}
            onChangeText={setGroundingInput}
            placeholder={`List ${GROUNDING_STEPS[groundingStep].count} things...`}
            placeholderTextColor="#64748B"
            multiline
            accessibilityLabel={t('polyvagal.groundingInput') || 'Grounding input'}
          />
          <Pressable style={styles.nextStepBtn} onPress={nextGroundingStep} accessibilityLabel={t('polyvagal.nextStep') || 'Next step'}>
            <Text style={styles.nextStepBtnText}>
              {groundingStep < GROUNDING_STEPS.length - 1 ? t('polyvagal.nextStep') : t('polyvagal.done')}
            </Text>
          </Pressable>
        </View>
      )}

      {activeTool === 'coregulation' && (
        <View style={styles.toolActive}>
          <Text style={styles.coregulationIcon}>❤️</Text>
          <Text style={styles.coregulationText}>{t('polyvagal.coregulationPrompt')}</Text>
          <Pressable style={styles.stopToolBtn} onPress={stopTool} accessibilityLabel={t('polyvagal.close') || 'Close'}>
            <Text style={styles.stopToolBtnText}>{t('polyvagal.close')}</Text>
          </Pressable>
        </View>
      )}

      {!activeTool && (
        <View style={styles.toolsRow}>
          <Pressable style={styles.toolCard} onPress={startBreathing} accessibilityLabel={t('polyvagal.breathe4x4x8') || '4-4-8 Breathing'}>
            <Text style={styles.toolIcon}>🌬️</Text>
            <Text style={styles.toolName}>{t('polyvagal.breathe4x4x8')}</Text>
          </Pressable>
          <Pressable style={styles.toolCard} onPress={startGrounding} accessibilityLabel={t('polyvagal.grounding54321') || '5-4-3-2-1 Grounding'}>
            <Text style={styles.toolIcon}>🌍</Text>
            <Text style={styles.toolName}>{t('polyvagal.grounding54321')}</Text>
          </Pressable>
          <Pressable style={styles.toolCard} onPress={startCoregulation} accessibilityLabel={t('polyvagal.coregulation') || 'Co-Regulation'}>
            <Text style={styles.toolIcon}>👶</Text>
            <Text style={styles.toolName}>{t('polyvagal.coregulation')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderSection4 = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('polyvagal.correlationView')}</Text>
        <Text style={styles.correlationInsight}>{t('polyvagal.correlationInsight')}</Text>

        <View style={styles.timeline}>
          {last7Days.map((day, idx) => {
            const dayLogs = polyvagalLogs.filter(l => {
              const logDate = new Date(l.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return logDate === day;
            });
            const latestZone = dayLogs[0]?.zone;
            const fussiness = dayLogs.length > 0
              ? (dayLogs.filter(l => l.babyState === 'fussy' || l.babyState === 'crying').length / dayLogs.length) * 100
              : 0;

            return (
              <View key={idx} style={styles.timelineRow}>
                <Text style={styles.timelineDate}>{day.split(',')[0]}</Text>
                <View style={styles.timelineBars}>
                  {latestZone && (
                    <View style={[styles.zoneDot, { backgroundColor: ZONE_COLORS[latestZone] }]} />
                  )}
                  <View style={[styles.fussinessBar, { width: `${fussiness}%` }]} />
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.ventralVagal }]} />
            <Text style={styles.legendText}>{ti(ZONE_I18N.ventral)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.sympathetic }]} />
            <Text style={styles.legendText}>{ti(ZONE_I18N.sympathetic)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.dorsalVagal }]} />
            <Text style={styles.legendText}>{ti(ZONE_I18N.dorsal)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSection5 = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('polyvagal.parentCapacity')}</Text>

      <View style={styles.capacityCard}>
        <Text style={styles.capacityLabel}>{t('polyvagal.sleepHours')}: {sleepHours}h</Text>
        <View style={styles.sliderRow}>
          <Pressable style={styles.sliderBtn} onPress={() => setSleepHours(Math.max(0, sleepHours - 1))} accessibilityLabel={t('polyvagal.decrease') || 'Decrease'}>
            <Text style={styles.sliderBtnText}>−</Text>
          </Pressable>
          <Text style={styles.sliderValue}>{sleepHours}</Text>
          <Pressable style={styles.sliderBtn} onPress={() => setSleepHours(Math.min(12, sleepHours + 1))} accessibilityLabel={t('polyvagal.increase') || 'Increase'}>
            <Text style={styles.sliderBtnText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.capacityLabel}>{t('polyvagal.stressLevel')}: {stressLevel}/10</Text>
        <View style={styles.sliderRow}>
          <Pressable style={styles.sliderBtn} onPress={() => setStressLevel(Math.max(1, stressLevel - 1))} accessibilityLabel={t('polyvagal.decrease') || 'Decrease'}>
            <Text style={styles.sliderBtnText}>−</Text>
          </Pressable>
          <Text style={styles.sliderValue}>{stressLevel}</Text>
          <Pressable style={styles.sliderBtn} onPress={() => setStressLevel(Math.min(10, stressLevel + 1))} accessibilityLabel={t('polyvagal.increase') || 'Increase'}>
            <Text style={styles.sliderBtnText}>+</Text>
          </Pressable>
        </View>

        <View style={[styles.readinessCard, { borderColor: readinessColor }]}>
          <Text style={styles.readinessLabel}>{t('polyvagal.coRegulationReadiness')}</Text>
          <Text style={[styles.readinessValue, { color: readinessColor }]}>{readiness}</Text>
        </View>

        {readiness === 'Low' && (
          <View style={styles.alertCard}>
            <Text style={styles.alertText}>{t('polyvagal.lowCapacityAlert')}</Text>
          </View>
        )}

        <Pressable style={styles.logCapacityBtn} onPress={handleCapacityLog} accessibilityLabel={t('polyvagal.logCapacity') || 'Log capacity'}>
          <Text style={styles.logCapacityBtnText}>{t('polyvagal.logCapacity')}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('polyvagal.tabTitle')}</Text>
      <Text style={styles.subtitle}>{t('polyvagal.subtitle')}</Text>

      {renderSection1()}
      {renderSection2()}
      {renderSection3()}
      {renderSection4()}
      {renderSection5()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 },
  section: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },

  zoneCards: { gap: 12 },
  zoneCard: { backgroundColor: '#334155', borderRadius: 12, padding: 12, borderWidth: 2 },
  zoneIndicator: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  zoneName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  zoneDesc: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  logZoneBtn: { borderRadius: 8, padding: 8, marginTop: 8 },
  logZoneBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  zoneInputRow: { marginTop: 12 },
  noteInput: { backgroundColor: '#334155', borderRadius: 8, padding: 10, color: COLORS.textPrimary, fontSize: 14, marginBottom: 12 },
  babyStateLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  babyStateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  babyStateChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#334155' },
  babyStateChipActive: { backgroundColor: COLORS.ventralVagal },
  babyStateChipText: { fontSize: 13, color: COLORS.textSecondary },
  babyStateChipTextActive: { color: '#fff', fontWeight: '600' },

  checkInLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#334155' },
  chipActive: { backgroundColor: COLORS.ventralVagal },
  chipText: { fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  logCheckInBtn: { backgroundColor: COLORS.ventralVagal, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  logCheckInBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  toolsRow: { flexDirection: 'row', gap: 12 },
  toolCard: { flex: 1, backgroundColor: '#334155', borderRadius: 12, padding: 16, alignItems: 'center' },
  toolIcon: { fontSize: 24, marginBottom: 8 },
  toolName: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },

  toolActive: { alignItems: 'center', paddingVertical: 16 },
  breathingCircleContainer: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center' },
  breathingCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.ventralVagal, opacity: 0.6 },
  breathingPhaseText: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16 },
  breathingPattern: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  stopToolBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#334155', borderRadius: 8 },
  stopToolBtnText: { color: COLORS.textSecondary, fontSize: 14 },

  groundingStepLabel: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
  groundingInput: { backgroundColor: '#334155', borderRadius: 8, padding: 10, color: COLORS.textPrimary, fontSize: 14, width: '100%', minHeight: 60, textAlignVertical: 'top' },
  nextStepBtn: { backgroundColor: COLORS.ventralVagal, borderRadius: 8, padding: 12, paddingHorizontal: 24, marginTop: 12 },
  nextStepBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  coregulationIcon: { fontSize: 48, marginBottom: 12 },
  coregulationText: { fontSize: 16, color: COLORS.textPrimary, textAlign: 'center', paddingHorizontal: 16 },

  correlationInsight: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },
  timeline: { gap: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timelineDate: { fontSize: 11, color: COLORS.textSecondary, minWidth: 50 },
  timelineBars: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneDot: { width: 10, height: 10, borderRadius: 5 },
  fussinessBar: { height: 8, backgroundColor: COLORS.sympathetic, borderRadius: 4, maxWidth: '70%' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS.textSecondary },

  capacityCard: { gap: 12 },
  capacityLabel: { fontSize: 14, color: COLORS.textSecondary },
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  sliderBtnText: { fontSize: 20, color: COLORS.textPrimary, fontWeight: '600' },
  sliderValue: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '700', minWidth: 30, textAlign: 'center' },

  readinessCard: { borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, marginTop: 8 },
  readinessLabel: { fontSize: 13, color: COLORS.textSecondary },
  readinessValue: { fontSize: 32, fontWeight: '800' },

  alertCard: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 12, marginTop: 8 },
  alertText: { fontSize: 13, color: '#92400E' },

  logCapacityBtn: { backgroundColor: COLORS.ventralVagal, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  logCapacityBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

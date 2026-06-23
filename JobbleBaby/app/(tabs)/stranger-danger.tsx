import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { STORAGE_KEYS } from '../../store/storage-keys';
import { Ionicons } from '@expo/vector-icons';

interface StrangerInfo {
  id: string;
  name: string;
  relationship: string;
  exposureLevel: 'daily' | 'weekly' | 'occasional';
  photoUri?: string;
  reactionLogged: boolean;
}

interface SeparationRecord {
  date: string;
  duration: number;
  caregiver: string;
  distressLevel: number;
  parentAnxiety: number;
}

interface FlightPressureEntry {
  id: string;
  flightDate: string;
  flightNumber?: string;
  descentStart: string;
  descentEnd: string;
  distressLevel: number;
  intervention: 'feeding' | 'pacifier' | 'nothing';
  congestionLevel: 'none' | 'mild' | 'moderate' | 'severe';
  earInfection: 'yes' | 'no' | 'unknown';
}

interface TeethingPressureCorrelation {
  id: string;
  timestamp: string;
  earRubbingEpisode: boolean;
  teethingFussiness: boolean;
}

type TabType = 'stranger' | 'flight' | 'teething' | 'composite';
type CongestionLevel = 'none' | 'mild' | 'moderate' | 'severe';
type EarInfection = 'yes' | 'no' | 'unknown';
type Intervention = 'feeding' | 'pacifier' | 'nothing';

const DISTRESS_COLORS = {
  low: '#2ecc71',
  medium: '#f59e0b',
  high: '#e74c3c',
};

function getDistressColor(level: number): string {
  if (level <= 3) return DISTRESS_COLORS.low;
  if (level <= 6) return DISTRESS_COLORS.medium;
  return DISTRESS_COLORS.high;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export default function StrangerDangerScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const colors = COLORS[effectiveTheme];

  const [strangers, setStrangers] = useState<StrangerInfo[]>([
    { id: '1', name: 'Mom', relationship: 'Primary caregiver', exposureLevel: 'daily', reactionLogged: true },
    { id: '2', name: 'Dad', relationship: 'Primary caregiver', exposureLevel: 'daily', reactionLogged: true },
  ]);

  const [separations, setSeparations] = useState<SeparationRecord[]>([]);
  const [showAddStranger, setShowAddStranger] = useState(false);
  const [phase, setPhase] = useState<'none' | 'emerging' | 'peak' | 'resolving'>('emerging');

  // Tab navigation
  const [currentTab, setCurrentTab] = useState<TabType>('stranger');

  // Flight pressure state
  const [flightLog, setFlightLog] = useState<FlightPressureEntry[]>([]);
  const [preFlightForm, setPreFlightForm] = useState({
    flightDate: new Date().toISOString().split('T')[0],
    flightNumber: '',
    descentStart: '',
    descentEnd: '',
    distressLevel: 5,
    intervention: 'feeding' as Intervention,
    congestionLevel: 'none' as CongestionLevel,
    earInfection: 'no' as EarInfection,
  });

  // Teething correlation state
  const [teethingCorrelation, setTeethingCorrelation] = useState<TeethingPressureCorrelation[]>([]);
  const [showTeethingLog, setShowTeethingLog] = useState(false);

  // Stranger intensity state
  const [strangerIntensity, setStrangerIntensity] = useState(5);

  // Anxiety timeline
  const [anxietyTimeline, setAnxietyTimeline] = useState<{ date: string; intensity: number }[]>([]);

  const introductionStages = [
    { stage: 1, title: 'Familiar face', description: 'Baby sees familiar person in familiar place', tip: 'Let baby observe from caregiver arms length' },
    { stage: 2, title: 'Familiar in new place', description: 'Familiar person joins baby in new environment', tip: 'Stay nearby, let baby explore at own pace' },
    { stage: 3, title: 'New face in familiar place', description: 'New person visits when baby is comfortable', tip: 'Let baby reach out first, do not force interaction' },
    { stage: 4, title: 'New face in new place', description: 'New person in unfamiliar environment', tip: 'Parent stays close initially, gradual distance increase' },
  ];

  const departureRitual = [
    { step: 1, title: 'Predictable goodbye', description: 'Use same words and actions each time' },
    { step: 2, title: 'Signal object', description: 'Give baby a familiar item to hold' },
    { step: 3, title: 'Quick confident exit', description: 'Do not linger or sneak away' },
  ];

  const averageDistress = separations.length > 0
    ? separations.reduce((sum, s) => sum + s.distressLevel, 0) / separations.length
    : 0;

  // Load data from AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      const [flightData, teethingData] = await Promise.all([
        safeGetItem(STORAGE_KEYS.FLIGHT_PRESSURE_LOG),
        safeGetItem(STORAGE_KEYS.TEETHING_PRESSURE_CORRELATION),
      ]);

      if (flightData) {
        try {
          setFlightLog(JSON.parse(flightData));
        } catch {
          // ignore parse errors
        }
      }

      if (teethingData) {
        try {
          setTeethingCorrelation(JSON.parse(teethingData));
        } catch {
          // ignore parse errors
        }
      }
    };

    loadData();
  }, []);

  // Save flight log
  const saveFlightLog = useCallback(async (data: FlightPressureEntry[]) => {
    setFlightLog(data);
    await safeSetItem(STORAGE_KEYS.FLIGHT_PRESSURE_LOG, JSON.stringify(data));
  }, []);

  // Save teething correlation
  const saveTeethingCorrelation = useCallback(async (data: TeethingPressureCorrelation[]) => {
    setTeethingCorrelation(data);
    await safeSetItem(STORAGE_KEYS.TEETHING_PRESSURE_CORRELATION, JSON.stringify(data));
  }, []);

  // Add flight pressure entry
  const addFlightEntry = async () => {
    if (!preFlightForm.flightDate || !preFlightForm.descentStart || !preFlightForm.descentEnd) {
      Alert.alert(t('common.error'), t('strangerDanger.flight.fillRequired'));
      return;
    }

    const entry: FlightPressureEntry = {
      id: generateId(),
      flightDate: preFlightForm.flightDate,
      flightNumber: preFlightForm.flightNumber || undefined,
      descentStart: preFlightForm.descentStart,
      descentEnd: preFlightForm.descentEnd,
      distressLevel: preFlightForm.distressLevel,
      intervention: preFlightForm.intervention,
      congestionLevel: preFlightForm.congestionLevel,
      earInfection: preFlightForm.earInfection,
    };

    const newLog = [...flightLog, entry];
    await saveFlightLog(newLog);

    setPreFlightForm({
      flightDate: new Date().toISOString().split('T')[0],
      flightNumber: '',
      descentStart: '',
      descentEnd: '',
      distressLevel: 5,
      intervention: 'feeding',
      congestionLevel: 'none',
      earInfection: 'no',
    });
  };

  // Quick log teething ear rubbing
  const quickLogEarRubbing = async (earRubbing: boolean, teething: boolean) => {
    const entry: TeethingPressureCorrelation = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      earRubbingEpisode: earRubbing,
      teethingFussiness: teething,
    };

    const newData = [...teethingCorrelation, entry];
    await saveTeethingCorrelation(newData);
  };

  // Calculate composite index
  const calculateCompositeIndex = useCallback((): number => {
    const strangerComponent = strangerIntensity / 10;
    const flightComponent = flightLog.length > 0
      ? flightLog.reduce((sum, f) => sum + f.distressLevel, 0) / flightLog.length / 10
      : 0;
    const teethingComponent = teethingCorrelation.length > 0
      ? teethingCorrelation.filter(t => t.earRubbingEpisode && t.teethingFussiness).length /
        Math.max(teethingCorrelation.length, 1)
      : 0;
    return Math.round((strangerComponent * 0.4 + flightComponent * 0.35 + teethingComponent * 0.25) * 10);
  }, [strangerIntensity, flightLog, teethingCorrelation]);

  // Update stranger intensity and log to timeline
  const updateStrangerIntensity = (value: number) => {
    setStrangerIntensity(value);
    const entry = {
      date: new Date().toISOString().split('T')[0],
      intensity: value,
    };
    setAnxietyTimeline(prev => {
      const existing = prev.findIndex(e => e.date === entry.date);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = entry;
        return updated;
      }
      return [...prev, entry];
    });
  };

  const compositeIndex = calculateCompositeIndex();
  const compositeLevel = compositeIndex <= 3 ? 'normal' : compositeIndex <= 6 ? 'elevated' : 'high';

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      key={tab}
      onPress={() => setCurrentTab(tab)}
      style={[
        styles.tabButton,
        { backgroundColor: currentTab === tab ? colors.accent : colors.card },
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={16}
        color={currentTab === tab ? '#fff' : colors.text}
      />
      <Text
        style={[
          styles.tabButtonText,
          { color: currentTab === tab ? '#fff' : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderStrangerTab = () => (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Stranger Wariness Phase with intensity slider */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('stranger.warinessPhase')}</Text>
        <View style={styles.phaseIndicator}>
          {(['none', 'emerging', 'peak', 'resolving'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPhase(p)}
              style={[
                styles.phaseButton,
                { backgroundColor: phase === p ? colors.accent : colors.card },
              ]}
              accessibilityLabel={`${p} phase`}
            >
              <Text style={[styles.phaseText, { color: phase === p ? '#fff' : colors.text }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.infoText, { color: colors.muted }]}>
          {t('stranger.warinessInfo')}
        </Text>

        {/* Intensity slider */}
        <View style={styles.intensitySection}>
          <Text style={[styles.intensityLabel, { color: colors.text }]}>
            {t('strangerDanger.strangerAnxiety.intensityScale')}: {strangerIntensity}
          </Text>
          <View style={styles.sliderContainer}>
            <Text style={[styles.sliderMin, { color: colors.muted }]}>0</Text>
            <View style={styles.sliderTrack}>
              <View
                style={[
                  styles.sliderFill,
                  {
                    backgroundColor: getDistressColor(strangerIntensity),
                    width: `${strangerIntensity * 10}%`,
                  },
                ]}
              />
              <TouchableOpacity
                style={[
                  styles.sliderThumb,
                  {
                    left: `${strangerIntensity * 10}%`,
                    backgroundColor: getDistressColor(strangerIntensity),
                  },
                ]}
                accessibilityLabel={`Intensity ${strangerIntensity}`}
                accessibilityRole="adjustable"
                accessibilityValue={{ min: 0, max: 10, now: strangerIntensity }}
                onPressIn={() => {}}
              />
            </View>
            <Text style={[styles.sliderMax, { color: colors.muted }]}>10</Text>
          </View>
          <View style={styles.intensityButtons}>
            {[0, 2, 4, 6, 8, 10].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => updateStrangerIntensity(val)}
                style={[
                  styles.intensityButton,
                  {
                    backgroundColor: strangerIntensity === val ? getDistressColor(val) : colors.background,
                  },
                ]}
                accessibilityLabel={`Set intensity to ${val}`}
              >
                <Text
                  style={[
                    styles.intensityButtonText,
                    { color: strangerIntensity === val ? '#fff' : colors.text },
                  ]}
                >
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Stranger Anxiety Timeline */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('strangerDanger.strangerAnxiety.timeline')}
        </Text>
        {anxietyTimeline.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {t('strangerDanger.strangerAnxiety.noTimelineData')}
          </Text>
        ) : (
          <View style={styles.timelineContainer}>
            {anxietyTimeline.slice(-7).reverse().map((entry, index) => (
              <View key={index} style={styles.timelineEntry}>
                <Text style={[styles.timelineDate, { color: colors.muted }]}>{entry.date}</Text>
                <View style={styles.timelineBar}>
                  <View
                    style={[
                      styles.timelineFill,
                      {
                        backgroundColor: getDistressColor(entry.intensity),
                        width: `${entry.intensity * 10}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.timelineValue, { color: colors.text }]}>{entry.intensity}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Face Recognition Photos */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('strangerDanger.strangerAnxiety.familiarFaces')} vs {t('strangerDanger.strangerAnxiety.unfamiliarFaces')}
        </Text>
        <View style={styles.faceGrid}>
          <View style={styles.faceColumn}>
            <View style={[styles.facePlaceholder, { backgroundColor: colors.background }]}>
              <Ionicons name="person" size={40} color={colors.muted} />
              <Text style={[styles.facePlaceholderText, { color: colors.muted }]}>
                {t('strangerDanger.strangerAnxiety.familiarFaces')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addPhotoButton, { backgroundColor: colors.accent }]}
              accessibilityLabel={`Add familiar face photo`}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.addPhotoText}>{t('common.add')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.faceColumn}>
            <View style={[styles.facePlaceholder, { backgroundColor: colors.background }]}>
              <Ionicons name="person-outline" size={40} color={colors.muted} />
              <Text style={[styles.facePlaceholderText, { color: colors.muted }]}>
                {t('strangerDanger.strangerAnxiety.unfamiliarFaces')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.addPhotoButton, { backgroundColor: colors.accent }]}
              accessibilityLabel={`Add unfamiliar face photo`}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.addPhotoText}>{t('common.add')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Familiar Face Registry */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('stranger.familiarRegistry')}</Text>
          <TouchableOpacity
            onPress={() => setShowAddStranger(!showAddStranger)}
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            accessibilityLabel="Add familiar person"
          >
            <Text style={styles.addButtonText}>+ {t('common.add')}</Text>
          </TouchableOpacity>
        </View>
        {strangers.map((s) => (
          <View key={s.id} style={[styles.strangerRow, { borderColor: colors.border }]}>
            <View style={styles.strangerInfo}>
              <Text style={[styles.strangerName, { color: colors.text }]}>{s.name}</Text>
              <Text style={[styles.strangerRelation, { color: colors.muted }]}>
                {s.relationship} • {t(`stranger.${s.exposureLevel}`)}
              </Text>
            </View>
            {s.reactionLogged && (
              <View style={[styles.badge, { backgroundColor: '#2ecc71' }]}>
                <Text style={styles.badgeText}>{t('stranger.logged')}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Gradual Introduction Protocol */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('stranger.introductionProtocol')}</Text>
        {introductionStages.map((stage) => (
          <View key={stage.stage} style={[styles.stageRow, { borderColor: colors.border }]}>
            <View style={[styles.stageNumber, { backgroundColor: colors.accent }]}>
              <Text style={styles.stageNumberText}>{stage.stage}</Text>
            </View>
            <View style={styles.stageContent}>
              <Text style={[styles.stageTitle, { color: colors.text }]}>{stage.title}</Text>
              <Text style={[styles.stageDesc, { color: colors.muted }]}>{stage.description}</Text>
              <Text style={[styles.stageTip, { color: colors.accent }]}>💡 {stage.tip}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Separation Anxiety Toolkit */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('stranger.separationToolkit')}</Text>
        <Text style={[styles.toolkitSubtitle, { color: colors.muted }]}>{t('stranger.departureRitual')}</Text>
        {departureRitual.map((ritual) => (
          <View key={ritual.step} style={styles.ritualRow}>
            <Text style={[styles.ritualStep, { color: colors.accent }]}>Step {ritual.step}</Text>
            <View>
              <Text style={[styles.ritualTitle, { color: colors.text }]}>{ritual.title}</Text>
              <Text style={[styles.ritualDesc, { color: colors.muted }]}>{ritual.description}</Text>
            </View>
          </View>
        ))}
        <View style={[styles.peekabooSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.peekabooTitle, { color: colors.text }]}>🎭 {t('stranger.peekabooPractice')}</Text>
          <Text style={[styles.peekabooDesc, { color: colors.muted }]}>
            {t('stranger.peekabooDesc')}
          </Text>
        </View>
      </View>

      {/* Departure Tracker */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('stranger.departureTracker')}</Text>
        {separations.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {t('stranger.noSeparations')}
          </Text>
        ) : (
          <>
            <View style={styles.trendRow}>
              <Text style={[styles.trendLabel, { color: colors.text }]}>{t('stranger.avgDistress')}</Text>
              <Text style={[styles.trendValue, { color: averageDistress > 3 ? '#e74c3c' : '#2ecc71' }]}>
                {averageDistress.toFixed(1)}/5
              </Text>
            </View>
            {separations.slice(-5).reverse().map((sep, i) => (
              <View key={i} style={[styles.separationRow, { borderColor: colors.border }]}>
                <Text style={[styles.sepDate, { color: colors.text }]}>{sep.date}</Text>
                <Text style={[styles.sepDuration, { color: colors.muted }]}>
                  {sep.duration}min • {sep.caregiver}
                </Text>
                <View style={[styles.distressBadge, {
                  backgroundColor: sep.distressLevel > 3 ? '#e74c3c' : '#2ecc71',
                }]}>
                  <Text style={styles.distressText}>{sep.distressLevel}/5</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>

      {/* Storm Integration */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('stranger.stormIntegration')}</Text>
        <Text style={[styles.stormInfo, { color: colors.muted }]}>
          {t('stranger.stormInfo')}
        </Text>
      </View>
    </ScrollView>
  );

  const renderFlightTab = () => (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Air Travel Ear Comfort Protocol */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('strangerDanger.flight.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>{t('strangerDanger.flight.subtitle')}</Text>

        {/* Pre-Flight Readiness Checklist */}
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>
          {t('strangerDanger.flight.preFlightChecklist')}
        </Text>

        {/* Congestion Level */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {t('strangerDanger.flight.congestionLevel')}
        </Text>
        <View style={styles.segmentedControl}>
          {(['none', 'mild', 'moderate', 'severe'] as CongestionLevel[]).map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => setPreFlightForm(prev => ({ ...prev, congestionLevel: level }))}
              style={[
                styles.segmentButton,
                {
                  backgroundColor: preFlightForm.congestionLevel === level ? colors.accent : colors.background,
                },
              ]}
              accessibilityLabel={`${level} congestion`}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: preFlightForm.congestionLevel === level ? '#fff' : colors.text },
                ]}
              >
                {t(`strangerDanger.flight.congestion${level.charAt(0).toUpperCase() + level.slice(1)}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Ear Infection */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {t('strangerDanger.flight.recentEarInfection')}
        </Text>
        <View style={styles.segmentedControl}>
          {(['yes', 'no', 'unknown'] as EarInfection[]).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => setPreFlightForm(prev => ({ ...prev, earInfection: value }))}
              style={[
                styles.segmentButton,
                {
                  backgroundColor: preFlightForm.earInfection === value ? colors.accent : colors.background,
                },
              ]}
              accessibilityLabel={`Ear infection: ${value}`}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: preFlightForm.earInfection === value ? '#fff' : colors.text },
                ]}
              >
                {t(`strangerDanger.flight.${value}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Flight Readiness Status */}
        <View style={[styles.readinessBox, {
          backgroundColor: preFlightForm.earInfection === 'yes' || preFlightForm.congestionLevel === 'severe'
            ? 'rgba(231, 76, 60, 0.1)'
            : 'rgba(46, 204, 113, 0.1)',
        }]}>
          <Text style={[styles.readinessText, {
            color: preFlightForm.earInfection === 'yes' || preFlightForm.congestionLevel === 'severe'
              ? '#e74c3c'
              : '#2ecc71',
          }]}>
            {preFlightForm.earInfection === 'yes' || preFlightForm.congestionLevel === 'severe'
              ? t('strangerDanger.flight.notReady')
              : t('strangerDanger.flight.readyToFly')}
          </Text>
        </View>
      </View>

      {/* Pressure Equalization Log */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('strangerDanger.flight.pressureLog')}
        </Text>

        {/* Flight Date */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {t('strangerDanger.flight.flightDate')}
        </Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={preFlightForm.flightDate}
          onChangeText={(text) => setPreFlightForm(prev => ({ ...prev, flightDate: text }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Flight date"
        />

        {/* Flight Number */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {t('strangerDanger.flight.flightNumber')}
        </Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={preFlightForm.flightNumber}
          onChangeText={(text) => setPreFlightForm(prev => ({ ...prev, flightNumber: text }))}
          placeholder="e.g. AA123"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Flight number"
        />

        {/* Descent Times */}
        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {t('strangerDanger.flight.descentStart')}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={preFlightForm.descentStart}
              onChangeText={(text) => setPreFlightForm(prev => ({ ...prev, descentStart: text }))}
              placeholder="HH:MM"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Descent start time"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              {t('strangerDanger.flight.descentEnd')}
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={preFlightForm.descentEnd}
              onChangeText={(text) => setPreFlightForm(prev => ({ ...prev, descentEnd: text }))}
              placeholder="HH:MM"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Descent end time"
            />
          </View>
        </View>

        {/* Distress Level Slider */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {t('strangerDanger.flight.distressLevel')}: {preFlightForm.distressLevel}
        </Text>
        <View style={styles.sliderContainer}>
          <Text style={[styles.sliderMin, { color: colors.muted }]}>0</Text>
          <View style={styles.sliderTrack}>
            <View
              style={[
                styles.sliderFill,
                {
                  backgroundColor: getDistressColor(preFlightForm.distressLevel),
                  width: `${preFlightForm.distressLevel * 10}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.sliderMax, { color: colors.muted }]}>10</Text>
        </View>
        <View style={styles.intensityButtons}>
          {[0, 2, 4, 6, 8, 10].map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => setPreFlightForm(prev => ({ ...prev, distressLevel: val }))}
              style={[
                styles.intensityButton,
                {
                  backgroundColor: preFlightForm.distressLevel === val ? getDistressColor(val) : colors.background,
                },
              ]}
              accessibilityLabel={`Set distress level to ${val}`}
            >
              <Text
                style={[
                  styles.intensityButtonText,
                  { color: preFlightForm.distressLevel === val ? '#fff' : colors.text },
                ]}
              >
                {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Intervention */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>
          {t('strangerDanger.flight.intervention')}
        </Text>
        <View style={styles.segmentedControl}>
          {(['feeding', 'pacifier', 'nothing'] as Intervention[]).map((intervention) => (
            <TouchableOpacity
              key={intervention}
              onPress={() => setPreFlightForm(prev => ({ ...prev, intervention }))}
              style={[
                styles.segmentButton,
                {
                  backgroundColor: preFlightForm.intervention === intervention ? colors.accent : colors.background,
                },
              ]}
              accessibilityLabel={`${intervention} intervention`}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: preFlightForm.intervention === intervention ? '#fff' : colors.text },
                ]}
              >
                {t(`strangerDanger.flight.intervention${intervention.charAt(0).toUpperCase() + intervention.slice(1)}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Log Entry Button */}
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: colors.accent }]}
          onPress={addFlightEntry}
          accessibilityLabel={t('strangerDanger.flight.logEntry')}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.logButtonText}>{t('strangerDanger.flight.logEntry')}</Text>
        </TouchableOpacity>
      </View>

      {/* Flight Log Entries */}
      {flightLog.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('strangerDanger.flight.postFlightSummary')}
          </Text>
          {flightLog.slice(-5).reverse().map((entry) => (
            <View key={entry.id} style={[styles.logEntry, { borderColor: colors.border }]}>
              <View style={styles.logEntryHeader}>
                <Text style={[styles.logEntryDate, { color: colors.text }]}>{entry.flightDate}</Text>
                <Text style={[styles.logEntryFlight, { color: colors.muted }]}>
                  {entry.flightNumber || 'N/A'}
                </Text>
              </View>
              <View style={styles.logEntryDetails}>
                <Text style={[styles.logEntryTime, { color: colors.muted }]}>
                  {entry.descentStart} - {entry.descentEnd}
                </Text>
                <View style={[styles.distressBadge, { backgroundColor: getDistressColor(entry.distressLevel) }]}>
                  <Text style={styles.distressText}>{entry.distressLevel}/10</Text>
                </View>
                <Text style={[styles.logEntryIntervention, { color: colors.muted }]}>
                  {t(`strangerDanger.flight.intervention${entry.intervention.charAt(0).toUpperCase() + entry.intervention.slice(1)}`)}
                </Text>
              </View>
            </View>
          ))}

          {/* Average Distress */}
          <View style={styles.averageRow}>
            <Text style={[styles.averageLabel, { color: colors.text }]}>
              {t('strangerDanger.flight.averageDistress')}
            </Text>
            <Text
              style={[
                styles.averageValue,
                { color: getDistressColor(Math.round(flightLog.reduce((sum, f) => sum + f.distressLevel, 0) / flightLog.length)) },
              ]}
            >
              {(flightLog.reduce((sum, f) => sum + f.distressLevel, 0) / flightLog.length).toFixed(1)}/10
            </Text>
          </View>
        </View>
      )}

      {flightLog.length === 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.emptyText, { color: colors.muted, textAlign: 'center' }]}>
            {t('strangerDanger.flight.noEntries')}
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderTeethingTab = () => {
    const totalEarRubbing = teethingCorrelation.filter(t => t.earRubbingEpisode).length;
    const totalTeething = teethingCorrelation.filter(t => t.teethingFussiness).length;
    const correlatedDays = teethingCorrelation.filter(t => t.earRubbingEpisode && t.teethingFussiness).length;
    const correlationRatio = teethingCorrelation.length > 0
      ? correlatedDays / teethingCorrelation.length
      : 0;

    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Teething Pressure Correlation */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('strangerDanger.teething.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{t('strangerDanger.teething.subtitle')}</Text>

          {/* Quick Log Section */}
          <Text style={[styles.subsectionTitle, { color: colors.text }]}>
            {t('strangerDanger.teething.quickLog')}
          </Text>

          <View style={styles.quickLogGrid}>
            <TouchableOpacity
              style={[styles.quickLogButton, { backgroundColor: colors.accent }]}
              onPress={() => quickLogEarRubbing(true, true)}
              accessibilityLabel="Log ear rubbing with teething"
            >
              <Ionicons name="hand-right" size={24} color="#fff" />
              <Text style={styles.quickLogText}>{t('strangerDanger.teething.earRubbing')}</Text>
              <Text style={styles.quickLogSubtext}>+ Teething</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickLogButton, { backgroundColor: colors.card, borderColor: colors.accent, borderWidth: 1 }]}
              onPress={() => quickLogEarRubbing(true, false)}
              accessibilityLabel="Log ear rubbing only"
            >
              <Ionicons name="hand-right" size={24} color={colors.accent} />
              <Text style={[styles.quickLogText, { color: colors.accent }]}>{t('strangerDanger.teething.earRubbing')}</Text>
              <Text style={[styles.quickLogSubtext, { color: colors.muted }]}>No teething</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickLogGrid}>
            <TouchableOpacity
              style={[styles.quickLogButton, { backgroundColor: colors.card, borderColor: colors.muted, borderWidth: 1 }]}
              onPress={() => quickLogEarRubbing(false, true)}
              accessibilityLabel="Log teething only"
            >
              <Ionicons name="happy" size={24} color={colors.muted} />
              <Text style={[styles.quickLogText, { color: colors.muted }]}>{t('strangerDanger.teething.quickLog.teethingFussiness')}</Text>
              <Text style={[styles.quickLogSubtext, { color: colors.muted }]}>No ear rubbing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickLogButton, { backgroundColor: colors.background }]}
              onPress={() => quickLogEarRubbing(false, false)}
              accessibilityLabel="Log neutral"
            >
              <Ionicons name="pause" size={24} color={colors.muted} />
              <Text style={[styles.quickLogText, { color: colors.muted }]}>{t('strangerDanger.teething.quickLog.neither')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Correlation Stats */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('strangerDanger.teething.correlation')}
          </Text>

          {teethingCorrelation.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {t('strangerDanger.teething.noEarRubbing')}
            </Text>
          ) : (
            <>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.accent }]}>{totalEarRubbing}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>
                    {t('strangerDanger.teething.earRubbingDays')}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.accent }]}>{totalTeething}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>
                    {t('strangerDanger.teething.teethingDays')}
                  </Text>
                </View>
              </View>

              <View style={styles.correlationBox}>
                <Text style={[styles.correlationLabel, { color: colors.text }]}>
                  {t('strangerDanger.teething.correlation')}
                </Text>
                <View style={styles.correlationBar}>
                  <View
                    style={[
                      styles.correlationFill,
                      {
                        backgroundColor: correlationRatio > 0.5 ? '#e74c3c' : '#2ecc71',
                        width: `${correlationRatio * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.correlationText, { color: colors.muted }]}>
                  {correlationRatio > 0.5
                    ? t('strangerDanger.teething.highCorrelation')
                    : t('strangerDanger.teething.lowCorrelation')}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Recent Entries */}
        {teethingCorrelation.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('strangerDanger.teething.earRubbing')}
            </Text>
            {teethingCorrelation.slice(-10).reverse().map((entry) => (
              <View key={entry.id} style={[styles.logEntry, { borderColor: colors.border }]}>
                <Text style={[styles.logEntryDate, { color: colors.text }]}>
                  {new Date(entry.timestamp).toLocaleString()}
                </Text>
                <View style={styles.entryTags}>
                  {entry.earRubbingEpisode && (
                    <View style={[styles.tag, { backgroundColor: '#e74c3c' }]}>
                      <Text style={styles.tagText}>Ear Rubbing</Text>
                    </View>
                  )}
                  {entry.teethingFussiness && (
                    <View style={[styles.tag, { backgroundColor: '#f59e0b' }]}>
                      <Text style={styles.tagText}>{t('strangerDanger.teething.tags.teething')}</Text>
                    </View>
                  )}
                  {!entry.earRubbingEpisode && !entry.teethingFussiness && (
                    <View style={[styles.tag, { backgroundColor: colors.muted }]}>
                      <Text style={styles.tagText}>{t('strangerDanger.teething.tags.neutral')}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderCompositeTab = () => (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Composite Distress Index */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('strangerDanger.composite.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {t('strangerDanger.composite.subtitle')}
        </Text>

        {/* Composite Gauge */}
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeBackground}>
            <View style={styles.gaugeGradient}>
              <View style={[styles.gaugeZone, { backgroundColor: DISTRESS_COLORS.low, flex: 1 }]} />
              <View style={[styles.gaugeZone, { backgroundColor: DISTRESS_COLORS.medium, flex: 1 }]} />
              <View style={[styles.gaugeZone, { backgroundColor: DISTRESS_COLORS.high, flex: 1 }]} />
            </View>
            <View
              style={[
                styles.gaugeNeedle,
                {
                  left: `${compositeIndex * 10}%`,
                  backgroundColor: getDistressColor(compositeIndex),
                },
              ]}
            />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={[styles.gaugeLabel, { color: colors.muted }]}>0</Text>
            <Text style={[styles.gaugeLabel, { color: colors.muted }]}>5</Text>
            <Text style={[styles.gaugeLabel, { color: colors.muted }]}>10</Text>
          </View>
          <View style={styles.gaugeValue}>
            <Text style={[styles.gaugeValueText, { color: getDistressColor(compositeIndex) }]}>
              {compositeIndex}
            </Text>
            <Text style={[styles.gaugeValueLabel, { color: colors.muted }]}>
              {t(`strangerDanger.composite.${compositeLevel}`)}
            </Text>
          </View>
        </View>

        {/* Alert Message */}
        {(compositeIndex > 6 || strangerIntensity > 7) && (
          <View style={[styles.alertBox, { backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}>
            <Ionicons name="alert-circle" size={20} color="#e74c3c" />
            <Text style={[styles.alertText, { color: '#e74c3c' }]}>
              {t('strangerDanger.alert.normalPhase')}
            </Text>
          </View>
        )}

        {/* Component Breakdown */}
        <Text style={[styles.subsectionTitle, { color: colors.text }]}>
          {t('strangerDanger.composite.distressLevel')}
        </Text>

        <View style={styles.componentRow}>
          <Text style={[styles.componentLabel, { color: colors.text }]}>
            {t('strangerDanger.strangerAnxiety.title')}
          </Text>
          <View style={styles.componentBar}>
            <View
              style={[
                styles.componentFill,
                {
                  backgroundColor: getDistressColor(strangerIntensity),
                  width: `${strangerIntensity * 10}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.componentValue, { color: colors.text }]}>
            {(strangerIntensity / 10 * 0.4 * 10).toFixed(1)}
          </Text>
        </View>

        <View style={styles.componentRow}>
          <Text style={[styles.componentLabel, { color: colors.text }]}>
            {t('strangerDanger.flight.title')}
          </Text>
          <View style={styles.componentBar}>
            <View
              style={[
                styles.componentFill,
                {
                  backgroundColor: getDistressColor(
                    flightLog.length > 0
                      ? flightLog.reduce((sum, f) => sum + f.distressLevel, 0) / flightLog.length
                      : 0
                  ),
                  width: `${flightLog.length > 0 ? (flightLog.reduce((sum, f) => sum + f.distressLevel, 0) / flightLog.length) * 10 : 0}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.componentValue, { color: colors.text }]}>
            {flightLog.length > 0
              ? ((flightLog.reduce((sum, f) => sum + f.distressLevel, 0) / flightLog.length / 10) * 0.35 * 10).toFixed(1)
              : '0.0'}
          </Text>
        </View>

        <View style={styles.componentRow}>
          <Text style={[styles.componentLabel, { color: colors.text }]}>
            {t('strangerDanger.teething.title')}
          </Text>
          <View style={styles.componentBar}>
            <View
              style={[
                styles.componentFill,
                {
                  backgroundColor: teethingCorrelation.filter(t => t.earRubbingEpisode && t.teethingFussiness).length /
                    Math.max(teethingCorrelation.length, 1) > 0.5
                    ? DISTRESS_COLORS.high
                    : DISTRESS_COLORS.low,
                  width: `${teethingCorrelation.length > 0
                    ? (teethingCorrelation.filter(t => t.earRubbingEpisode && t.teethingFussiness).length /
                      Math.max(teethingCorrelation.length, 1)) * 100
                    : 0}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.componentValue, { color: colors.text }]}>
            {teethingCorrelation.length > 0
              ? ((teethingCorrelation.filter(t => t.earRubbingEpisode && t.teethingFussiness).length /
                Math.max(teethingCorrelation.length, 1)) * 0.25 * 10).toFixed(1)
              : '0.0'}
          </Text>
        </View>
      </View>

      {/* Normal Phase Info */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t('strangerDanger.composite.normalPhaseMessage')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tab Navigation */}
      <View style={[styles.tabNav, { backgroundColor: colors.card }]}>
        {renderTabButton('stranger', t('strangerDanger.strangerAnxiety.title'), 'people')}
        {renderTabButton('flight', t('strangerDanger.flight.title'), 'airplane')}
        {renderTabButton('teething', t('strangerDanger.teething.title'), 'happy')}
        {renderTabButton('composite', t('strangerDanger.composite.title'), 'analytics')}
      </View>

      {/* Tab Content */}
      {currentTab === 'stranger' && renderStrangerTab()}
      {currentTab === 'flight' && renderFlightTab()}
      {currentTab === 'teething' && renderTeethingTab()}
      {currentTab === 'composite' && renderCompositeTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 16, marginBottom: 8, padding: 16, borderRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  subsectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 12 },
  phaseIndicator: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  phaseButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  phaseText: { fontSize: 12, fontWeight: '600' },
  infoText: { fontSize: 14, lineHeight: 20 },
  addButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  strangerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  strangerInfo: { flex: 1 },
  strangerName: { fontSize: 16, fontWeight: '600' },
  strangerRelation: { fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  stageRow: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, paddingBottom: 12 },
  stageNumber: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stageNumberText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stageContent: { flex: 1 },
  stageTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  stageDesc: { fontSize: 13, marginBottom: 4 },
  stageTip: { fontSize: 12, fontStyle: 'italic' },
  toolkitSubtitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  ritualRow: { flexDirection: 'row', marginBottom: 12 },
  ritualStep: { fontSize: 13, fontWeight: '700', width: 50 },
  ritualTitle: { fontSize: 14, fontWeight: '600' },
  ritualDesc: { fontSize: 13 },
  peekabooSection: { marginTop: 8, padding: 12, borderRadius: 8 },
  peekabooTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  peekabooDesc: { fontSize: 13, lineHeight: 18 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  trendLabel: { fontSize: 14, fontWeight: '600' },
  trendValue: { fontSize: 16, fontWeight: '700' },
  separationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  sepDate: { fontSize: 13, fontWeight: '600', width: 80 },
  sepDuration: { flex: 1, fontSize: 13 },
  distressBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  distressText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  stormInfo: { fontSize: 14, lineHeight: 20 },
  // Tab navigation
  tabNav: { flexDirection: 'row', padding: 8, margin: 16, borderRadius: 12, justifyContent: 'space-between' },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flex: 1, justifyContent: 'center', marginHorizontal: 2 },
  tabButtonText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  // Intensity slider
  intensitySection: { marginTop: 16 },
  intensityLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sliderTrack: { flex: 1, height: 8, backgroundColor: '#2a3a4a', borderRadius: 4, marginHorizontal: 8, position: 'relative' },
  sliderFill: { height: 8, borderRadius: 4 },
  sliderThumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, top: -6, marginLeft: -10 },
  sliderMin: { fontSize: 12 },
  sliderMax: { fontSize: 12 },
  intensityButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  intensityButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, minWidth: 40 },
  intensityButtonText: { fontSize: 14, fontWeight: '600' },
  // Timeline
  timelineContainer: { marginTop: 8 },
  timelineEntry: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  timelineDate: { fontSize: 12, width: 80 },
  timelineBar: { flex: 1, height: 8, backgroundColor: '#2a3a4a', borderRadius: 4, marginHorizontal: 8 },
  timelineFill: { height: 8, borderRadius: 4 },
  timelineValue: { fontSize: 14, fontWeight: '600', width: 24 },
  // Face grid
  faceGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  faceColumn: { flex: 1, alignItems: 'center', marginHorizontal: 8 },
  facePlaceholder: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  facePlaceholderText: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  addPhotoButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  addPhotoText: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  // Form elements
  fieldLabel: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  segmentedControl: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  segmentButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  segmentText: { fontSize: 13, fontWeight: '600' },
  readinessBox: { padding: 12, borderRadius: 8, marginTop: 12 },
  readinessText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfField: { flex: 1, marginRight: 8 },
  logButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  logButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  // Log entries
  logEntry: { paddingVertical: 12, borderBottomWidth: 1 },
  logEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logEntryDate: { fontSize: 14, fontWeight: '600' },
  logEntryFlight: { fontSize: 12 },
  logEntryDetails: { flexDirection: 'row', alignItems: 'center' },
  logEntryTime: { fontSize: 12, flex: 1 },
  logEntryIntervention: { fontSize: 12 },
  averageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2a3a4a' },
  averageLabel: { fontSize: 14, fontWeight: '600' },
  averageValue: { fontSize: 18, fontWeight: '700' },
  // Teething quick log
  quickLogGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quickLogButton: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, borderRadius: 12, marginHorizontal: 4 },
  quickLogText: { fontSize: 13, fontWeight: '600', color: '#fff', marginTop: 8, textAlign: 'center' },
  quickLogSubtext: { fontSize: 11, color: '#fff', marginTop: 4, opacity: 0.8 },
  // Stats
  statRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  correlationBox: { marginTop: 16 },
  correlationLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  correlationBar: { height: 12, backgroundColor: '#2a3a4a', borderRadius: 6 },
  correlationFill: { height: 12, borderRadius: 6 },
  correlationText: { fontSize: 13, marginTop: 8 },
  entryTags: { flexDirection: 'row', marginTop: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 4 },
  tagText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  // Composite gauge
  gaugeContainer: { marginVertical: 24, alignItems: 'center' },
  gaugeBackground: { width: '100%', height: 24, position: 'relative' },
  gaugeGradient: { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden' },
  gaugeZone: { height: 24 },
  gaugeNeedle: { position: 'absolute', width: 8, height: 24, borderRadius: 4, top: 0, marginLeft: -4 },
  gaugeLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 },
  gaugeLabel: { fontSize: 12 },
  gaugeValue: { alignItems: 'center', marginTop: 16 },
  gaugeValueText: { fontSize: 48, fontWeight: '700' },
  gaugeValueLabel: { fontSize: 16, marginTop: 4 },
  // Alert
  alertBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginTop: 16 },
  alertText: { fontSize: 14, marginLeft: 8, flex: 1 },
  // Component breakdown
  componentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  componentLabel: { fontSize: 13, width: 100 },
  componentBar: { flex: 1, height: 8, backgroundColor: '#2a3a4a', borderRadius: 4, marginHorizontal: 8 },
  componentFill: { height: 8, borderRadius: 4 },
  componentValue: { fontSize: 14, fontWeight: '600', width: 32, textAlign: 'right' },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  infoTextBox: { fontSize: 14, marginLeft: 8, flex: 1, lineHeight: 20 },
});

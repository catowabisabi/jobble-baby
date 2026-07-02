import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { STORAGE_KEYS } from '../../store/storage-keys';

const COLORS_CONST = {
  ventralVagal: '#22C55E',
  sympathetic: '#F59E0B',
  dorsalVagal: '#3B82F6',
  background: '#0F172A',
  card: '#1E293B',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  distressed: '#EF4444',
  calm: '#22C55E',
  aroused: '#F59E0B',
};

const RESONANCE_PAIRS_KEY = STORAGE_KEYS.RESONANCE_PAIRS;
const ALLOSTATIC_LOAD_KEY = STORAGE_KEYS.ALLOSTATIC_LOAD;

type PolyvagalZone = 'ventral' | 'sympathetic' | 'dorsal';
type BabyState = 'calm' | 'aroused' | 'distressed';

interface ResonancePair {
  id: string;
  timestamp: string;
  parentZone: PolyvagalZone;
  babyState: BabyState;
  note?: string;
}

interface AllostaticLoad {
  id: string;
  timestamp: string;
  sleepDebt: number;
  illnessBurden: number;
  feedingStress: number;
  emotionalDysregulation: number;
}

const ZONE_COLORS: Record<PolyvagalZone, string> = {
  ventral: COLORS_CONST.ventralVagal,
  sympathetic: COLORS_CONST.sympathetic,
  dorsal: COLORS_CONST.dorsalVagal,
};

const BABY_STATE_COLORS: Record<BabyState, string> = {
  calm: COLORS_CONST.calm,
  aroused: COLORS_CONST.aroused,
  distressed: COLORS_CONST.distressed,
};

const ZONE_I18N: Record<PolyvagalZone, string> = {
  ventral: 'autonomicResonance.zone.ventral',
  sympathetic: 'autonomicResonance.zone.sympathetic',
  dorsal: 'autonomicResonance.zone.dorsal',
};

const BABY_STATE_I18N: Record<BabyState, string> = {
  calm: 'autonomicResonance.babyState.calm',
  aroused: 'autonomicResonance.babyState.aroused',
  distressed: 'autonomicResonance.babyState.distressed',
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const getLoadColor = (value: number): string => {
  if (value < 33) return COLORS_CONST.ventralVagal;
  if (value < 66) return COLORS_CONST.sympathetic;
  return COLORS_CONST.distressed;
};

const getLoadLabel = (value: number): 'low' | 'moderate' | 'high' => {
  if (value < 33) return 'low';
  if (value < 66) return 'moderate';
  return 'high';
};

interface GaugeProps {
  label: string;
  value: number;
  t: (key: string) => string;
}

const Gauge: React.FC<GaugeProps> = ({ label, value, t }) => {
  const color = getLoadColor(value);
  const level = getLoadLabel(value);

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={[styles.gaugeValue, { color }]}>{value}%</Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View style={[styles.gaugeFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.gaugeLevel, { color }]}>
        {t(`autonomicResonance.loadLevel.${level}`)}
      </Text>
    </View>
  );
};

interface ResonanceLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: ResonancePair) => void;
  t: (key: string) => string;
  initialParentZone?: PolyvagalZone;
  initialBabyState?: BabyState;
}

const ResonanceLogModal: React.FC<ResonanceLogModalProps> = ({
  visible,
  onClose,
  onSave,
  t,
  initialParentZone,
  initialBabyState,
}) => {
  const [parentZone, setParentZone] = useState<PolyvagalZone>(initialParentZone || 'ventral');
  const [babyState, setBabyState] = useState<BabyState>(initialBabyState || 'calm');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (initialParentZone) setParentZone(initialParentZone);
    if (initialBabyState) setBabyState(initialBabyState);
  }, [initialParentZone, initialBabyState]);

  const handleSave = () => {
    onSave({
      id: generateId(),
      timestamp: new Date().toISOString(),
      parentZone,
      babyState,
      note: note.trim() || undefined,
    });
    setNote('');
    onClose();
  };

  const zoneOptions: { value: PolyvagalZone; color: string; label: string }[] = [
    { value: 'ventral', color: COLORS_CONST.ventralVagal, label: t(ZONE_I18N.ventral) },
    { value: 'sympathetic', color: COLORS_CONST.sympathetic, label: t(ZONE_I18N.sympathetic) },
    { value: 'dorsal', color: COLORS_CONST.dorsalVagal, label: t(ZONE_I18N.dorsal) },
  ];

  const babyStateOptions: { value: BabyState; color: string; label: string }[] = [
    { value: 'calm', color: COLORS_CONST.calm, label: t(BABY_STATE_I18N.calm) },
    { value: 'aroused', color: COLORS_CONST.aroused, label: t(BABY_STATE_I18N.aroused) },
    { value: 'distressed', color: COLORS_CONST.distressed, label: t(BABY_STATE_I18N.distressed) },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('autonomicResonance.logResonance')}</Text>

          <Text style={styles.modalSectionLabel}>{t('autonomicResonance.parentZone')}:</Text>
          <View style={styles.chipRow}>
            {zoneOptions.map(opt => (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  parentZone === opt.value && { backgroundColor: opt.color },
                ]}
                onPress={() => setParentZone(opt.value)}
                accessibilityLabel={opt.label}
                accessibilityRole="button"
                accessibilityState={{ selected: parentZone === opt.value }}
              >
                <Text
                  style={[
                    styles.chipText,
                    parentZone === opt.value && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalSectionLabel}>{t('autonomicResonance.babyState')}:</Text>
          <View style={styles.chipRow}>
            {babyStateOptions.map(opt => (
              <Pressable
                key={opt.value}
                style={[
                  styles.chip,
                  babyState === opt.value && { backgroundColor: opt.color },
                ]}
                onPress={() => setBabyState(opt.value)}
                accessibilityLabel={opt.label}
                accessibilityRole="button"
                accessibilityState={{ selected: babyState === opt.value }}
              >
                <Text
                  style={[
                    styles.chipText,
                    babyState === opt.value && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={t('autonomicResonance.notePlaceholder') || 'Optional note...'}
            placeholderTextColor="#64748B"
            accessibilityLabel={t('autonomicResonance.noteLabel') || 'Note'}
          />

          <View style={styles.modalButtons}>
            <Pressable style={styles.cancelBtn} onPress={onClose} accessibilityLabel={t('common.cancel')}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave} accessibilityLabel={t('common.save')}>
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface AllostaticLoadModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: AllostaticLoad) => void;
  t: (key: string) => string;
}

const AllostaticLoadModal: React.FC<AllostaticLoadModalProps> = ({ visible, onClose, onSave, t }) => {
  const [sleepDebt, setSleepDebt] = useState(20);
  const [illnessBurden, setIllnessBurden] = useState(10);
  const [feedingStress, setFeedingStress] = useState(15);
  const [emotionalDysregulation, setEmotionalDysregulation] = useState(10);

  const handleSave = () => {
    onSave({
      id: generateId(),
      timestamp: new Date().toISOString(),
      sleepDebt,
      illnessBurden,
      feedingStress,
      emotionalDysregulation,
    });
    onClose();
  };

  const renderSlider = (
    label: string,
    value: number,
    onChange: (v: number) => void
  ) => (
    <View style={styles.loadSliderContainer}>
      <View style={styles.loadSliderHeader}>
        <Text style={styles.loadSliderLabel}>{label}</Text>
        <Text style={[styles.loadSliderValue, { color: getLoadColor(value) }]}>{value}</Text>
      </View>
      <View style={styles.loadSliderRow}>
        <Pressable
          style={styles.loadSliderBtn}
          onPress={() => onChange(Math.max(0, value - 5))}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={styles.loadSliderBtnText}>-5</Text>
        </Pressable>
        <View style={styles.loadSliderTrack}>
          <View style={[styles.loadSliderFill, { width: `${value}%`, backgroundColor: getLoadColor(value) }]} />
        </View>
        <Pressable
          style={styles.loadSliderBtn}
          onPress={() => onChange(Math.min(100, value + 5))}
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={styles.loadSliderBtnText}>+5</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('autonomicResonance.updateAllostaticLoad')}</Text>

          {renderSlider(t('autonomicResonance.sleepDebt'), sleepDebt, setSleepDebt)}
          {renderSlider(t('autonomicResonance.illnessBurden'), illnessBurden, setIllnessBurden)}
          {renderSlider(t('autonomicResonance.feedingStress'), feedingStress, setFeedingStress)}
          {renderSlider(t('autonomicResonance.emotionalDysregulation'), emotionalDysregulation, setEmotionalDysregulation)}

          <View style={styles.modalButtons}>
            <Pressable style={styles.cancelBtn} onPress={onClose} accessibilityLabel={t('common.cancel')}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={handleSave} accessibilityLabel={t('common.save')}>
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const VagalBrakePrompts: React.FC<{ t: (key: string) => string }> = ({ t }) => {
  const prompts = [
    { icon: '🌬️', title: t('autonomicResonance.breathingCue'), desc: t('autonomicResonance.breathingCueDesc') },
    { icon: '🎵', title: t('autonomicResonance.cooingCue'), desc: t('autonomicResonance.cooingCueDesc') },
    { icon: '🌊', title: t('autonomicResonance.vestibularCue'), desc: t('autonomicResonance.vestibularCueDesc') },
    { icon: '🤝', title: t('autonomicResonance.contingentCue'), desc: t('autonomicResonance.contingentCueDesc') },
  ];

  return (
    <View style={styles.vagalPromptsContainer}>
      <Text style={styles.vagalPromptsTitle}>{t('autonomicResonance.vagalBrakeTitle')}</Text>
      <Text style={styles.vagalPromptsSubtitle}>{t('autonomicResonance.vagalBrakeSubtitle')}</Text>
      {prompts.map((prompt, idx) => (
        <View key={idx} style={styles.vagalPromptCard}>
          <Text style={styles.vagalPromptIcon}>{prompt.icon}</Text>
          <View style={styles.vagalPromptText}>
            <Text style={styles.vagalPromptPromptTitle}>{prompt.title}</Text>
            <Text style={styles.vagalPromptDesc}>{prompt.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export default function AutonomicResonanceScreen() {
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const { t } = useLanguage();

  const ti = useCallback((key: string): string => {
    const translated = t(key);
    return translated === key ? key : translated;
  }, [t]);

  const [resonancePairs, setResonancePairs] = useState<ResonancePair[]>([]);
  const [allostaticLoads, setAllostaticLoads] = useState<AllostaticLoad[]>([]);

  const [logModalVisible, setLogModalVisible] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [distressedBabyLogModal, setDistressedBabyLogModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pairs, loads] = await Promise.all([
        safeGetItem(RESONANCE_PAIRS_KEY),
        safeGetItem(ALLOSTATIC_LOAD_KEY),
      ]);
      if (pairs) setResonancePairs(JSON.parse(pairs));
      if (loads) setAllostaticLoads(JSON.parse(loads));
    } catch {
      // Silent fail
    }
  };

  const saveResonancePair = async (entry: ResonancePair) => {
    const updated = [entry, ...resonancePairs];
    setResonancePairs(updated);
    await safeSetItem(RESONANCE_PAIRS_KEY, JSON.stringify(updated));
  };

  const saveAllostaticLoad = async (entry: AllostaticLoad) => {
    const updated = [entry, ...allostaticLoads];
    setAllostaticLoads(updated);
    await safeSetItem(ALLOSTATIC_LOAD_KEY, JSON.stringify(updated));
  };

  const calculateCouplingScore = (): number => {
    if (resonancePairs.length < 7) return 0;

    const pairs = resonancePairs.slice(0, 50);
    let ventralFollowedByImprovement = 0;
    let ventralCount = 0;

    for (let i = 0; i < pairs.length - 1; i++) {
      if (pairs[i].parentZone === 'ventral') {
        ventralCount++;
        const currentTime = new Date(pairs[i].timestamp).getTime();
        const next5min = pairs.filter((p, j) => {
          const pTime = new Date(p.timestamp).getTime();
          return j > i && pTime - currentTime <= 5 * 60 * 1000;
        });

        const babyImproved = next5min.some(p => {
          const stateOrder: Record<BabyState, number> = { distressed: 0, aroused: 1, calm: 2 };
          return stateOrder[p.babyState] > stateOrder[pairs[i].babyState];
        });

        if (babyImproved) ventralFollowedByImprovement++;
      }
    }

    return ventralCount > 0 ? Math.round((ventralFollowedByImprovement / ventralCount) * 100) : 0;
  };

  const getRecentZoneDistribution = (): Record<PolyvagalZone, number> => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const recent = resonancePairs.filter(p => new Date(p.timestamp) >= cutoff);

    const total = recent.length || 1;
    return {
      ventral: (recent.filter(p => p.parentZone === 'ventral').length / total) * 100,
      sympathetic: (recent.filter(p => p.parentZone === 'sympathetic').length / total) * 100,
      dorsal: (recent.filter(p => p.parentZone === 'dorsal').length / total) * 100,
    };
  };

  const getCompassionFatigueRisk = (): boolean => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const recent = resonancePairs.filter(p => new Date(p.timestamp) >= cutoff);

    if (recent.length < 7) return false;

    const dorsalOrSympathetic = recent.filter(p => p.parentZone === 'dorsal' || p.parentZone === 'sympathetic').length;
    return dorsalOrSympathetic / recent.length > 0.7;
  };

  const getReferralIndicator = (): boolean => {
    if (resonancePairs.length < 7) return false;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const recent = resonancePairs.filter(p => new Date(p.timestamp) >= cutoff);

    const ventralEntries = recent.filter(p => p.parentZone === 'ventral');
    if (ventralEntries.length < 3) return false;

    const babyNotResponding = ventralEntries.filter(v => {
      const vTime = new Date(v.timestamp).getTime();
      const afterVentral = recent.filter((p, i) => {
        const pTime = new Date(p.timestamp).getTime();
        return i > recent.indexOf(v) && pTime - vTime <= 5 * 60 * 1000;
      });
      return afterVentral.length > 0 && afterVentral.every(p => p.babyState === 'distressed' || p.babyState === 'aroused');
    });

    return babyNotResponding.length / ventralEntries.length > 0.6;
  };

  const latestAllostatic = allostaticLoads[0];
  const avgLoad = latestAllostatic
    ? Math.round(
        (latestAllostatic.sleepDebt +
          latestAllostatic.illnessBurden +
          latestAllostatic.feedingStress +
          latestAllostatic.emotionalDysregulation) /
          4
      )
    : 0;

  const couplingScore = calculateCouplingScore();
  const zoneDist = getRecentZoneDistribution();
  const compassionFatigueRisk = getCompassionFatigueRisk();
  const referralIndicator = getReferralIndicator();
  const showVagalBrakePrompt = resonancePairs.length > 0 && resonancePairs[0].babyState === 'distressed';

  const renderTimeline = () => {
    const days: { date: Date; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date,
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }

    const chartHeight = 100;

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>{t('autonomicResonance.resonanceTimeline')}</Text>

        <View style={styles.timelineChart}>
          {days.map((day, idx) => {
            const dayPairs = resonancePairs.filter(p => {
              const pDate = new Date(p.timestamp);
              return (
                pDate.getDate() === day.date.getDate() &&
                pDate.getMonth() === day.date.getMonth() &&
                pDate.getFullYear() === day.date.getFullYear()
              );
            });

            const latestPair = dayPairs[0];
            const parentHeight = latestPair
              ? (zoneDist[latestPair.parentZone] / 100) * chartHeight
              : 0;
            const parentColor = latestPair ? ZONE_COLORS[latestPair.parentZone] : '#334155';

            const babyHeight = latestPair
              ? (BABY_STATE_COLORS[latestPair.babyState] ? 30 : 0)
              : 0;

            return (
              <View key={idx} style={styles.timelineBar}>
                <View style={styles.timelineBars}>
                  <View
                    style={[
                      styles.timelineParentBar,
                      { height: parentHeight, backgroundColor: parentColor },
                    ]}
                  />
                </View>
                <Text style={styles.timelineDateLabel}>{day.label.split(' ')[1]}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS_CONST.ventralVagal }]} />
            <Text style={styles.legendText}>{ti(ZONE_I18N.ventral)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS_CONST.sympathetic }]} />
            <Text style={styles.legendText}>{ti(ZONE_I18N.sympathetic)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS_CONST.dorsalVagal }]} />
            <Text style={styles.legendText}>{ti(ZONE_I18N.dorsal)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>{t('autonomicResonance.title')}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>{t('autonomicResonance.subtitle')}</Text>
        </View>

        <View style={styles.navLinks}>
          <Link href="/polyvagal-dashboard" style={styles.navLink}>
            <Text style={styles.navLinkText}>{t('autonomicResonance.parentPolyvagal')}</Text>
          </Link>
          <Link href="/autonomic-readiness" style={styles.navLink}>
            <Text style={styles.navLinkText}>{t('autonomicResonance.babyAutonomic')}</Text>
          </Link>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('autonomicResonance.resonanceLogger')}</Text>

          <View style={styles.zoneSelector}>
            <Text style={styles.selectorLabel}>{t('autonomicResonance.parentZone')}:</Text>
            <View style={styles.chipRow}>
              {(['ventral', 'sympathetic', 'dorsal'] as PolyvagalZone[]).map(zone => (
                <Pressable
                  key={zone}
                  style={[styles.chip, { borderColor: ZONE_COLORS[zone] }]}
                  onPress={() => {
                    saveResonancePair({
                      id: generateId(),
                      timestamp: new Date().toISOString(),
                      parentZone: zone,
                      babyState: 'calm',
                    });
                  }}
                  accessibilityLabel={ti(ZONE_I18N[zone])}
                  accessibilityRole="button"
                >
                  <View style={[styles.zoneDot, { backgroundColor: ZONE_COLORS[zone] }]} />
                  <Text style={styles.chipText}>{ti(ZONE_I18N[zone])}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.babyStateSelector}>
            <Text style={styles.selectorLabel}>{t('autonomicResonance.babyState')}:</Text>
            <View style={styles.chipRow}>
              {(['calm', 'aroused', 'distressed'] as BabyState[]).map(state => (
                <Pressable
                  key={state}
                  style={[styles.chip, { borderColor: BABY_STATE_COLORS[state] }]}
                  onPress={() => {
                    saveResonancePair({
                      id: generateId(),
                      timestamp: new Date().toISOString(),
                      parentZone: 'ventral',
                      babyState: state,
                    });
                  }}
                  accessibilityLabel={ti(BABY_STATE_I18N[state])}
                  accessibilityRole="button"
                >
                  <View style={[styles.zoneDot, { backgroundColor: BABY_STATE_COLORS[state] }]} />
                  <Text style={styles.chipText}>{ti(BABY_STATE_I18N[state])}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={styles.logButton}
            onPress={() => setLogModalVisible(true)}
            accessibilityLabel={t('autonomicResonance.logPair')}
          >
            <Text style={styles.logButtonText}>{t('autonomicResonance.logPair')}</Text>
          </Pressable>

          {resonancePairs.length > 0 && (
            <View style={styles.recentPairs}>
              <Text style={styles.recentPairsTitle}>{t('autonomicResonance.recentPairs')}:</Text>
              {resonancePairs.slice(0, 3).map(pair => (
                <View key={pair.id} style={styles.pairRow}>
                  <Text style={styles.pairTime}>
                    {new Date(pair.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <View style={[styles.pairDot, { backgroundColor: ZONE_COLORS[pair.parentZone] }]} />
                  <Text style={styles.pairZone}>{ti(ZONE_I18N[pair.parentZone])}</Text>
                  <Text style={styles.pairArrow}>→</Text>
                  <View style={[styles.pairDot, { backgroundColor: BABY_STATE_COLORS[pair.babyState] }]} />
                  <Text style={styles.pairBaby}>{ti(BABY_STATE_I18N[pair.babyState])}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('autonomicResonance.couplingStrength')}</Text>

          {resonancePairs.length >= 7 ? (
            <View style={styles.couplingContainer}>
              <View style={[styles.couplingCircle, { borderColor: couplingScore >= 60 ? COLORS_CONST.ventralVagal : couplingScore >= 40 ? COLORS_CONST.sympathetic : COLORS_CONST.dorsalVagal }]}>
                <Text style={[styles.couplingValue, { color: couplingScore >= 60 ? COLORS_CONST.ventralVagal : couplingScore >= 40 ? COLORS_CONST.sympathetic : COLORS_CONST.dorsalVagal }]}>
                  {couplingScore}%
                </Text>
                <Text style={styles.couplingLabel}>{t('autonomicResonance.couplingLabel')}</Text>
              </View>
              <Text style={styles.couplingDesc}>
                {t('autonomicResonance.couplingDesc')}
              </Text>
            </View>
          ) : (
            <View style={styles.couplingContainer}>
              <Text style={styles.couplingNeedMore}>
                {t('autonomicResonance.needMorePairs')} ({resonancePairs.length}/7)
              </Text>
              <View style={styles.couplingProgress}>
                <View style={[styles.couplingProgressFill, { width: `${(resonancePairs.length / 7) * 100}%` }]} />
              </View>
            </View>
          )}
        </View>


        {showVagalBrakePrompt && (
          <View style={styles.section}>
            <VagalBrakePrompts t={ti} />
          </View>
        )}

        <View style={styles.section}>
          {renderTimeline()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('autonomicResonance.allostaticLoad')}</Text>

          <View style={styles.loadGrid}>
            <Gauge
              label={t('autonomicResonance.sleepDebt')}
              value={latestAllostatic?.sleepDebt || 0}
              t={ti}
            />
            <Gauge
              label={t('autonomicResonance.illnessBurden')}
              value={latestAllostatic?.illnessBurden || 0}
              t={ti}
            />
            <Gauge
              label={t('autonomicResonance.feedingStress')}
              value={latestAllostatic?.feedingStress || 0}
              t={ti}
            />
            <Gauge
              label={t('autonomicResonance.emotionalDysregulation')}
              value={latestAllostatic?.emotionalDysregulation || 0}
              t={ti}
            />
          </View>

          <View style={styles.avgLoadContainer}>
            <Text style={styles.avgLoadLabel}>{t('autonomicResonance.avgLoad')}</Text>
            <View style={[styles.avgLoadCircle, { borderColor: getLoadColor(avgLoad) }]}>
              <Text style={[styles.avgLoadValue, { color: getLoadColor(avgLoad) }]}>{avgLoad}</Text>
            </View>
          </View>

          <Pressable
            style={styles.logButton}
            onPress={() => setLoadModalVisible(true)}
            accessibilityLabel={t('autonomicResonance.updateLoad')}
          >
            <Text style={styles.logButtonText}>{t('autonomicResonance.updateLoad')}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('autonomicResonance.resonanceAlert')}</Text>

          {compassionFatigueRisk && (
            <View style={[styles.alertCard, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: COLORS_CONST.distressed }]}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertTitle}>{t('autonomicResonance.compassionFatigueTitle')}</Text>
              <Text style={styles.alertText}>{t('autonomicResonance.compassionFatigueDesc')}</Text>
            </View>
          )}

          {referralIndicator && (
            <View style={[styles.alertCard, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: COLORS_CONST.sympathetic }]}>
              <Text style={styles.alertIcon}>📋</Text>
              <Text style={styles.alertTitle}>{t('autonomicResonance.referralTitle')}</Text>
              <Text style={styles.alertText}>{t('autonomicResonance.referralDesc')}</Text>
            </View>
          )}

          {!compassionFatigueRisk && !referralIndicator && (
            <View style={styles.noAlertsCard}>
              <Text style={styles.noAlertsIcon}>✅</Text>
              <Text style={styles.noAlertsText}>{t('autonomicResonance.noAlerts')}</Text>
            </View>
          )}
        </View>

        <ResonanceLogModal
          visible={logModalVisible}
          onClose={() => setLogModalVisible(false)}
          onSave={saveResonancePair}
          t={ti}
        />

        <AllostaticLoadModal
          visible={loadModalVisible}
          onClose={() => setLoadModalVisible(false)}
          onSave={saveAllostaticLoad}
          t={ti}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 4 },
  navLinks: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 },
  navLink: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS_CONST.card, borderRadius: 8 },
  navLinkText: { color: COLORS_CONST.textSecondary, fontSize: 12 },

  section: { backgroundColor: COLORS_CONST.card, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS_CONST.textPrimary, marginBottom: 12 },

  zoneSelector: { marginBottom: 12 },
  babyStateSelector: { marginBottom: 12 },
  selectorLabel: { fontSize: 14, color: COLORS_CONST.textSecondary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#334155',
    borderWidth: 1,
    gap: 6,
  },
  chipText: { fontSize: 13, color: COLORS_CONST.textPrimary },
  chipTextActive: { fontWeight: '600' },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },

  logButton: { backgroundColor: COLORS_CONST.ventralVagal, borderRadius: 10, padding: 14, alignItems: 'center' },
  logButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  recentPairs: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  recentPairsTitle: { fontSize: 13, color: COLORS_CONST.textSecondary, marginBottom: 8 },
  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  pairTime: { fontSize: 11, color: COLORS_CONST.textSecondary, minWidth: 50 },
  pairDot: { width: 6, height: 6, borderRadius: 3 },
  pairZone: { fontSize: 12, color: COLORS_CONST.textPrimary },
  pairArrow: { fontSize: 12, color: COLORS_CONST.textSecondary },
  pairBaby: { fontSize: 12, color: COLORS_CONST.textPrimary },

  couplingContainer: { alignItems: 'center', paddingVertical: 8 },
  couplingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  couplingValue: { fontSize: 32, fontWeight: '700' },
  couplingLabel: { fontSize: 12, color: COLORS_CONST.textSecondary, marginTop: 4 },
  couplingDesc: { fontSize: 13, color: COLORS_CONST.textSecondary, textAlign: 'center' },
  couplingNeedMore: { fontSize: 14, color: COLORS_CONST.textSecondary, marginBottom: 8 },
  couplingProgress: { width: '80%', height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  couplingProgressFill: { height: '100%', backgroundColor: COLORS_CONST.ventralVagal },

  vagalPromptsContainer: { paddingVertical: 8 },
  vagalPromptsTitle: { fontSize: 16, fontWeight: '600', color: COLORS_CONST.textPrimary, marginBottom: 4 },
  vagalPromptsSubtitle: { fontSize: 13, color: COLORS_CONST.textSecondary, marginBottom: 16 },
  vagalPromptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 12, padding: 12, marginBottom: 10 },
  vagalPromptIcon: { fontSize: 24, marginRight: 12 },
  vagalPromptText: { flex: 1 },
  vagalPromptPromptTitle: { fontSize: 14, fontWeight: '600', color: COLORS_CONST.textPrimary, marginBottom: 2 },
  vagalPromptDesc: { fontSize: 12, color: COLORS_CONST.textSecondary },

  timelineContainer: { paddingVertical: 8 },
  timelineTitle: { fontSize: 16, fontWeight: '600', color: COLORS_CONST.textPrimary, marginBottom: 16 },
  timelineChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120, paddingTop: 20 },
  timelineBar: { alignItems: 'center', flex: 1 },
  timelineBars: { height: 100, justifyContent: 'flex-end' },
  timelineParentBar: { width: 16, borderRadius: 4, minHeight: 4 },
  timelineDateLabel: { fontSize: 10, color: COLORS_CONST.textSecondary, marginTop: 4 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: COLORS_CONST.textSecondary },

  loadGrid: { marginBottom: 16 },
  gaugeContainer: { marginBottom: 16 },
  gaugeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gaugeLabel: { fontSize: 14, color: COLORS_CONST.textSecondary },
  gaugeValue: { fontSize: 18, fontWeight: '700' },
  gaugeTrack: { height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 4 },
  gaugeLevel: { fontSize: 12, marginTop: 4, textAlign: 'right' },

  avgLoadContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 },
  avgLoadLabel: { fontSize: 14, color: COLORS_CONST.textSecondary },
  avgLoadCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  avgLoadValue: { fontSize: 20, fontWeight: '700' },

  alertCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  alertIcon: { fontSize: 24, marginBottom: 8 },
  alertTitle: { fontSize: 15, fontWeight: '600', color: COLORS_CONST.textPrimary, marginBottom: 4 },
  alertText: { fontSize: 13, color: COLORS_CONST.textSecondary },

  noAlertsCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 12, padding: 16, gap: 12 },
  noAlertsIcon: { fontSize: 20 },
  noAlertsText: { fontSize: 14, color: COLORS_CONST.ventralVagal, flex: 1 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 20 },
  modalSectionLabel: { fontSize: 14, color: COLORS_CONST.textSecondary, marginTop: 12, marginBottom: 8 },
  noteInput: { backgroundColor: '#334155', borderRadius: 8, padding: 12, color: COLORS_CONST.textPrimary, fontSize: 14, marginTop: 16, minHeight: 60, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#334155', alignItems: 'center' },
  cancelBtnText: { color: COLORS_CONST.textSecondary, fontSize: 16 },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: COLORS_CONST.ventralVagal, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  loadSliderContainer: { marginBottom: 16 },
  loadSliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  loadSliderLabel: { fontSize: 14, color: COLORS_CONST.textSecondary, flex: 1 },
  loadSliderValue: { fontSize: 18, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  loadSliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadSliderBtn: { width: 44, height: 44, backgroundColor: '#334155', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  loadSliderBtnText: { color: COLORS_CONST.textPrimary, fontSize: 16, fontWeight: '600' },
  loadSliderTrack: { flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  loadSliderFill: { height: '100%', borderRadius: 4 },
});

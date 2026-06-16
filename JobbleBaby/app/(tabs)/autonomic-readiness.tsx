import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { STORAGE_KEYS } from '../../store/storage-keys';

interface AutonomicEntry {
  id: string;
  timestamp: string;
  date: string;
  autonomic_stability_score: number;
  vagal_tone_proxy: number;
  stress_response_tracking: number;
  brainstem_maturation_index: number;
  phase_transition_readiness: number;
  notes?: string;
}

const SCORE_COLORS = {
  high: '#4CAF50',
  medium: '#FFC107',
  low: '#F44336',
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return SCORE_COLORS.high;
  if (score >= 50) return SCORE_COLORS.medium;
  return SCORE_COLORS.low;
};

const getScoreLabel = (score: number): 'optimal' | 'developing' | 'concerning' => {
  if (score >= 80) return 'optimal';
  if (score >= 50) return 'developing';
  return 'concerning';
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const loadAutonomicData = async (): Promise<AutonomicEntry[]> => {
  try {
    const data = await safeGetItem(STORAGE_KEYS.AUTONOMIC_READINESS);
    if (data) {
      const parsed: AutonomicEntry[] = JSON.parse(data);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      return parsed.filter((e) => new Date(e.date) >= cutoff);
    }
  } catch {
    // Silent fail
  }
  return [];
};

const saveAutonomicData = async (entries: AutonomicEntry[]): Promise<void> => {
  try {
    await safeSetItem(STORAGE_KEYS.AUTONOMIC_READINESS, JSON.stringify(entries));
  } catch {
    // Silent fail
  }
};

const MetricSlider: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  t: (key: string) => string;
  color: string;
}> = ({ label, value, onChange, t, color }) => (
  <View style={styles.sliderContainer}>
    <View style={styles.sliderHeader}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <Text style={[styles.sliderValue, { color: getScoreColor(value) }]}>{value}</Text>
    </View>
    <View style={styles.sliderRow}>
      <TouchableOpacity
        style={styles.sliderBtn}
        onPress={() => onChange(Math.max(0, value - 5))}
        accessibilityLabel={`Decrease ${label}`}
      >
        <Text style={styles.sliderBtnText}>-5</Text>
      </TouchableOpacity>
      <View style={[styles.sliderTrack, { backgroundColor: color }]}>
        <View style={[styles.sliderFill, { width: `${value}%`, backgroundColor: getScoreColor(value) }]} />
      </View>
      <TouchableOpacity
        style={styles.sliderBtn}
        onPress={() => onChange(Math.min(100, value + 5))}
        accessibilityLabel={`Increase ${label}`}
      >
        <Text style={styles.sliderBtnText}>+5</Text>
      </TouchableOpacity>
    </View>
    <Text style={styles.sliderStatus}>{t(`autonomicReadiness.status.${getScoreLabel(value)}`)}</Text>
  </View>
);

const QuickLogModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (entry: AutonomicEntry) => void;
  t: (key: string) => string;
}> = ({ visible, onClose, onSave, t }) => {
  const [autonomicStability, setAutonomicStability] = useState(70);
  const [vagalTone, setVagalTone] = useState(70);
  const [stressResponse, setStressResponse] = useState(70);
  const [brainstemMaturation, setBrainstemMaturation] = useState(70);
  const [phaseTransition, setPhaseTransition] = useState(70);

  const handleSave = () => {
    onSave({
      id: generateId(),
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      autonomic_stability_score: autonomicStability,
      vagal_tone_proxy: vagalTone,
      stress_response_tracking: stressResponse,
      brainstem_maturation_index: brainstemMaturation,
      phase_transition_readiness: phaseTransition,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('autonomicReadiness.daily_checkin')}</Text>

          <MetricSlider
            label={t('autonomicReadiness.autonomic_stability')}
            value={autonomicStability}
            onChange={setAutonomicStability}
            t={t}
            color="#4A90D9"
          />

          <MetricSlider
            label={t('autonomicReadiness.vagal_tone')}
            value={vagalTone}
            onChange={setVagalTone}
            t={t}
            color="#7B68EE"
          />

          <MetricSlider
            label={t('autonomicReadiness.stress_response')}
            value={stressResponse}
            onChange={setStressResponse}
            t={t}
            color="#20B2AA"
          />

          <MetricSlider
            label={t('autonomicReadiness.brainstem_maturation')}
            value={brainstemMaturation}
            onChange={setBrainstemMaturation}
            t={t}
            color="#FF6B6B"
          />

          <MetricSlider
            label={t('autonomicReadiness.phase_transition')}
            value={phaseTransition}
            onChange={setPhaseTransition}
            t={t}
            color="#F59E0B"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} accessibilityLabel={t('common.cancel')}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} accessibilityLabel={t('common.save')}>
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TrendChart: React.FC<{ entries: AutonomicEntry[]; t: (key: string) => string }> = ({ entries, t }) => {
  const last7 = entries.slice(-7);
  if (last7.length < 2) {
    return <Text style={styles.noDataText}>{t('autonomicReadiness.data_required')}</Text>;
  }
  const chartHeight = 80;
  return (
    <View style={styles.trendContainer}>
      <Text style={styles.trendTitle}>{t('autonomicReadiness.7day_trend')}</Text>
      <View style={styles.trendChart}>
        {last7.map((entry, i) => {
          const avgScore = Math.round(
            (entry.autonomic_stability_score +
              entry.vagal_tone_proxy +
              entry.stress_response_tracking +
              entry.brainstem_maturation_index +
              entry.phase_transition_readiness) /
              5
          );
          const height = (avgScore / 100) * chartHeight;
          return (
            <View key={i} style={styles.trendBar}>
              <View style={[styles.trendBarFill, { height, backgroundColor: getScoreColor(avgScore) }]} />
              <Text style={styles.trendDate}>{entry.date.split('-')[2]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const MetricCard: React.FC<{
  label: string;
  score: number;
  color: string;
  t: (key: string) => string;
}> = ({ label, score, color, t }) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.metricScoreRow}>
      <View style={[styles.metricScoreCircle, { borderColor: getScoreColor(score) }]}>
        <Text style={[styles.metricScoreValue, { color: getScoreColor(score) }]}>{score}</Text>
      </View>
      <Text style={styles.metricStatus}>{t(`autonomicReadiness.status.${getScoreLabel(score)}`)}</Text>
    </View>
  </View>
);

export default function AutonomicReadinessScreen() {
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const { t } = useLanguage();
  const [entries, setEntries] = useState<AutonomicEntry[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [todayLogged, setTodayLogged] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadAutonomicData();
    setEntries(data);
    const today = new Date().toISOString().split('T')[0];
    setTodayLogged(data.some((e) => e.date === today));
  };

  const handleSaveEntry = async (entry: AutonomicEntry) => {
    const allEntries = await loadAutonomicData();
    const filtered = allEntries.filter((e) => e.date !== entry.date);
    const updated = [...filtered, entry].slice(-90);
    await saveAutonomicData(updated);
    setEntries(updated);
    setTodayLogged(true);
  };

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  const avgScore = latestEntry
    ? Math.round(
        (latestEntry.autonomic_stability_score +
          latestEntry.vagal_tone_proxy +
          latestEntry.stress_response_tracking +
          latestEntry.brainstem_maturation_index +
          latestEntry.phase_transition_readiness) /
          5
      )
    : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>{t('autonomicReadiness.title')}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>{t('autonomicReadiness.subtitle')}</Text>
        </View>

        <View style={styles.scoreCircleContainer}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(avgScore) }]}>
            <Text style={[styles.scoreValue, { color: getScoreColor(avgScore) }]}>{avgScore || '--'}</Text>
            <Text style={styles.scoreLabel}>{t('autonomicReadiness.composite')}</Text>
          </View>
        </View>

        {latestEntry ? (
          <View style={styles.metricsGrid}>
            <MetricCard
              label={t('autonomicReadiness.autonomic_stability')}
              score={latestEntry.autonomic_stability_score}
              color="#4A90D9"
              t={t}
            />
            <MetricCard
              label={t('autonomicReadiness.vagal_tone')}
              score={latestEntry.vagal_tone_proxy}
              color="#7B68EE"
              t={t}
            />
            <MetricCard
              label={t('autonomicReadiness.stress_response')}
              score={latestEntry.stress_response_tracking}
              color="#20B2AA"
              t={t}
            />
            <MetricCard
              label={t('autonomicReadiness.brainstem_maturation')}
              score={latestEntry.brainstem_maturation_index}
              color="#FF6B6B"
              t={t}
            />
            <MetricCard
              label={t('autonomicReadiness.phase_transition')}
              score={latestEntry.phase_transition_readiness}
              color="#F59E0B"
              t={t}
            />
          </View>
        ) : (
          <Text style={styles.noDataText}>{t('autonomicReadiness.no_data')}</Text>
        )}

        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: C.accent }]}
          onPress={() => setModalVisible(true)}
          accessibilityLabel={t('autonomicReadiness.log_today')}
        >
          <Text style={styles.logButtonText}>
            {todayLogged ? t('autonomicReadiness.update_today') : t('autonomicReadiness.log_today')}
          </Text>
        </TouchableOpacity>

        <TrendChart entries={entries} t={t} />

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🧠</Text>
          <Text style={styles.infoTitle}>{t('autonomicReadiness.info_title')}</Text>
          <Text style={styles.infoText}>{t('autonomicReadiness.info_description')}</Text>
        </View>

        <QuickLogModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveEntry}
          t={t}
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
  scoreCircleContainer: { alignItems: 'center', marginBottom: 20 },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: { fontSize: 36, fontWeight: '700' },
  scoreLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  metricsGrid: { marginBottom: 20 },
  metricCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  metricLabel: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  metricScoreRow: { flexDirection: 'row', alignItems: 'center' },
  metricScoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricScoreValue: { fontSize: 16, fontWeight: '700' },
  metricStatus: { fontSize: 14, color: '#888' },
  logButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  logButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  trendContainer: { marginBottom: 20 },
  trendTitle: { fontSize: 14, color: '#888', marginBottom: 8 },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    paddingTop: 20,
  },
  trendBar: { alignItems: 'center' },
  trendBarFill: { width: 24, borderRadius: 4, marginBottom: 4 },
  trendDate: { fontSize: 10, color: '#666' },
  noDataText: { color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  infoIcon: { fontSize: 32, marginBottom: 8 },
  infoTitle: { fontSize: 16, fontWeight: '600', color: '#F8FAFC', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 20 },
  sliderContainer: { marginBottom: 16 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderLabel: { fontSize: 14, color: '#aaa', flex: 1 },
  sliderValue: { fontSize: 18, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderBtn: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sliderTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 4 },
  sliderStatus: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'right' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontSize: 16 },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#4A90D9',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

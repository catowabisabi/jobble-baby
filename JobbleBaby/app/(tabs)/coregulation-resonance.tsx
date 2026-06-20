import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { STORAGE_KEYS } from '../../store/storage-keys';

interface CoRegulationSession {
  id: string;
  timestamp: string;
  date: string;
  duration: number;
  parentHR: number;
  babyHR: number;
  activity: 'holding' | 'feeding' | 'play' | 'soothing' | 'nappyChange';
  quality: number;
  notes: string;
}

const DURATION_OPTIONS = [5, 10, 15, 20, 30];
const ACTIVITY_OPTIONS: Array<{ key: 'holding' | 'feeding' | 'play' | 'soothing' | 'nappyChange'; labelKey: string }> = [
  { key: 'holding', labelKey: 'holding' },
  { key: 'feeding', labelKey: 'feeding' },
  { key: 'play', labelKey: 'play' },
  { key: 'soothing', labelKey: 'soothing' },
  { key: 'nappyChange', labelKey: 'nappyChange' },
];

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const loadSessions = async (): Promise<CoRegulationSession[]> => {
  try {
    const data = await safeGetItem(STORAGE_KEYS.COREGULATION_SESSION_LOG);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Silent fail
  }
  return [];
};

const saveSessions = async (sessions: CoRegulationSession[]): Promise<void> => {
  try {
    await safeSetItem(STORAGE_KEYS.COREGULATION_SESSION_LOG, JSON.stringify(sessions));
  } catch {
    // Silent fail
  }
};

const calculateResonanceScore = (sessions: CoRegulationSession[]): number => {
  if (sessions.length === 0) return 0;

  const recentSessions = sessions.slice(-7);
  let totalScore = 0;

  for (const session of recentSessions) {
    const hrRatio = session.babyHR / session.parentHR;
    const proximityScore = Math.max(0, 100 - Math.abs(1 - hrRatio) * 100);
    const durationBonus = Math.min(10, session.duration / 5);
    const qualityBonus = (session.quality - 1) * 5;
    
    totalScore += proximityScore + durationBonus + qualityBonus;
  }

  return Math.min(100, Math.round(totalScore / recentSessions.length));
};

const getTrend = (sessions: CoRegulationSession[]): 'up' | 'down' | 'stable' => {
  if (sessions.length < 4) return 'stable';
  
  const recent = sessions.slice(-3);
  const earlier = sessions.slice(-6, -3);
  
  if (earlier.length === 0) return 'stable';
  
  const recentAvg = calculateResonanceScore(recent);
  const earlierAvg = calculateResonanceScore(earlier);
  
  if (recentAvg > earlierAvg + 5) return 'up';
  if (recentAvg < earlierAvg - 5) return 'down';
  return 'stable';
};

const calculateCortisolRisk = (sessions: CoRegulationSession[]): 'none' | 'amber' | 'red' => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const weekSessions = sessions.filter(s => new Date(s.timestamp) >= weekAgo);
  const highStressSessions = weekSessions.filter(s => s.parentHR > 100);
  const veryHighStressSessions = weekSessions.filter(s => s.parentHR > 110);
  
  if (veryHighStressSessions.length >= 5) return 'red';
  if (highStressSessions.length >= 3) return 'amber';
  return 'none';
};

const SessionLoggerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (session: CoRegulationSession) => void;
  t: (key: string) => string;
}> = ({ visible, onClose, onSave, t }) => {
  const [duration, setDuration] = useState(10);
  const [parentHR, setParentHR] = useState('');
  const [babyHR, setBabyHR] = useState('');
  const [activity, setActivity] = useState<'holding' | 'feeding' | 'play' | 'soothing' | 'nappyChange'>('holding');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const parentHRNum = parseInt(parentHR, 10);
    const babyHRNum = parseInt(babyHR, 10);
    
    if (isNaN(parentHRNum) || isNaN(babyHRNum) || parentHRNum < 40 || parentHRNum > 200 || babyHRNum < 40 || babyHRNum > 200) {
      Alert.alert('Invalid Input', 'Please enter valid heart rates (40-200 BPM)');
      return;
    }

    onSave({
      id: generateId(),
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      duration,
      parentHR: parentHRNum,
      babyHR: babyHRNum,
      activity,
      quality,
      notes,
    });
    
    setDuration(10);
    setParentHR('');
    setBabyHR('');
    setActivity('holding');
    setQuality(3);
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('coregulationResonance.sectionA.sessionLogger')}</Text>
          
          <Text style={styles.inputLabel}>{t('coregulationResonance.sectionA.duration')}</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.durationBtn, duration === d && styles.durationBtnActive]}
                onPress={() => setDuration(d)}
              >
                <Text style={[styles.durationBtnText, duration === d && styles.durationBtnTextActive]}>
                  {d} {t('coregulationResonance.sectionA.minutes')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>{t('coregulationResonance.sectionA.parentHR')} (BPM)</Text>
          <TextInput
            style={styles.input}
            value={parentHR}
            onChangeText={setParentHR}
            keyboardType="numeric"
            placeholder="70"
            placeholderTextColor="#666"
          />

          <Text style={styles.inputLabel}>{t('coregulationResonance.sectionA.babyHR')} (BPM)</Text>
          <TextInput
            style={styles.input}
            value={babyHR}
            onChangeText={setBabyHR}
            keyboardType="numeric"
            placeholder="120"
            placeholderTextColor="#666"
          />

          <Text style={styles.inputLabel}>{t('coregulationResonance.sectionA.activity')}</Text>
          <View style={styles.activityRow}>
            {ACTIVITY_OPTIONS.map((act) => (
              <TouchableOpacity
                key={act.key}
                style={[styles.activityBtn, activity === act.key && styles.activityBtnActive]}
                onPress={() => setActivity(act.key)}
              >
                <Text style={[styles.activityBtnText, activity === act.key && styles.activityBtnTextActive]}>
                  {t(`coregulationResonance.activity.${act.labelKey}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>{t('coregulationResonance.sectionA.quality')}</Text>
          <View style={styles.qualityRow}>
            {[1, 2, 3, 4, 5].map((q) => (
              <TouchableOpacity key={q} onPress={() => setQuality(q)} style={styles.starBtn}>
                <Text style={[styles.starText, q <= quality && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>{t('coregulationResonance.sectionA.notes')}</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('coregulationResonance.sectionA.notes')}
            placeholderTextColor="#666"
            multiline
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{t('coregulationResonance.sectionA.saveSession')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TrendChart: React.FC<{ sessions: CoRegulationSession[]; t: (key: string) => string }> = ({ sessions, t }) => {
  const last7 = sessions.slice(-7);
  
  if (last7.length < 2) {
    return <Text style={styles.noDataText}>{t('coregulationResonance.sectionD.noSessions')}</Text>;
  }

  const chartHeight = 80;
  const maxScore = 100;

  return (
    <View style={styles.trendContainer}>
      <Text style={styles.trendTitle}>{t('coregulationResonance.sectionB.sevenDayAverage')}</Text>
      <View style={styles.trendChart}>
        {last7.map((session, i) => {
          const hrRatio = session.babyHR / session.parentHR;
          const score = Math.min(100, Math.max(0, (1 - Math.abs(1 - hrRatio)) * 100 + (session.quality - 1) * 10));
          const height = (score / maxScore) * chartHeight;
          
          return (
            <View key={i} style={styles.trendBar}>
              <View style={[styles.trendBarFill, { height, backgroundColor: score >= 70 ? '#4CAF50' : score >= 40 ? '#FFC107' : '#F44336' }]} />
              <Text style={styles.trendDate}>{session.date.split('-')[2]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const SessionCard: React.FC<{
  session: CoRegulationSession;
  t: (key: string) => string;
  expanded: boolean;
  onToggle: () => void;
}> = ({ session, t, expanded, onToggle }) => {
  const hrRatio = (session.babyHR / session.parentHR).toFixed(2);
  const date = new Date(session.timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <TouchableOpacity style={styles.sessionCard} onPress={onToggle}>
      <View style={styles.sessionHeader}>
        <View>
          <Text style={styles.sessionDate}>{session.date}</Text>
          <Text style={styles.sessionTime}>{timeStr}</Text>
        </View>
        <View style={styles.sessionDetails}>
          <Text style={styles.sessionDuration}>{session.duration} min</Text>
          <Text style={styles.sessionActivity}>{t(`coregulationResonance.activity.${session.activity}`)}</Text>
        </View>
      </View>
      <View style={styles.sessionHRRow}>
        <Text style={styles.sessionHR}>Parent: {session.parentHR} BPM</Text>
        <Text style={styles.sessionHR}>Baby: {session.babyHR} BPM</Text>
        <Text style={styles.sessionHRRatio}>{t('coregulationResonance.sectionD.hrRatio')}: {hrRatio}</Text>
      </View>
      <View style={styles.sessionQualityRow}>
        {[1, 2, 3, 4, 5].map((q) => (
          <Text key={q} style={[styles.qualityStar, q <= session.quality && styles.qualityStarActive]}>★</Text>
        ))}
      </View>
      {expanded && session.notes && (
        <View style={styles.sessionNotes}>
          <Text style={styles.sessionNotesText}>{session.notes}</Text>
        </View>
      )}
      {!expanded && (
        <Text style={styles.tapToExpand}>{t('coregulationResonance.sectionD.tapToExpand')}</Text>
      )}
    </TouchableOpacity>
  );
};

export default function CoRegulationResonanceScreen() {
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<CoRegulationSession[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await loadSessions();
    setSessions(data);
  };

  const handleSaveSession = async (session: CoRegulationSession) => {
    const updated = [session, ...sessions].slice(0, 100);
    await saveSessions(updated);
    setSessions(updated);
  };

  const resonanceScore = calculateResonanceScore(sessions);
  const trend = getTrend(sessions);
  const cortisolRisk = calculateCortisolRisk(sessions);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'up': return t('coregulationResonance.sectionB.trendUp');
      case 'down': return t('coregulationResonance.sectionB.trendDown');
      default: return t('coregulationResonance.sectionB.trendStable');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: C.text }]}>{t('coregulationResonance.title')}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>{t('coregulationResonance.subtitle')}</Text>
        </View>

        {/* Section A: Session Logger Button */}
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: C.accent }]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.logButtonText}>{t('coregulationResonance.sectionA.sessionLogger')}</Text>
        </TouchableOpacity>

        {/* Section B: Co-Regulation Index */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('coregulationResonance.sectionB.coRegulationIndex')}</Text>
          <View style={styles.scoreRow}>
            <View style={[styles.scoreCircle, { borderColor: resonanceScore >= 70 ? '#4CAF50' : resonanceScore >= 40 ? '#FFC107' : '#F44336' }]}>
              <Text style={[styles.scoreValue, { color: resonanceScore >= 70 ? '#4CAF50' : resonanceScore >= 40 ? '#FFC107' : '#F44336' }]}>
                {resonanceScore || '--'}
              </Text>
              <Text style={styles.scoreLabel}>{t('coregulationResonance.sectionB.resonanceScore')}</Text>
            </View>
            <View style={styles.trendIndicator}>
              <Text style={styles.trendIcon}>{getTrendIcon()}</Text>
              <Text style={styles.trendText}>{getTrendText()}</Text>
            </View>
          </View>
          <TrendChart sessions={sessions} t={t} />
        </View>

        {/* Section C: Stress Correlation Panel */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('coregulationResonance.sectionC.stressCorrelation')}</Text>
          {cortisolRisk === 'red' && (
            <View style={[styles.alertBox, styles.alertRed]}>
              <Text style={styles.alertText}>{t('coregulationResonance.sectionC.redAlert')}</Text>
            </View>
          )}
          {cortisolRisk === 'amber' && (
            <View style={[styles.alertBox, styles.alertAmber]}>
              <Text style={styles.alertText}>{t('coregulationResonance.sectionC.amberAlert')}</Text>
            </View>
          )}
          {cortisolRisk === 'none' && (
            <View style={[styles.alertBox, styles.alertGreen]}>
              <Text style={styles.alertText}>{t('coregulationResonance.sectionC.noAlert')}</Text>
            </View>
          )}
        </View>

        {/* Section D: HRV Sync Log */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('coregulationResonance.sectionD.hrvSyncLog')}</Text>
          {sessions.length === 0 ? (
            <Text style={styles.noDataText}>{t('coregulationResonance.sectionD.noSessions')}</Text>
          ) : (
            sessions.slice(0, 10).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                t={t}
                expanded={expandedSession === session.id}
                onToggle={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
              />
            ))
          )}
        </View>

        {/* Section E: Vagal Tone Benchmark */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('coregulationResonance.sectionE.vagalTone')}</Text>
          <Text style={styles.vagalSubtitle}>{t('coregulationResonance.sectionE.indicators')}</Text>
          <View style={styles.checklist}>
            <View style={styles.checklistItem}>
              <Text style={styles.checkIcon}>☐</Text>
              <Text style={styles.checkText}>{t('coregulationResonance.sectionE.calmBreathing')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checkIcon}>☐</Text>
              <Text style={styles.checkText}>{t('coregulationResonance.sectionE.quickSoothe')}</Text>
            </View>
            <View style={styles.checklistItem}>
              <Text style={styles.checkIcon}>☐</Text>
              <Text style={styles.checkText}>{t('coregulationResonance.sectionE.eyeContact')}</Text>
            </View>
          </View>
        </View>

        <SessionLoggerModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleSaveSession}
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
  logButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  logButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#F8FAFC', marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  scoreValue: { fontSize: 32, fontWeight: '700' },
  scoreLabel: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 2 },
  trendIndicator: { alignItems: 'center' },
  trendIcon: { fontSize: 24, color: '#888' },
  trendText: { fontSize: 12, color: '#888' },
  trendContainer: { marginTop: 12 },
  trendTitle: { fontSize: 14, color: '#888', marginBottom: 8 },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    paddingTop: 20,
  },
  trendBar: { alignItems: 'center' },
  trendBarFill: { width: 20, borderRadius: 4, marginBottom: 4 },
  trendDate: { fontSize: 10, color: '#666' },
  alertBox: { padding: 12, borderRadius: 8, marginTop: 8 },
  alertRed: { backgroundColor: 'rgba(244,67,54,0.2)', borderLeftWidth: 4, borderLeftColor: '#F44336' },
  alertAmber: { backgroundColor: 'rgba(255,193,7,0.2)', borderLeftWidth: 4, borderLeftColor: '#FFC107' },
  alertGreen: { backgroundColor: 'rgba(76,175,80,0.2)', borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  alertText: { fontSize: 14, color: '#F8FAFC' },
  sessionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sessionDate: { fontSize: 14, color: '#F8FAFC', fontWeight: '600' },
  sessionTime: { fontSize: 12, color: '#888' },
  sessionDetails: { alignItems: 'flex-end' },
  sessionDuration: { fontSize: 14, color: '#F8FAFC' },
  sessionActivity: { fontSize: 12, color: '#888' },
  sessionHRRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sessionHR: { fontSize: 12, color: '#aaa' },
  sessionHRRatio: { fontSize: 12, color: '#4A90D9' },
  sessionQualityRow: { flexDirection: 'row' },
  qualityStar: { fontSize: 14, color: '#444', marginRight: 2 },
  qualityStarActive: { color: '#FFC107' },
  sessionNotes: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#333' },
  sessionNotesText: { fontSize: 13, color: '#aaa', fontStyle: 'italic' },
  tapToExpand: { fontSize: 11, color: '#666', marginTop: 4, textAlign: 'center' },
  noDataText: { color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  vagalSubtitle: { fontSize: 13, color: '#888', marginBottom: 12 },
  checklist: { gap: 8 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  checkIcon: { fontSize: 16, color: '#888', marginRight: 8 },
  checkText: { fontSize: 14, color: '#ccc' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 20 },
  inputLabel: { fontSize: 14, color: '#aaa', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, color: '#fff', fontSize: 16 },
  notesInput: { height: 80, textAlignVertical: 'top' },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  durationBtnActive: { backgroundColor: '#4A90D9' },
  durationBtnText: { color: '#aaa', fontSize: 14 },
  durationBtnTextActive: { color: '#fff' },
  activityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  activityBtnActive: { backgroundColor: '#4A90D9' },
  activityBtnText: { color: '#aaa', fontSize: 12 },
  activityBtnTextActive: { color: '#fff' },
  qualityRow: { flexDirection: 'row', gap: 8 },
  starBtn: { padding: 4 },
  starText: { fontSize: 28, color: '#444' },
  starActive: { color: '#FFC107' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, marginRight: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 16 },
  saveBtn: { flex: 1, paddingVertical: 12, marginLeft: 8, borderRadius: 8, backgroundColor: '#4A90D9', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

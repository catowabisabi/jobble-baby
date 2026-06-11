#!/bin/bash
# Sisyphus Task — Cycle 305
# Todo #121: Implement Infant Regulatory Fitness Dashboard (Concept #47)

PROJECT="/mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby"
cd "$PROJECT"

echo "=== Sisyphus Task — Cycle 305 ==="
echo "Working directory: $(pwd)"
echo "Tab count before: $(ls app/\(tabs\)/ 2>/dev/null | wc -l)"

# Step 1: Create regulatory-fitness.tsx
echo ""
echo "Step 1: Creating regulatory-fitness.tsx..."

cat > "app/(tabs)/regulatory-fitness.tsx" << 'ENDOFFILE'
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../hooks/useI18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RegulatoryEntry {
  date: string;
  composite_score: number;
  autonomic_score: number;
  sensory_score: number;
  motor_score: number;
  social_score: number;
  notes?: string;
}

const CASCADE_ALERTS: Record<string, { affected: string; message: string }> = {
  sensory: { affected: 'sleep', message: 'Low sensory score → may affect sleep in 2-3 days' },
  autonomic: { affected: 'emotional', message: 'Low autonomic score → may increase crying' },
  motor: { affected: 'sensory', message: 'Low motor score → may affect sensory integration' },
  social: { affected: 'autonomic', message: 'Low social engagement → may indicate stress' },
};

const DOMAIN_COLORS = {
  autonomic: '#4A90D9',
  sensory: '#7B68EE',
  motor: '#20B2AA',
  social: '#FF6B6B',
};

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

const getScoreLabel = (score: number): string => {
  if (score >= 80) return 'optimal';
  if (score >= 50) return 'developing';
  return 'concerning';
};

const loadRegulatoryData = async (): Promise<RegulatoryEntry[]> => {
  try {
    const data = await AsyncStorage.getItem('@jobble/regulatory_fitness');
    if (data) {
      const parsed: RegulatoryEntry[] = JSON.parse(data);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      return parsed.filter((e) => new Date(e.date) >= cutoff);
    }
  } catch (error) {
    console.error('Error loading regulatory data:', error);
  }
  return [];
};

const saveRegulatoryData = async (entries: RegulatoryEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem('@jobble/regulatory_fitness', JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving regulatory data:', error);
  }
};

const DomainBar: React.FC<{
  domain: string;
  score: number;
  color: string;
  t: (key: string) => string;
}> = ({ domain, score, color, t }) => (
  <View style={styles.domainBar}>
    <Text style={styles.domainLabel}>{t(`regulatory_fitness.domain.${domain}`)}</Text>
    <View style={styles.barContainer}>
      <View style={[styles.barFill, { width: `${score}%`, backgroundColor: color }]} />
    </View>
    <Text style={[styles.domainScore, { color: getScoreColor(score) }]}>
      {score} — {t(`regulatory_fitness.status.${getScoreLabel(score)}`)}
    </Text>
  </View>
);

const CascadeAlertBanner: React.FC<{
  alerts: { message: string }[];
}> = ({ alerts }) => {
  if (alerts.length === 0) return null;
  return (
    <View style={styles.alertBanner}>
      <Text style={styles.alertIcon}>⚠️</Text>
      <View style={styles.alertContent}>
        {alerts.map((alert, i) => (
          <Text key={i} style={styles.alertText}>{alert.message}</Text>
        ))}
      </View>
    </View>
  );
};

const QuickLogModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (entry: RegulatoryEntry) => void;
  t: (key: string) => string;
}> = ({ visible, onClose, onSave, t }) => {
  const [autonomic, setAutonomic] = useState(70);
  const [sensory, setSensory] = useState(70);
  const [motor, setMotor] = useState(70);
  const [social, setSocial] = useState(70);

  const handleSave = () => {
    const avgScore = Math.round((autonomic + sensory + motor + social) / 4);
    onSave({
      date: new Date().toISOString().split('T')[0],
      composite_score: avgScore,
      autonomic_score: autonomic,
      sensory_score: sensory,
      motor_score: motor,
      social_score: social,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('regulatory_fitness.daily_checkin')}</Text>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>{t('regulatory_fitness.domain.autonomic')}</Text>
            <View style={styles.sliderRow}>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setAutonomic(Math.max(0, autonomic - 10))}><Text style={styles.sliderBtnText}>-10</Text></TouchableOpacity>
              <Text style={styles.sliderValue}>{autonomic}</Text>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setAutonomic(Math.min(100, autonomic + 10))}><Text style={styles.sliderBtnText}>+10</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>{t('regulatory_fitness.domain.sensory')}</Text>
            <View style={styles.sliderRow}>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setSensory(Math.max(0, sensory - 10))}><Text style={styles.sliderBtnText}>-10</Text></TouchableOpacity>
              <Text style={styles.sliderValue}>{sensory}</Text>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setSensory(Math.min(100, sensory + 10))}><Text style={styles.sliderBtnText}>+10</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>{t('regulatory_fitness.domain.motor')}</Text>
            <View style={styles.sliderRow}>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setMotor(Math.max(0, motor - 10))}><Text style={styles.sliderBtnText}>-10</Text></TouchableOpacity>
              <Text style={styles.sliderValue}>{motor}</Text>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setMotor(Math.min(100, motor + 10))}><Text style={styles.sliderBtnText}>+10</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>{t('regulatory_fitness.domain.social')}</Text>
            <View style={styles.sliderRow}>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setSocial(Math.max(0, social - 10))}><Text style={styles.sliderBtnText}>-10</Text></TouchableOpacity>
              <Text style={styles.sliderValue}>{social}</Text>
              <TouchableOpacity style={styles.sliderBtn} onPress={() => setSocial(Math.min(100, social + 10))}><Text style={styles.sliderBtnText}>+10</Text></TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TrendChart: React.FC<{ entries: RegulatoryEntry[] }> = ({ entries }) => {
  const last7 = entries.slice(-7);
  if (last7.length < 2) {
    return <Text style={styles.noDataText}>Need at least 2 days of data for trend</Text>;
  }
  const chartHeight = 80;
  return (
    <View style={styles.trendContainer}>
      <Text style={styles.trendTitle}>7-Day Trend</Text>
      <View style={styles.trendChart}>
        {last7.map((entry, i) => {
          const height = (entry.composite_score / 100) * chartHeight;
          return (
            <View key={i} style={styles.trendBar}>
              <View style={[styles.trendBarFill, { height, backgroundColor: getScoreColor(entry.composite_score) }]} />
              <Text style={styles.trendDate}>{entry.date.split('-')[2]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const ParentCalmScore: React.FC<{ t: (key: string) => string }> = ({ t }) => {
  const [score, setScore] = useState(70);
  useEffect(() => {
    AsyncStorage.getItem('@jobble/stress_cascade').then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.length > 0) setScore(parsed[parsed.length - 1].calm_score || 70);
      }
    });
  }, []);
  return (
    <View style={styles.parentScoreContainer}>
      <Text style={styles.parentScoreTitle}>{t('regulatory_fitness.parent_calm')}</Text>
      <View style={styles.parentScoreRow}>
        <View style={[styles.parentScoreCircle, { borderColor: getScoreColor(score) }]}>
          <Text style={[styles.parentScoreValue, { color: getScoreColor(score) }]}>{score}</Text>
        </View>
        <Text style={styles.parentScoreLabel}>{t(`regulatory_fitness.status.${getScoreLabel(score)}`)}</Text>
      </View>
    </View>
  );
};

export default function RegulatoryFitnessScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [entries, setEntries] = useState<RegulatoryEntry[]>([]);
  const [alerts, setAlerts] = useState<{ message: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [todayLogged, setTodayLogged] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const data = await loadRegulatoryData();
    setEntries(data);
    if (data.length > 0) {
      const latest = data[data.length - 1];
      const newAlerts: { message: string }[] = [];
      const domains = ['autonomic', 'sensory', 'motor', 'social'] as const;
      domains.forEach(domain => {
        const s = latest[`${domain}_score` as keyof RegulatoryEntry] as number;
        if (s < 50 && CASCADE_ALERTS[domain]) {
          newAlerts.push({ message: CASCADE_ALERTS[domain].message });
        }
      });
      setAlerts(newAlerts);
      const today = new Date().toISOString().split('T')[0];
      setTodayLogged(data.some(e => e.date === today));
    }
  };

  const handleSaveEntry = async (entry: RegulatoryEntry) => {
    const allEntries = await loadRegulatoryData();
    const filtered = allEntries.filter(e => e.date !== entry.date);
    const updated = [...filtered, entry].slice(-90);
    await saveRegulatoryData(updated);
    setEntries(updated);
    setTodayLogged(true);
  };

  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{t('regulatory_fitness.title')}</Text>

      <View style={styles.scoreCircleContainer}>
        <View style={[styles.scoreCircle, { borderColor: getScoreColor(latestEntry?.composite_score || 0) }]}>
          <Text style={[styles.scoreValue, { color: getScoreColor(latestEntry?.composite_score || 0) }]}>
            {latestEntry?.composite_score || '--'}
          </Text>
          <Text style={styles.scoreLabel}>{t('regulatory_fitness.composite')}</Text>
        </View>
      </View>

      <CascadeAlertBanner alerts={alerts} />

      <View style={styles.domainsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('regulatory_fitness.domains')}</Text>
        {latestEntry ? (
          <>
            <DomainBar domain="autonomic" score={latestEntry.autonomic_score} color={DOMAIN_COLORS.autonomic} t={t} />
            <DomainBar domain="sensory" score={latestEntry.sensory_score} color={DOMAIN_COLORS.sensory} t={t} />
            <DomainBar domain="motor" score={latestEntry.motor_score} color={DOMAIN_COLORS.motor} t={t} />
            <DomainBar domain="social" score={latestEntry.social_score} color={DOMAIN_COLORS.social} t={t} />
          </>
        ) : (
          <Text style={styles.noDataText}>{t('regulatory_fitness.no_data')}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.logButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => setModalVisible(true)}
        accessibilityLabel={t('regulatory_fitness.log_today')}
        accessibilityRole="button"
      >
        <Text style={styles.logButtonText}>
          {todayLogged ? t('regulatory_fitness.update_today') : t('regulatory_fitness.log_today')}
        </Text>
      </TouchableOpacity>

      <TrendChart entries={entries} />
      <ParentCalmScore t={t} />

      <View style={styles.suggestionsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('regulatory_fitness.suggestions')}</Text>
        <View style={styles.suggestionCard}>
          <Text style={styles.suggestionIcon}>🧘</Text>
          <Text style={styles.suggestionText}>{t('regulatory_fitness.suggestion.tummy_time')}</Text>
        </View>
        <View style={styles.suggestionCard}>
          <Text style={styles.suggestionIcon}>🎵</Text>
          <Text style={styles.suggestionText}>{t('regulatory_fitness.suggestion.sensory_play')}</Text>
        </View>
      </View>

      <QuickLogModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSaveEntry} t={t} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  scoreCircleContainer: { alignItems: 'center', marginBottom: 20 },
  scoreCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  scoreValue: { fontSize: 36, fontWeight: '700' },
  scoreLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  alertBanner: { flexDirection: 'row', backgroundColor: 'rgba(255,193,7,0.2)', borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FFC107' },
  alertIcon: { fontSize: 20, marginRight: 8 },
  alertContent: { flex: 1 },
  alertText: { color: '#FFC107', fontSize: 13, marginBottom: 4 },
  domainsContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  domainBar: { marginBottom: 12 },
  domainLabel: { fontSize: 14, color: '#aaa', marginBottom: 4 },
  barContainer: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  domainScore: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  logButton: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  logButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  trendContainer: { marginBottom: 20 },
  trendTitle: { fontSize: 14, color: '#888', marginBottom: 8 },
  trendChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 100, paddingTop: 20 },
  trendBar: { alignItems: 'center' },
  trendBarFill: { width: 24, borderRadius: 4, marginBottom: 4 },
  trendDate: { fontSize: 10, color: '#666' },
  parentScoreContainer: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 20 },
  parentScoreTitle: { fontSize: 14, color: '#888', marginBottom: 8 },
  parentScoreRow: { flexDirection: 'row', alignItems: 'center' },
  parentScoreCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  parentScoreValue: { fontSize: 18, fontWeight: '700' },
  parentScoreLabel: { fontSize: 14, color: '#888' },
  suggestionsContainer: { marginBottom: 20 },
  suggestionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 12, marginBottom: 8 },
  suggestionIcon: { fontSize: 20, marginRight: 12 },
  suggestionText: { fontSize: 14, color: '#ccc', flex: 1 },
  noDataText: { color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, width: '90%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 20 },
  sliderContainer: { marginBottom: 16 },
  sliderLabel: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sliderBtn: { width: 50, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sliderBtnText: { color: '#fff', fontSize: 16 },
  sliderValue: { fontSize: 24, fontWeight: '700', color: '#fff', marginHorizontal: 20, minWidth: 50, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 12, marginRight: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 16 },
  saveBtn: { flex: 1, paddingVertical: 12, marginLeft: 8, borderRadius: 8, backgroundColor: '#4A90D9', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
ENDOFFILE

echo "Created app/(tabs)/regulatory-fitness.tsx"

# Step 2: Create data layer
echo ""
echo "Step 2: Creating data layer..."
mkdir -p app/data

cat > app/data/regulatoryFitness.ts << 'ENDOFFILE'
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RegulatoryEntry {
  date: string;
  composite_score: number;
  autonomic_score: number;
  sensory_score: number;
  motor_score: number;
  social_score: number;
  notes?: string;
}

const STORAGE_KEY = '@jobble/regulatory_fitness';
const MAX_ENTRIES = 90;

export const loadRegulatoryData = async (): Promise<RegulatoryEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed: RegulatoryEntry[] = JSON.parse(data);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - MAX_ENTRIES);
      return parsed.filter((e) => new Date(e.date) >= cutoff);
    }
  } catch (error) {
    console.error('Error loading regulatory data:', error);
  }
  return [];
};

export const saveRegulatoryEntry = async (entry: RegulatoryEntry): Promise<void> => {
  try {
    const allEntries = await loadRegulatoryData();
    const filtered = allEntries.filter((e) => e.date !== entry.date);
    const updated = [...filtered, entry].slice(-MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving regulatory entry:', error);
    throw error;
  }
};
ENDOFFILE

echo "Created app/data/regulatoryFitness.ts"

# Step 3: Register tab in _layout.tsx
echo ""
echo "Step 3: Registering in _layout.tsx..."

python3 << 'PYEOF'
import re

with open('app/_layout.tsx', 'r') as f:
    content = f.read()

if 'regulatory-fitness' in content:
    print("Already registered")
else:
    # Add after 'index' tab entry
    if "name: 'index'" in content:
        content = content.replace(
            "name: 'index',",
            "name: 'index',\n    { name: 'regulatory-fitness', title: 'regulatory_fitness.tab', icon: 'activity' },"
        )
        with open('app/_layout.tsx', 'w') as f:
            f.write(content)
        print("Added regulatory-fitness to _layout.tsx")
    else:
        print("Could not find index tab entry")
PYEOF

# Step 4: Add i18n keys
echo ""
echo "Step 4: Adding i18n keys..."

python3 << 'PYEOF'
import json

with open('app/i18n/en.json', 'r') as f:
    en = json.load(f)

rf_en = {
    "regulatory_fitness.title": "Regulatory Fitness",
    "regulatory_fitness.tab": "Fitness",
    "regulatory_fitness.composite": "Composite",
    "regulatory_fitness.domains": "Regulatory Domains",
    "regulatory_fitness.no_data": "No data yet. Log today's fitness to get started.",
    "regulatory_fitness.log_today": "Log Today's Fitness",
    "regulatory_fitness.update_today": "Update Today's Fitness",
    "regulatory_fitness.daily_checkin": "Daily Check-in",
    "regulatory_fitness.domain.autonomic": "Autonomic",
    "regulatory_fitness.domain.sensory": "Sensory",
    "regulatory_fitness.domain.motor": "Motor",
    "regulatory_fitness.domain.social": "Social/Emotional",
    "regulatory_fitness.status.optimal": "optimal",
    "regulatory_fitness.status.developing": "developing",
    "regulatory_fitness.status.concerning": "concerning",
    "regulatory_fitness.parent_calm": "Parent Calm Score",
    "regulatory_fitness.suggestions": "Activity Suggestions",
    "regulatory_fitness.suggestion.tummy_time": "Tummy time in different positions — addresses vestibular + proprioceptive + tactile",
    "regulatory_fitness.suggestion.sensory_play": "Sensory play with different textures — supports sensory integration",
}
en['regulatory_fitness'] = rf_en

with open('app/i18n/en.json', 'w') as f:
    json.dump(en, f, indent=2, ensure_ascii=False)
print(f"Added {len(rf_en)} keys to en.json")

with open('app/i18n/zh.json', 'r') as f:
    zh = json.load(f)

rf_zh = {
    "regulatory_fitness.title": "調節健身",
    "regulatory_fitness.tab": "健身",
    "regulatory_fitness.composite": "綜合",
    "regulatory_fitness.domains": "調節範疇",
    "regulatory_fitness.no_data": "暫無數據。記錄今天的狀態以開始。",
    "regulatory_fitness.log_today": "記錄今天狀態",
    "regulatory_fitness.update_today": "更新今天狀態",
    "regulatory_fitness.daily_checkin": "每日檢查",
    "regulatory_fitness.domain.autonomic": "自主神經",
    "regulatory_fitness.domain.sensory": "感覺",
    "regulatory_fitness.domain.motor": "運動",
    "regulatory_fitness.domain.social": "社交/情緒",
    "regulatory_fitness.status.optimal": "理想",
    "regulatory_fitness.status.developing": "發展中",
    "regulatory_fitness.status.concerning": "關注",
    "regulatory_fitness.parent_calm": "家長平静指數",
    "regulatory_fitness.suggestions": "活動建議",
    "regulatory_fitness.suggestion.tummy_time": "不同姿勢的趴臥時間 — 刺激前庭+本體+觸覺",
    "regulatory_fitness.suggestion.sensory_play": "不同質地的感覺遊戲 — 支持感覺整合",
}
zh['regulatory_fitness'] = rf_zh

with open('app/i18n/zh.json', 'w') as f:
    json.dump(zh, f, indent=2, ensure_ascii=False)
print(f"Added {len(rf_zh)} keys to zh.json")
PYEOF

# Step 5: Verify TSC
echo ""
echo "Step 5: Running TSC..."
npx tsc --noEmit 2>&1 | head -20
TSC_RESULT=$?

if [ $TSC_RESULT -eq 0 ]; then
    echo "TSC: PASS"
else
    echo "TSC: FAIL (exit $TSC_RESULT)"
fi

echo ""
echo "=== COMPLETE ==="
echo "Tab count after: $(ls app/\(tabs\)/ | wc -l)"
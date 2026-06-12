#!/bin/bash
cd /mnt/c/Users/enoma/Desktop/opencode-work/agent-works/jobble-baby/JobbleBaby

# Create window-of-tolerance.tsx
cat > app/(tabs)/window-of-tolerance.tsx << 'EOF'
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

// Window of Tolerance Monitor — polyvagal theory based stress/arousal tracking

interface ArousalZone {
  label: string;
  color: string;
  min: number;
  max: number;
}

const infantZones: ArousalZone[] = [
  { label: 'windowOfTolerance.hypoarousal', color: '#3B82F6', min: 0, max: 30 },
  { label: 'windowOfTolerance.window', color: '#22C55E', min: 30, max: 70 },
  { label: 'windowOfTolerance.hyperarousal', color: '#EF4444', min: 70, max: 100 },
];

const caregiverZones: ArousalZone[] = [
  { label: 'windowOfTolerance.hypoarousal', color: '#3B82F6', min: 0, max: 30 },
  { label: 'windowOfTolerance.window', color: '#22C55E', min: 30, max: 70 },
  { label: 'windowOfTolerance.hyperarousal', color: '#EF4444', min: 70, max: 100 },
  { label: 'windowOfTolerance.dissociation', color: '#6B7280', min: -1, max: -1 },
];

const coRegulationPrompts: Record<string, string[]> = {
  infant_hyper: ['windowOfTolerance.promptSkinToSkin', 'windowOfTolerance.promptSwaddle'],
  infant_hypo: ['windowOfTolerance.promptGentleRouse', 'windowOfTolerance.promptFeed'],
  caregiver_hyper: ['windowOfTolerance.promptBreathe', 'windowOfTolerance.promptGround'],
  caregiver_hypo: ['windowOfTolerance.promptReachOut', 'windowOfTolerance.promptRest'],
};

interface LogEntry {
  timestamp: Date;
  target: 'infant' | 'caregiver';
  zone: string;
}

export default function WindowOfTolerance() {
  const { t } = useTranslation();
  const [infantArousal, setInfantArousal] = useState(50);
  const [caregiverArousal, setCaregiverArousal] = useState(50);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const logState = (target: 'infant' | 'caregiver', value: number) => {
    const zone = value < 30 ? 'hypoarousal' : value > 70 ? 'hyperarousal' : 'window';
    setLogs(prev => [{ timestamp: new Date(), target, zone }, ...prev.slice(0, 49)]);
  };

  const InfantGauge = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <View style={styles.gaugeContainer}>
      <Text style={styles.gaugeLabel}>{t('windowOfTolerance.infant')}</Text>
      <View style={styles.gauge}>
        <View style={[styles.gaugeFill, { 
          width: `${value}%`, 
          backgroundColor: value < 30 ? '#3B82F6' : value > 70 ? '#EF4444' : '#22C55E' 
        }]} />
      </View>
      <View style={styles.zoneLabels}>
        <Text style={styles.zoneLabel}>{t('windowOfTolerance.hypoarousal')}</Text>
        <Text style={styles.zoneLabel}>{t('windowOfTolerance.window')}</Text>
        <Text style={styles.zoneLabel}>{t('windowOfTolerance.hyperarousal')}</Text>
      </View>
      <View style={styles.sliderRow}>
        <Pressable style={styles.sliderBtn} onPress={() => onChange(Math.max(0, value - 10))}>
          <Text style={styles.sliderBtnText}>−</Text>
        </Pressable>
        <Text style={styles.sliderValue}>{value}%</Text>
        <Pressable style={styles.sliderBtn} onPress={() => onChange(Math.min(100, value + 10))}>
          <Text style={styles.sliderBtnText}>+</Text>
        </Pressable>
      </View>
      <Pressable style={styles.logBtn} onPress={() => logState('infant', value)}>
        <Text style={styles.logBtnText}>{t('windowOfTolerance.logState')}</Text>
      </Pressable>
    </View>
  );

  const showPrompt = (target: 'infant' | 'caregiver', value: number) => {
    if (value < 30) return target === 'infant' ? coRegulationPrompts.infant_hypo : coRegulationPrompts.caregiver_hypo;
    if (value > 70) return target === 'infant' ? coRegulationPrompts.infant_hyper : coRegulationPrompts.caregiver_hyper;
    return [];
  };

  const prompts = [...showPrompt('infant', infantArousal), ...showPrompt('caregiver', caregiverArousal)];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('windowOfTolerance.title')}</Text>
      <Text style={styles.subtitle}>{t('windowOfTolerance.subtitle')}</Text>
      
      <View style={styles.dualGauges}>
        <InfantGauge value={infantArousal} onChange={setInfantArousal} />
        <InfantGauge value={caregiverArousal} onChange={setCaregiverArousal} />
      </View>

      {prompts.length > 0 && (
        <View style={styles.promptCard}>
          <Text style={styles.promptTitle}>{t('windowOfTolerance.coRegulation')}</Text>
          {prompts.map((p, i) => <Text key={i} style={styles.promptText}>{t(p)}</Text>)}
        </View>
      )}

      <View style={styles.logSection}>
        <Text style={styles.logTitle}>{t('windowOfTolerance.sessionLog')}</Text>
        {logs.map((log, i) => (
          <View key={i} style={styles.logEntry}>
            <Text style={styles.logTime}>{log.timestamp.toLocaleTimeString()}</Text>
            <Text style={styles.logTarget}>{t(`windowOfTolerance.${log.target}`)}</Text>
            <Text style={styles.logZone}>{t(`windowOfTolerance.${log.zone}`)}</Text>
          </View>
        ))}
        {logs.length === 0 && <Text style={styles.emptyLog}>{t('windowOfTolerance.noLogs')}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 24 },
  dualGauges: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  gaugeContainer: { flex: 1, backgroundColor: '#1E293B', borderRadius: 16, padding: 16 },
  gaugeLabel: { fontSize: 14, fontWeight: '600', color: '#F8FAFC', textAlign: 'center', marginBottom: 12 },
  gauge: { height: 24, backgroundColor: '#334155', borderRadius: 12, overflow: 'hidden' },
  gaugeFill: { height: '100%', borderRadius: 12 },
  zoneLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  zoneLabel: { fontSize: 10, color: '#64748B' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 12 },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  sliderBtnText: { fontSize: 20, color: '#F8FAFC', fontWeight: '600' },
  sliderValue: { fontSize: 16, color: '#F8FAFC', fontWeight: '700', minWidth: 50, textAlign: 'center' },
  logBtn: { backgroundColor: '#22C55E', borderRadius: 8, padding: 10, marginTop: 12 },
  logBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  promptCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  promptTitle: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginBottom: 8 },
  promptText: { fontSize: 14, color: '#F8FAFC', marginBottom: 4 },
  logSection: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  logTitle: { fontSize: 16, fontWeight: '600', color: '#F8FAFC', marginBottom: 12 },
  logEntry: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  logTime: { fontSize: 12, color: '#64748B', minWidth: 70 },
  logTarget: { fontSize: 12, color: '#F8FAFC', flex: 1 },
  logZone: { fontSize: 12, color: '#94A3B8' },
  emptyLog: { fontSize: 13, color: '#64748B', textAlign: 'center', paddingVertical: 20 },
});
EOF

echo "window-of-tolerance.tsx created"

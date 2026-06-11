import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';

interface StormEntry {
  id: string;
  date: string;
  motorSkills: string[];
  separationEvents: number;
  strangerReactions: number;
  sleepScore: number;
  notes: string;
}

export default function EightMonthStorm() {
  const { t, language } = useLanguage();
  const { effectiveTheme } = useTheme();
  const [entries, setEntries] = useState<StormEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ motorSkills: '', separationEvents: 0, strangerReactions: 0, sleepScore: 50, notes: '' });

  const C = COLORS[effectiveTheme];

  const severityScore = entries.length > 0
    ? Math.min(100, Math.round(entries.reduce((s, e) => s + e.sleepScore, 0) / entries.length))
    : 50;

  const getStormColor = (score: number) => {
    if (score < 40) return '#4CAF50';
    if (score < 70) return '#FF9800';
    return '#F44336';
  };

  const tracks = [
    { name: language === 'zh' ? '運動' : 'Motor', status: 'amber', label: language === 'zh' ? '爬行/站立' : 'crawling/standing' },
    { name: language === 'zh' ? '社交情緒' : 'Social/Emotional', status: 'red', label: language === 'zh' ? '陌生人焦慮巔峰' : 'stranger wariness peak' },
    { name: language === 'zh' ? '認知' : 'Cognitive', status: 'green', label: language === 'zh' ? '物體永恆' : 'object permanence' },
    { name: language === 'zh' ? '睡眠' : 'Sleep', status: 'red', label: language === 'zh' ? 'Wolke回歸#3' : 'Wolke regression #3' },
    { name: language === 'zh' ? '生理節律' : 'Circadian', status: 'amber', label: language === 'zh' ? '晝夜節律轉變' : 'circadian shift' },
  ];

  const trackColor = (status: string) => {
    if (status === 'green') return '#4CAF50';
    if (status === 'amber') return '#FF9800';
    return '#F44336';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={[styles.header, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>8-Month Storm</Text>
          <Text style={[styles.subtitle, { color: C.text, opacity: 0.7 }]}>
            {language === 'zh' ? '發育系統 convergence Navigator' : 'Developmental Systems Convergence Navigator'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{language === 'zh' ? '發育時間線' : 'Convergence Timeline'}</Text>
          <View style={styles.timeline}>
            {[6, 7, 8, 9, 10].map(month => (
              <View key={month} style={styles.timelineMonth}>
                <View style={[styles.timelineDot, month === 8 && { backgroundColor: '#F44336', width: 16, height: 16 }]} />
                <Text style={[styles.timelineLabel, { color: C.text }]}>{month}m</Text>
              </View>
            ))}
          </View>
          <View style={styles.stormZone}>
            <Text style={styles.stormZoneLabel}>{language === 'zh' ? '風暴區 (7-9個月)' : 'Storm Zone (7-9mo)'}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{language === 'zh' ? '風暴嚴重程度' : 'Storm Severity Score'}</Text>
          <View style={styles.severityContainer}>
            <Text style={[styles.severityScore, { color: getStormColor(severityScore) }]}>{severityScore}</Text>
            <View style={[styles.severityBar, { backgroundColor: effectiveTheme === 'dark' ? '#333' : '#eee' }]}>
              <View style={[styles.severityFill, { width: `${severityScore}%`, backgroundColor: getStormColor(severityScore) }]} />
            </View>
          </View>
          <Text style={[styles.severityDesc, { color: C.text, opacity: 0.7 }]}>
            {language === 'zh' ? '複合哭鬧分鐘數 + 夜間醒來 + 分離痛苦 + 陌生人反應' : 'Composite: cry mins + night wakings + separation distress + stranger reactions'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{language === 'zh' ? '5軌發育狀態' : '5-Track Developmental Status'}</Text>
          {tracks.map((track, i) => (
            <View key={i} style={styles.trackRow}>
              <View style={[styles.trackIndicator, { backgroundColor: trackColor(track.status) }]} />
              <View style={styles.trackInfo}>
                <Text style={[styles.trackName, { color: C.text }]}>{track.name}</Text>
                <Text style={[styles.trackLabel, { color: C.text, opacity: 0.5 }]}>{track.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{language === 'zh' ? '分離焦慮工具包' : 'Separation Anxiety Toolkit'}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: C.accent }]} accessibilityLabel={language === 'zh' ? '建立分離儀式' : 'Build departure ritual'}>
            <Text style={styles.buttonText}>{language === 'zh' ? '建立告別儀式 (3步)' : 'Build Departure Ritual (3 steps)'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: C.accent, marginTop: 8 }]} accessibilityLabel={language === 'zh' ? '記錄躲貓貓遊戲' : 'Log peekaboo games'}>
            <Text style={styles.buttonText}>{language === 'zh' ? '躲貓貓遊戲追蹤' : 'Peekaboo Game Tracker'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{language === 'zh' ? '陌生人焦慮指南' : 'Stranger Wariness Guide'}</Text>
          <Text style={[styles.infoText, { color: C.text, opacity: 0.7 }]}>
            {language === 'zh' ? '陌生人焦慮是認知里程碑，不是行為問題' : 'Stranger wariness is a cognitive milestone, not a behavior problem'}
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: C.accent, marginTop: 8 }]} accessibilityLabel={language === 'zh' ? '漸進介紹協議' : 'Gradual introduction protocol'}>
            <Text style={styles.buttonText}>{language === 'zh' ? '4階段漸進介紹' : '4-Stage Gradual Introduction'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{language === 'zh' ? '睡眠風暴協議' : 'Sleep Storm Protocol'}</Text>
          <View style={[styles.infoBox, { backgroundColor: effectiveTheme === 'dark' ? '#1a1a2e' : '#e3f2fd' }]}>
            <Text style={[styles.infoText, { color: C.text }]}>
              {language === 'zh' ? '三重打擊：晝夜節律轉變 + 分離焦慮 + 運動里程碑' : 'Triple hit: circadian shift + separation anxiety + motor milestone'}
            </Text>
          </View>
          <View style={styles.strategies}>
            {[
              language === 'zh' ? '提前就寢時間' : 'Earlier bedtime',
              language === 'zh' ? '臨時睡袋' : 'Temporary sleep sack',
              language === 'zh' ? '遮光窗帘' : 'Blackout curtains',
              language === 'zh' ? '白噪音' : 'White noise',
            ].map((s, i) => (
              <View key={i} style={[styles.strategyChip, { backgroundColor: effectiveTheme === 'dark' ? '#333' : '#eee' }]}>
                <Text style={[styles.strategyText, { color: C.text }]}>{s}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.reassurance, { color: '#4CAF50' }]}>
            {language === 'zh' ? '回歸通常持續 2-4 週，不是永久性的' : 'Regression typically lasts 2-4 weeks, not permanent'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{language === 'zh' ? '運動里程碑集群' : 'Motor Milestone Cluster'}</Text>
          <View style={styles.motorGrid}>
            {['crawling', 'pulling to stand', 'cruising', 'pincer grasp'].map((skill, i) => (
              <View key={i} style={[styles.motorChip, { backgroundColor: effectiveTheme === 'dark' ? '#333' : '#eee' }]}>
                <Text style={[styles.motorChipText, { color: C.text }]}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.emergencyCard, { backgroundColor: '#1a1a2e' }]} accessibilityLabel={language === 'zh' ? '緊急冷靜模式' : 'Emergency calm mode'}>
          <Text style={styles.emergencyEmoji}>🌬️</Text>
          <Text style={styles.emergencyText}>{language === 'zh' ? '緊急冷靜模式' : 'Emergency Calm Mode'}</Text>
          <Text style={styles.emergencySubtext}>{language === 'zh' ? '點擊啟動呼吸練習' : 'Tap for breathing exercise'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.addButton, { backgroundColor: C.accent }]} onPress={() => setShowAdd(true)} accessibilityLabel={language === 'zh' ? '添加風暴記錄' : 'Add storm entry'}>
          <Text style={styles.addButtonText}>+ {language === 'zh' ? '添加記錄' : 'Add Entry'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{language === 'zh' ? '添加風暴記錄' : 'Add Storm Entry'}</Text>
            <TextInput
              style={[styles.input, { borderColor: effectiveTheme === 'dark' ? '#555' : '#ddd', color: C.text, backgroundColor: effectiveTheme === 'dark' ? '#333' : '#f9f9f9' }]}
              placeholder={language === 'zh' ? '運動技能 (逗號分隔)' : 'Motor skills (comma-separated)'}
              placeholderTextColor={effectiveTheme === 'dark' ? '#888' : '#999'}
              value={newEntry.motorSkills}
              onChangeText={text => setNewEntry({ ...newEntry, motorSkills: text })}
              accessibilityLabel={language === 'zh' ? '運動技能輸入' : 'Motor skills input'}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#666' }]} onPress={() => setShowAdd(false)} accessibilityLabel={language === 'zh' ? '取消' : 'Cancel'}>
                <Text style={styles.modalBtnText}>{language === 'zh' ? '取消' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.accent }]} onPress={() => setShowAdd(false)} accessibilityLabel={language === 'zh' ? '保存' : 'Save'}>
                <Text style={styles.modalBtnText}>{language === 'zh' ? '保存' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: { margin: 12, marginBottom: 0, borderRadius: 16, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  timeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timelineMonth: { alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#aaa', marginBottom: 4 },
  timelineLabel: { fontSize: 12 },
  stormZone: { backgroundColor: 'rgba(244,67,53,0.1)', borderRadius: 8, padding: 6, alignItems: 'center' },
  stormZoneLabel: { color: '#F44336', fontSize: 12, fontWeight: '600' },
  severityContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  severityScore: { fontSize: 48, fontWeight: 'bold', marginRight: 16 },
  severityBar: { flex: 1, height: 12, borderRadius: 6 },
  severityFill: { height: '100%', borderRadius: 6 },
  severityDesc: { fontSize: 12 },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  trackIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 14, fontWeight: '500' },
  trackLabel: { fontSize: 11 },
  button: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  infoText: { fontSize: 13, lineHeight: 20 },
  infoBox: { borderRadius: 10, padding: 12, marginBottom: 12 },
  strategies: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  strategyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  strategyText: { fontSize: 12 },
  reassurance: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 4 },
  motorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motorChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  motorChipText: { fontSize: 12 },
  emergencyCard: { margin: 12, borderRadius: 16, padding: 24, alignItems: 'center' },
  emergencyEmoji: { fontSize: 40, marginBottom: 8 },
  emergencyText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emergencySubtext: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  addButton: { margin: 12, padding: 16, borderRadius: 16 },
  addButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 14 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 12 },
  modalBtnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
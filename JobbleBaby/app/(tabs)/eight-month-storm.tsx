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
    { name: t('eightMonthStorm.motor'), status: 'amber', label: t('eightMonthStorm.crawlingStanding') },
    { name: t('eightMonthStorm.socialEmotional'), status: 'red', label: t('eightMonthStorm.strangerWarinessPeak') },
    { name: t('eightMonthStorm.cognitive'), status: 'green', label: t('eightMonthStorm.objectPermanence') },
    { name: t('eightMonthStorm.sleep'), status: 'red', label: t('eightMonthStorm.wolkeRegression3') },
    { name: t('eightMonthStorm.circadian'), status: 'amber', label: t('eightMonthStorm.circadianShift') },
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
            {t('eightMonthStorm.developmentalSystemsConvergenceNavigator')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('eightMonthStorm.convergenceTimeline')}</Text>
          <View style={styles.timeline}>
            {[6, 7, 8, 9, 10].map(month => (
              <View key={month} style={styles.timelineMonth}>
                <View style={[styles.timelineDot, month === 8 && { backgroundColor: '#F44336', width: 16, height: 16 }]} />
                <Text style={[styles.timelineLabel, { color: C.text }]}>{month}m</Text>
              </View>
            ))}
          </View>
          <View style={styles.stormZone}>
            <Text style={styles.stormZoneLabel}>{t('eightMonthStorm.stormZone')}</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('eightMonthStorm.stormSeverity')}</Text>
          <View style={styles.severityContainer}>
            <Text style={[styles.severityScore, { color: getStormColor(severityScore) }]}>{severityScore}</Text>
            <View style={[styles.severityBar, { backgroundColor: effectiveTheme === 'dark' ? '#333' : '#eee' }]}>
              <View style={[styles.severityFill, { width: `${severityScore}%`, backgroundColor: getStormColor(severityScore) }]} />
            </View>
          </View>
          <Text style={[styles.severityDesc, { color: C.text, opacity: 0.7 }]}>
            {t('eightMonthStorm.compositeDescription')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('eightMonthStorm.fiveTrackStatus')}</Text>
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
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('eightMonthStorm.separationAnxietyToolkit')}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: C.accent }]} accessibilityLabel={t('eightMonthStorm.buildDepartureRitual')}>
            <Text style={styles.buttonText}>{t('eightMonthStorm.buildDepartureRitualSteps')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: C.accent, marginTop: 8 }]} accessibilityLabel={t('eightMonthStorm.logPeekabooGames')}>
            <Text style={styles.buttonText}>{t('eightMonthStorm.peekabooGameTracker')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('eightMonthStorm.strangerWarinessGuide')}</Text>
          <Text style={[styles.infoText, { color: C.text, opacity: 0.7 }]}>
              {t('eightMonthStorm.strangerWarinessIsCognitive')}
          </Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: C.accent, marginTop: 8 }]} accessibilityLabel={t('eightMonthStorm.fourStageGradualIntroduction')}>
            <Text style={styles.buttonText}>{t('eightMonthStorm.fourStageGradualIntroduction')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('eightMonthStorm.sleepStormProtocol')}</Text>
          <View style={[styles.infoBox, { backgroundColor: effectiveTheme === 'dark' ? '#1a1a2e' : '#e3f2fd' }]}>
            <Text style={[styles.infoText, { color: C.text }]}>
              {t('eightMonthStorm.tripleHit')}
            </Text>
          </View>
          <View style={styles.strategies}>
            {[
              t('eightMonthStorm.earlierBedtime'),
              t('eightMonthStorm.temporarySleepSack'),
              t('eightMonthStorm.blackoutCurtains'),
              t('eightMonthStorm.whiteNoise'),
            ].map((s, i) => (
              <View key={i} style={[styles.strategyChip, { backgroundColor: effectiveTheme === 'dark' ? '#333' : '#eee' }]}>
                <Text style={[styles.strategyText, { color: C.text }]}>{s}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.reassurance, { color: '#4CAF50' }]}>
            {t('eightMonthStorm.regressionTemporary')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{t('eightMonthStorm.motorMilestoneCluster')}</Text>
          <View style={styles.motorGrid}>
            {['crawling', 'pulling to stand', 'cruising', 'pincer grasp'].map((skill, i) => (
              <View key={i} style={[styles.motorChip, { backgroundColor: effectiveTheme === 'dark' ? '#333' : '#eee' }]}>
                <Text style={[styles.motorChipText, { color: C.text }]}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.emergencyCard, { backgroundColor: '#1a1a2e' }]} accessibilityLabel={t('eightMonthStorm.emergencyCalmMode')}>
          <Text style={styles.emergencyEmoji}>🌬️</Text>
          <Text style={styles.emergencyText}>{t('eightMonthStorm.emergencyCalmMode')}</Text>
          <Text style={styles.emergencySubtext}>{t('eightMonthStorm.tapForBreathingExercise')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.addButton, { backgroundColor: C.accent }]} onPress={() => setShowAdd(true)} accessibilityLabel={t('eightMonthStorm.addStormEntry')}>
          <Text style={styles.addButtonText}>+ {t('eightMonthStorm.addEntry')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t('eightMonthStorm.addStormEntry')}</Text>
            <TextInput
              style={[styles.input, { borderColor: effectiveTheme === 'dark' ? '#555' : '#ddd', color: C.text, backgroundColor: effectiveTheme === 'dark' ? '#333' : '#f9f9f9' }]}
              placeholder={t('eightMonthStorm.motorSkillsPlaceholder')}
              placeholderTextColor={effectiveTheme === 'dark' ? '#888' : '#999'}
              value={newEntry.motorSkills}
              onChangeText={text => setNewEntry({ ...newEntry, motorSkills: text })}
              accessibilityLabel={t('eightMonthStorm.motorSkillsInput')}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#666' }]} onPress={() => setShowAdd(false)} accessibilityLabel={t('common.cancel')}>
                <Text style={styles.modalBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.accent }]} onPress={() => setShowAdd(false)} accessibilityLabel={t('common.save')}>
                <Text style={styles.modalBtnText}>{t('common.save')}</Text>
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
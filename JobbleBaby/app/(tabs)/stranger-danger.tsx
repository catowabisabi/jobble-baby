import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Stranger Wariness Phase */}
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
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 16, marginBottom: 8, padding: 16, borderRadius: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
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
});
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const FEEDING_STAGE_KEY = STORAGE_KEYS.FEEDING_STAGE;
const ALLERGEN_LOG_KEY = STORAGE_KEYS.ALLERGEN_INTRO_LOG;

// ── Static Data ──────────────────────────────────────────────────────────────

const STAGES = [
  { stage: 1, titleKey: 'stage1', ageRangeKey: 'stage1Age', motorKey: 'stage1Motor', foodExamplesKey: 'stage1Food', icon: 'baby' },
  { stage: 2, titleKey: 'stage2', ageRangeKey: 'stage2Age', motorKey: 'stage2Motor', foodExamplesKey: 'stage2Food', icon: 'food-apple' },
  { stage: 3, titleKey: 'stage3', ageRangeKey: 'stage3Age', motorKey: 'stage3Motor', foodExamplesKey: 'stage3Food', icon: 'food-variant' },
  { stage: 4, titleKey: 'stage4', ageRangeKey: 'stage4Age', motorKey: 'stage4Motor', foodExamplesKey: 'stage4Food', icon: 'silverware-fork-knife' },
  { stage: 5, titleKey: 'stage5', ageRangeKey: 'stage5Age', motorKey: 'stage5Motor', foodExamplesKey: 'stage5Food', icon: 'human-handsup' },
];

const ALLERGENS = [
  { id: 'peanut',    nameKey: 'allergenPeanut',    windowKey: 'windowPeanut',    emoji: '🥜' },
  { id: 'egg',       nameKey: 'allergenEgg',        windowKey: 'windowEgg',        emoji: '🥚' },
  { id: 'dairy',     nameKey: 'allergenDairy',      windowKey: 'windowDairy',      emoji: '🥛' },
  { id: 'soy',       nameKey: 'allergenSoy',        windowKey: 'windowSoy',        emoji: '🫘' },
  { id: 'wheat',     nameKey: 'allergenWheat',      windowKey: 'windowWheat',      emoji: '🌾' },
  { id: 'tree_nuts', nameKey: 'allergenTreeNuts',   windowKey: 'windowTreeNuts',   emoji: '🌰' },
];

type AllergenResult = 'introduced' | 'tolerated' | 'reacted' | 'pending';
interface AllergenEntry { food: string; date: string; result: AllergenResult; reactionType?: string; severity?: number; }
interface FeedingStage  { stage: number; date: string; notes?: string; }

// ── Component ───────────────────────────────────────────────────────────────

export default function FeedingProgressionScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [currentStage, setCurrentStage] = useState<FeedingStage | null>(null);
  const [allergenLog, setAllergenLog] = useState<Record<string, AllergenEntry>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAllergen, setSelectedAllergen] = useState<string | null>(null);
  const [logResult, setLogResult] = useState<AllergenResult>('introduced');

  useEffect(() => {
    safeGetItem(FEEDING_STAGE_KEY).then(s => {
      if (s) {
        try { setCurrentStage(JSON.parse(s)); } catch {}
      }
    });
    safeGetItem(ALLERGEN_LOG_KEY).then(l => {
      if (l) {
        try { setAllergenLog(JSON.parse(l)); } catch {}
      }
    });
  }, []);

  const markStage = useCallback(async (stageNum: number) => {
    const entry: FeedingStage = { stage: stageNum, date: new Date().toISOString().split('T')[0] };
    await safeSetItem(FEEDING_STAGE_KEY, JSON.stringify(entry));
    setCurrentStage(entry);
  }, []);

  const openLogModal = useCallback((allergenId: string) => {
    setSelectedAllergen(allergenId);
    setLogResult(allergenLog[allergenId]?.result ?? 'introduced');
    setModalVisible(true);
  }, [allergenLog]);

  const saveAllergenLog = useCallback(async () => {
    if (!selectedAllergen) return;
    const entry: AllergenEntry = { food: selectedAllergen, date: new Date().toISOString().split('T')[0], result: logResult };
    const updated = { ...allergenLog, [selectedAllergen]: entry };
    await safeSetItem(ALLERGEN_LOG_KEY, JSON.stringify(updated));
    setAllergenLog(updated);
    setModalVisible(false);
  }, [selectedAllergen, logResult, allergenLog]);

  const getAllergenStatus = (id: string): AllergenResult => allergenLog[id]?.result ?? 'pending';

  const statusColor = (status: AllergenResult) => {
    switch (status) {
      case 'introduced': return '#F59E0B';
      case 'tolerated':  return '#10B981';
      case 'reacted':    return '#EF4444';
      default:           return '#9CA3AF';
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView style={[styles.container, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="food-apple" size={28} color={C.accent} />
          <Text style={[styles.title, { color: C.text }]}>{t('feedingProgression.title')}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>{t('feedingProgression.subtitle')}</Text>
        </View>

        {/* Stage Timeline */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('feedingProgression.stageTimeline')}</Text>
        <View style={[styles.timelineCard, { backgroundColor: C.card, borderColor: C.border }]}>
          {STAGES.map((s, i) => {
            const isActive = currentStage?.stage === s.stage;
            const isPast   = currentStage ? currentStage.stage > s.stage : false;
            return (
              <View key={s.stage}>
                {i > 0 && <View style={[styles.connector, { backgroundColor: isPast ? C.accent : C.border }]} />}
                <TouchableOpacity
                  style={[
                    styles.stageRow,
                    { backgroundColor: isActive ? `${C.accent}15` : C.card, borderColor: isActive ? C.accent : C.border }
                  ]}
                  onPress={() => markStage(s.stage)}
                  accessibilityLabel={t(`feedingProgression.${s.titleKey}`)}
                  accessibilityRole="button"
                >
                  <View style={[styles.stageIconWrap, { backgroundColor: isActive || isPast ? C.accent : C.card, borderColor: C.border }]}>
                    <MaterialCommunityIcons
                      name={s.icon as any}
                      size={18}
                      color={isActive || isPast ? '#fff' : C.muted}
                    />
                  </View>
                  <View style={styles.stageContent}>
                    <View style={styles.stageHeader}>
                      <Text style={[styles.stageName, { color: C.text }]}>{t(`feedingProgression.${s.titleKey}`)}</Text>
                      <Text style={[styles.stageAge, { color: C.muted }]}>{t(`feedingProgression.${s.ageRangeKey}`)}</Text>
                    </View>
                    <Text style={[styles.stageMotor, { color: C.muted }]}>{t(`feedingProgression.${s.motorKey}`)}</Text>
                    <Text style={[styles.stageFood, { color: C.muted }]}>{t(`feedingProgression.${s.foodExamplesKey}`)}</Text>
                    {isActive && (
                      <View style={[styles.currentBadge, { backgroundColor: C.accent }]}>
                        <Text style={styles.currentBadgeText}>{t('feedingProgression.currentStage')}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Allergen Introduction Timeline */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('feedingProgression.allergenTimeline')}</Text>
        <View style={[styles.timelineCard, { backgroundColor: C.card, borderColor: C.border }]}>
          {ALLERGENS.map((a) => {
            const status = getAllergenStatus(a.id);
            const isWindowOpen = currentStage && currentStage.stage >= 2 && status === 'pending';
            return (
              <View key={a.id} style={styles.allergenRow}>
                <View style={styles.allergenLeft}>
                  <Text style={styles.allergenEmoji}>{a.emoji}</Text>
                  <View style={[styles.allergenLine, { backgroundColor: statusColor(status) }]} />
                </View>
                <TouchableOpacity
                  style={[styles.allergenCard, { backgroundColor: C.card, borderColor: C.border }]}
                  onPress={() => openLogModal(a.id)}
                  accessibilityLabel={t(`feedingProgression.${a.nameKey}`)}
                  accessibilityRole="button"
                >
                  <View style={styles.allergenHeader}>
                    <Text style={[styles.allergenName, { color: C.text }]}>{t(`feedingProgression.${a.nameKey}`)}</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusColor(status) }]}>
                      <Text style={styles.statusPillText}>{t(`feedingProgression.${status}`)}</Text>
                    </View>
                  </View>
                  <Text style={[styles.allergenWindow, { color: C.muted }]}>
                    {t('feedingProgression.windowLabel')}: {t(`feedingProgression.${a.windowKey}`)}
                  </Text>
                  {isWindowOpen && (
                    <View style={[styles.alertBanner, { backgroundColor: '#FEF3C7' }]}>
                      <MaterialCommunityIcons name="alert" size={14} color="#D97706" />
                      <Text style={[styles.alertText, { color: '#92400E' }]}>
                        {t('feedingProgression.windowOpenAlert')}
                      </Text>
                    </View>
                  )}
                  {allergenLog[a.id]?.date && (
                    <Text style={[styles.allergenDate, { color: C.muted }]}>
                      {t('feedingProgression.loggedOn')}: {allergenLog[a.id].date}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Log Allergen Modal */}
      <Modal visible={modalVisible} transparent animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>
              {selectedAllergen ? t(`feedingProgression.${ALLERGENS.find(a => a.id === selectedAllergen)?.nameKey ?? ''}`) : ''}
            </Text>
            <Text style={[styles.modalSubtitle, { color: C.muted }]}>{t('feedingProgression.logResult')}</Text>

            {(['introduced', 'tolerated', 'reacted', 'pending'] as AllergenResult[]).map((opt) => (
              <TouchableOpacity key={opt}
                style={[styles.modalOption, { borderColor: C.border, backgroundColor: logResult === opt ? `${C.accent}20` : 'transparent' }]}
                onPress={() => setLogResult(opt)}
              >
                <View style={[styles.radioOuter, { borderColor: logResult === opt ? C.accent : C.muted }]}>
                  {logResult === opt && <View style={[styles.radioInner, { backgroundColor: C.accent }]} />}
                </View>
                <Text style={[styles.modalOptionText, { color: C.text }]}>{t(`feedingProgression.${opt}`)}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.accent }]} onPress={saveAllergenLog}>
              <Text style={styles.modalBtnText}>{t('feedingProgression.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtnSecondary, { borderColor: C.border }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.modalBtnTextSecondary, { color: C.text }]}>{t('feedingProgression.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  timelineCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  stageRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 4,
  },
  connector: { width: 2, height: 8, alignSelf: 'center', marginBottom: -4 },
  stageIconWrap: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    marginRight: 12, borderWidth: 1,
  },
  stageContent: { flex: 1 },
  stageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  stageName: { fontSize: 15, fontWeight: '600' },
  stageAge: { fontSize: 12 },
  stageMotor: { fontSize: 12, marginBottom: 2 },
  stageFood: { fontSize: 12 },
  currentBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start' },
  currentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  allergenRow: { flexDirection: 'row', marginBottom: 12 },
  allergenLeft: { alignItems: 'center', marginRight: 12 },
  allergenEmoji: { fontSize: 22, marginBottom: 4 },
  allergenLine: { width: 2, flex: 1, minHeight: 36 },
  allergenCard: { flex: 1, borderRadius: 10, padding: 12, borderWidth: 1 },
  allergenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  allergenName: { fontSize: 15, fontWeight: '600' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  allergenWindow: { fontSize: 12 },
  allergenDate: { fontSize: 11, marginTop: 4 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', marginTop: 6, padding: 6, borderRadius: 6, gap: 4 },
  alertText: { fontSize: 11, flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, marginBottom: 16 },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  modalOptionText: { fontSize: 15 },
  modalBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalBtnSecondary: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, borderWidth: 1 },
  modalBtnTextSecondary: { fontSize: 15, fontWeight: '600' },
});

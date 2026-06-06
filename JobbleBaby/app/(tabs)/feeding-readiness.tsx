import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const FEEDING_KEY       = '@jobble/feeding_readiness';
const FLAVOR_KEY        = '@jobble/flavor_journal';
const TEXTURE_KEY       = '@jobble/texture_stage';
const ALLERGEN_KEY      = '@jobble/allergen_log';

// ── Data ─────────────────────────────────────────────────────────────────────

const READINESS_SIGNS = [
  { id: 'head_control',      icon: 'head',             label: 'signHeadControl',      desc: 'signHeadControlDesc' },
  { id: 'sitting_support',   icon: 'seat-recline-d',   label: 'signSittingSupport',   desc: 'signSittingSupportDesc' },
  { id: 'tongue_thrust',     icon: 'tongue',           label: 'signTongueThrust',     desc: 'signTongueThrustDesc' },
  { id: 'food_interest',     icon: 'food-apple',       label: 'signFoodInterest',     desc: 'signFoodInterestDesc' },
  { id: 'doubled_weight',   icon: 'scale-balance',    label: 'signDoubledWeight',    desc: 'signDoubledWeightDesc' },
  { id: 'pincer_grasp',      icon: 'hand-pointing-up',  label: 'signPincerGrasp',      desc: 'signPincerGraspDesc' },
];

const FLAVOR_CATEGORIES = ['bland', 'umami', 'sweet', 'sour'] as const;
type FlavorCategory = typeof FLAVOR_CATEGORIES[number];

const TEXTURE_STAGES = [
  { stage: 1, icon: 'food',           label: 'stagePurees',    age: '4-6' },
  { stage: 2, icon: 'food-variant',   label: 'stageMashable',  age: '6-8' },
  { stage: 3, icon: 'food-fork-drink', label: 'stageFinger',    age: '8-10' },
  { stage: 4, icon: 'silverware-fork-knife', label: 'stageFamily', age: '10-12' },
];

const TOP_ALLERGENS = [
  { id: 'peanut',      name: 'Peanut',       emoji: '🥜' },
  { id: 'egg',         name: 'Egg',           emoji: '🥚' },
  { id: 'milk',        name: 'Milk',          emoji: '🥛' },
  { id: 'soy',         name: 'Soy',           emoji: '🫘' },
  { id: 'wheat',       name: 'Wheat',         emoji: '🌾' },
  { id: 'fish',        name: 'Fish',          emoji: '🐟' },
  { id: 'shellfish',   name: 'Shellfish',     emoji: '🦐' },
  { id: 'tree_nuts',   name: 'Tree Nuts',     emoji: '🌰' },
  { id: 'sesame',      name: 'Sesame',        emoji: '🥣' },
];

const IRON_FOODS = [
  { id: 'fortified_cereal', label: 'ironFortifiedCereal' },
  { id: 'pureed_meat',     label: 'ironPureedMeat' },
  { id: 'beans',           label: 'ironBeans' },
  { id: 'tofu',            label: 'ironTofu' },
  { id: 'fish',            label: 'ironFish' },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface FeedingReadiness {
  checklist_done: boolean;
  date: string;
}

interface FlavorEntry {
  id: string;
  date: string;
  category: FlavorCategory;
  food: string;
  amount_g: number;
  reaction_severity: 1 | 2 | 3;
}

interface TextureStage {
  current_stage: number;
  transition_dates: string[];
}

interface AllergenLogEntry {
  allergen: string;
  date_introduced: string;
  reaction_severity: 'none' | 'mild' | 'moderate' | 'severe';
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── Main Component ───────────────────────────────────────────────────────────

export default function FeedingReadinessScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [activeSection, setActiveSection] = useState<string>('checklist');

  // Checklist state
  const [checklistDone, setChecklistDone] = useState<Record<string, boolean>>({});
  const [readinessData, setReadinessData] = useState<FeedingReadiness | null>(null);

  // Flavor journal state
  const [flavorEntries, setFlavorEntries] = useState<FlavorEntry[]>([]);
  const [showFlavorModal, setShowFlavorModal] = useState(false);
  const [flavorForm, setFlavorForm] = useState({ food: '', category: 'bland' as FlavorCategory, amount_g: '', severity: 2 as 1|2|3 });

  // Texture state
  const [textureStage, setTextureStage] = useState<TextureStage>({ current_stage: 1, transition_dates: [] });

  // Allergen state
  const [allergenLog, setAllergenLog] = useState<AllergenLogEntry[]>([]);
  const [showAllergenModal, setShowAllergenModal] = useState(false);
  const [selectedAllergen, setSelectedAllergen] = useState<string>('');
  const [allergenDate, setAllergenDate] = useState('');
  const [allergenSeverity, setAllergenSeverity] = useState<'none' | 'mild' | 'moderate' | 'severe'>('none');

  // Iron state
  const [ironIntake, setIronIntake] = useState<Record<string, boolean>>({});

  // Badge state
  const [showBadge, setShowBadge] = useState(false);

  // ── Load Data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [fr, fj, ts, al] = await Promise.all([
        AsyncStorage.getItem(FEEDING_KEY),
        AsyncStorage.getItem(FLAVOR_KEY),
        AsyncStorage.getItem(TEXTURE_KEY),
        AsyncStorage.getItem(ALLERGEN_KEY),
      ]);
      if (fr) setReadinessData(JSON.parse(fr));
      if (fj) setFlavorEntries(JSON.parse(fj));
      if (ts) setTextureStage(JSON.parse(ts));
      if (al) setAllergenLog(JSON.parse(al));
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Checklist ──────────────────────────────────────────────────────────────

  const toggleCheck = async (signId: string) => {
    const updated = { ...checklistDone, [signId]: !checklistDone[signId] };
    setChecklistDone(updated);
    const allDone = READINESS_SIGNS.every(s => updated[s.id]);
    if (allDone) {
      const data: FeedingReadiness = { checklist_done: true, date: new Date().toISOString() };
      setReadinessData(data);
      await AsyncStorage.setItem(FEEDING_KEY, JSON.stringify(data));
    }
  };

  // ── Flavor Journal ─────────────────────────────────────────────────────────

  const saveFlavorEntry = async () => {
    if (!flavorForm.food.trim()) return;
    const entry: FlavorEntry = {
      id: uid(),
      date: new Date().toISOString(),
      category: flavorForm.category,
      food: flavorForm.food.trim(),
      amount_g: parseInt(flavorForm.amount_g) || 0,
      reaction_severity: flavorForm.severity,
    };
    const updated = [entry, ...flavorEntries];
    setFlavorEntries(updated);
    await AsyncStorage.setItem(FLAVOR_KEY, JSON.stringify(updated));

    // Check Flavor Explorer badge (20+ distinct foods)
    const distinctFoods = new Set(updated.map(e => e.food.toLowerCase())).size;
    if (distinctFoods >= 20) {
      await AsyncStorage.setItem('@jobble/badge_flavor_explorer', 'true');
      setShowBadge(true);
      setTimeout(() => setShowBadge(false), 4000);
    }

    setShowFlavorModal(false);
    setFlavorForm({ food: '', category: 'bland', amount_g: '', severity: 2 });
  };

  // ── Texture Stage ──────────────────────────────────────────────────────────

  const advanceTexture = async () => {
    if (textureStage.current_stage >= 4) return;
    const updated: TextureStage = {
      current_stage: textureStage.current_stage + 1,
      transition_dates: [...textureStage.transition_dates, new Date().toISOString()],
    };
    setTextureStage(updated);
    await AsyncStorage.setItem(TEXTURE_KEY, JSON.stringify(updated));
  };

  // ── Allergen Log ───────────────────────────────────────────────────────────

  const openAllergenModal = (allergenId: string) => {
    const existing = allergenLog.find(a => a.allergen === allergenId);
    setSelectedAllergen(allergenId);
    setAllergenDate(existing?.date_introduced || '');
    setAllergenSeverity(existing?.reaction_severity || 'none');
    setShowAllergenModal(true);
  };

  const saveAllergenEntry = async () => {
    const existing = allergenLog.filter(a => a.allergen !== selectedAllergen);
    const updated: AllergenLogEntry[] = existing.concat([{
      allergen: selectedAllergen,
      date_introduced: allergenDate || new Date().toISOString().split('T')[0],
      reaction_severity: allergenSeverity,
    }]);
    setAllergenLog(updated);
    await AsyncStorage.setItem(ALLERGEN_KEY, JSON.stringify(updated));
    setShowAllergenModal(false);
  };

  // ── Iron Intake ─────────────────────────────────────────────────────────────

  const toggleIron = async (foodId: string) => {
    const updated = { ...ironIntake, [foodId]: !ironIntake[foodId] };
    setIronIntake(updated);
  };

  // ── Alert Cards ─────────────────────────────────────────────────────────────

  const alerts = [
    { id: 'start_solids',    icon: 'food-apple',        color: '#3B82F6', condition: true,  label: 'alertStartSolids' },
    { id: 'allergen_timing', icon: 'alert-circle',      color: '#F59E0B', condition: true,  label: 'alertAllergenTiming' },
    { id: 'iron_rich',       icon: 'nutrition',          color: '#EF4444', condition: true,  label: 'alertIronRich' },
  ];

  // ── Distinct food count ─────────────────────────────────────────────────────

  const distinctFoodCount = new Set(flavorEntries.map(e => e.food.toLowerCase())).size;

  // ─────────────────────────────────────────────────────────────────────────

  const SECTIONS = [
    { key: 'checklist', label: 'readinessChecklist', icon: 'checkbox-marked-circle' },
    { key: 'flavor',     label: 'flavorJournal',      icon: 'palette' },
    { key: 'texture',    label: 'textureTracker',      icon: 'chart-line' },
    { key: 'allergen',   label: 'allergenLog',         icon: 'alert-octagon' },
    { key: 'iron',       label: 'ironReminders',       icon: 'food-drumstick' },
    { key: 'alerts',     label: 'feedingAlerts',       icon: 'bell' },
  ];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 16, paddingBottom: 100 },
    header: { marginBottom: 20 },
    greeting: { fontSize: 13, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 28, fontWeight: '700', color: C.text, marginTop: 4 },
    sectionNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
    sectionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    sectionBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
    sectionBtnText: { fontSize: 11, color: C.muted, fontWeight: '500' },
    sectionBtnTextActive: { color: C.text },
    card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
    cardTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 10 },
    // Checklist
    signRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    signIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    signText: { flex: 1 },
    signLabel: { fontSize: 14, fontWeight: '600', color: C.text },
    signDesc: { fontSize: 11, color: C.muted, marginTop: 2 },
    checkBtn: { padding: 6 },
    // Flavor
    flavorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    flavorChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    flavorChipActive: { backgroundColor: C.accent, borderColor: C.accent },
    flavorChipText: { fontSize: 12, color: C.muted },
    flavorChipTextActive: { color: C.text, fontWeight: '600' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.accent, borderRadius: 12, padding: 14, marginTop: 8 },
    addBtnText: { color: C.text, fontSize: 14, fontWeight: '600' },
    entryCard: { backgroundColor: C.background, borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: C.border },
    entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    entryFood: { fontSize: 13, fontWeight: '600', color: C.text },
    entryMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
    reactionDot: { width: 10, height: 10, borderRadius: 5 },
    flavorBanner: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 },
    // Texture
    stageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    stageActive: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: C.accent + '20', borderWidth: 1, borderColor: C.accent },
    stageInactive: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: C.card },
    stageText: { fontSize: 12, fontWeight: '600', color: C.text, marginTop: 4 },
    stageAge: { fontSize: 10, color: C.muted },
    stageArrow: { paddingHorizontal: 6 },
    // Allergen
    allergenGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    allergenItem: { width: '31%', backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    allergenEmoji: { fontSize: 24, marginBottom: 4 },
    allergenName: { fontSize: 11, color: C.text, textAlign: 'center', fontWeight: '500' },
    allergenStatus: { fontSize: 9, color: C.muted, marginTop: 2 },
    severityNone: { color: '#9CA3AF' },
    severityMild: { color: '#F59E0B' },
    severityModerate: { color: '#F97316' },
    severitySevere: { color: '#EF4444' },
    // Iron
    ironRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    ironCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.accent, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
    ironCheckFilled: { backgroundColor: C.accent },
    ironText: { fontSize: 13, color: C.text, flex: 1 },
    ironBadge: { fontSize: 10, color: C.muted, marginTop: 2 },
    // Alerts
    alertCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginBottom: 8 },
    alertIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    alertText: { flex: 1, fontSize: 12, color: '#fff', fontWeight: '500' },
    // Badge
    badgeBanner: { backgroundColor: C.card, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.accent },
    badgeBannerIcon: { fontSize: 20, marginRight: 10 },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: C.accent, flex: 1 },
    // Modal
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modal: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
    fieldLabel: { fontSize: 12, color: C.muted, marginTop: 12, marginBottom: 6, fontWeight: '500' },
    input: { backgroundColor: C.background, borderRadius: 8, padding: 12, color: C.text, fontSize: 14, borderWidth: 1, borderColor: C.border },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: C.border, alignItems: 'center' },
    cancelBtnText: { color: C.muted, fontSize: 14, fontWeight: '600' },
    saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center' },
    saveBtnText: { color: C.text, fontSize: 14, fontWeight: '600' },
    severityRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    severityBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    severityBtnActive: { borderColor: C.accent, backgroundColor: C.accent + '20' },
    severityBtnText: { fontSize: 12, color: C.muted, fontWeight: '500' },
    severityBtnTextActive: { color: C.text },
    emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 24 },
  });

  const REACTION_COLORS: Record<number, string> = { 1: '#10B981', 2: '#F59E0B', 3: '#EF4444' };
  const SEVERITY_COLORS: Record<string, string> = { none: '#9CA3AF', mild: '#F59E0B', moderate: '#F97316', severe: '#EF4444' };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('feedingReadiness.greeting')}</Text>
          <Text style={styles.title}>🍼 {t('feedingReadiness.title')}</Text>
        </View>

        {/* Badge Banner */}
        {showBadge && (
          <View style={styles.badgeBanner}>
            <Text style={styles.badgeBannerIcon}>🏅</Text>
            <Text style={styles.badgeBannerText}>{t('feedingReadiness.badgeFlavorExplorer')}</Text>
          </View>
        )}

        {/* Section Nav */}
        <View style={styles.sectionNav}>
          {SECTIONS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sectionBtn, activeSection === s.key && styles.sectionBtnActive]}
              onPress={() => setActiveSection(s.key)}
            >
              <MaterialCommunityIcons name={s.icon as any} size={12} color={activeSection === s.key ? C.text : C.muted} />
              <Text style={[styles.sectionBtnText, activeSection === s.key && styles.sectionBtnTextActive]}>
                {t('feedingReadiness.' + s.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Checklist ── */}
        {activeSection === 'checklist' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('feedingReadiness.readinessChecklist')}</Text>
            {READINESS_SIGNS.map(sign => (
              <View key={sign.id} style={styles.signRow}>
                <View style={styles.signIcon}>
                  <MaterialCommunityIcons name={sign.icon as any} size={18} color={C.accent} />
                </View>
                <View style={styles.signText}>
                  <Text style={styles.signLabel}>{t('feedingReadiness.' + sign.label)}</Text>
                  <Text style={styles.signDesc}>{t('feedingReadiness.' + sign.desc)}</Text>
                </View>
                <TouchableOpacity style={styles.checkBtn} onPress={() => toggleCheck(sign.id)}>
                  <MaterialCommunityIcons
                    name={checklistDone[sign.id] ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24} color={checklistDone[sign.id] ? '#10B981' : C.muted}
                  />
                </TouchableOpacity>
              </View>
            ))}
            {readinessData?.checklist_done && (
              <Text style={{ fontSize: 12, color: '#10B981', marginTop: 10, textAlign: 'center' }}>
                ✅ {t('feedingReadiness.checklistComplete')}
              </Text>
            )}
          </View>
        )}

        {/* ── Flavor Journal ── */}
        {activeSection === 'flavor' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('feedingReadiness.flavorJournal')}</Text>
              <Text style={styles.flavorBanner}>
                {t('feedingReadiness.distinctFoods', { count: distinctFoodCount })} · {t('feedingReadiness.week12FlavorMap')}
              </Text>

              {/* Category Filter */}
              <View style={styles.flavorGrid}>
                {FLAVOR_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.flavorChip, flavorForm.category === cat && styles.flavorChipActive]}
                    onPress={() => setFlavorForm(f => ({ ...f, category: cat }))}
                  >
                    <Text style={[styles.flavorChipText, flavorForm.category === cat && styles.flavorChipTextActive]}>
                      {t('feedingReadiness.cat' + cat.charAt(0).toUpperCase() + cat.slice(1))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={() => setShowFlavorModal(true)}>
                <MaterialCommunityIcons name="plus" size={18} color={C.text} />
                <Text style={styles.addBtnText}>{t('feedingReadiness.addFlavorEntry')}</Text>
              </TouchableOpacity>

              {/* Entries */}
              {flavorEntries.length === 0 && <Text style={styles.emptyText}>{t('feedingReadiness.noFlavorEntries')}</Text>}
              {flavorEntries.slice(0, 10).map(entry => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryRow}>
                    <View>
                      <Text style={styles.entryFood}>{entry.food}</Text>
                      <Text style={styles.entryMeta}>
                        {t('feedingReadiness.cat' + entry.category.charAt(0).toUpperCase() + entry.category.slice(1))} · {entry.amount_g}g
                      </Text>
                    </View>
                    <View style={[styles.reactionDot, { backgroundColor: REACTION_COLORS[entry.reaction_severity] }]} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Texture Progression ── */}
        {activeSection === 'texture' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('feedingReadiness.textureTracker')}</Text>
            <View style={styles.stageRow}>
              {TEXTURE_STAGES.map((s, idx) => (
                <View key={s.stage} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <TouchableOpacity
                    style={textureStage.current_stage >= s.stage ? styles.stageActive : styles.stageInactive}
                    onPress={() => textureStage.current_stage < s.stage && advanceTexture()}
                    disabled={textureStage.current_stage >= s.stage}
                  >
                    <MaterialCommunityIcons name={s.icon as any} size={20} color={textureStage.current_stage >= s.stage ? C.accent : C.muted} />
                    <Text style={styles.stageText}>{t('feedingReadiness.' + s.label)}</Text>
                    <Text style={styles.stageAge}>{s.age}m</Text>
                  </TouchableOpacity>
                  {idx < TEXTURE_STAGES.length - 1 && (
                    <MaterialCommunityIcons name="chevron-right" size={16} color={C.muted} style={styles.stageArrow} />
                  )}
                </View>
              ))}
            </View>
            {textureStage.current_stage < 4 && (
              <TouchableOpacity style={styles.addBtn} onPress={advanceTexture}>
                <Text style={styles.addBtnText}>{t('feedingReadiness.advanceStage')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Allergen Log ── */}
        {activeSection === 'allergen' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('feedingReadiness.allergenLog')}</Text>
            <View style={styles.allergenGrid}>
              {TOP_ALLERGENS.map(a => {
                const log = allergenLog.find(l => l.allergen === a.id);
                return (
                  <TouchableOpacity key={a.id} style={styles.allergenItem} onPress={() => openAllergenModal(a.id)}>
                    <Text style={styles.allergenEmoji}>{a.emoji}</Text>
                    <Text style={styles.allergenName}>{a.name}</Text>
                    <Text style={[styles.allergenStatus, log ? { color: SEVERITY_COLORS[log.reaction_severity] } : {}]}>
                      {log ? t('feedingReadiness.' + log.reaction_severity) : t('feedingReadiness.notIntroduced')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Iron Reminders ── */}
        {activeSection === 'iron' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('feedingReadiness.ironReminders')}</Text>
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
              {t('feedingReadiness.ironDesc')}
            </Text>
            {IRON_FOODS.map(food => (
              <TouchableOpacity key={food.id} style={styles.ironRow} onPress={() => toggleIron(food.id)}>
                <View style={[styles.ironCheck, ironIntake[food.id] && styles.ironCheckFilled]}>
                  {ironIntake[food.id] && <MaterialCommunityIcons name="check" size={14} color={C.text} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ironText}>{t('feedingReadiness.' + food.label)}</Text>
                  <Text style={styles.ironBadge}>6m+ {t('feedingReadiness.whoRecommended')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Alerts ── */}
        {activeSection === 'alerts' && (
          <>
            {alerts.map(alert => (
              <View key={alert.id} style={[styles.alertCard, { backgroundColor: alert.color + 'CC' }]}>
                <View style={[styles.alertIconWrap, { backgroundColor: alert.color + '40' }]}>
                  <MaterialCommunityIcons name={alert.icon as any} size={18} color="#fff" />
                </View>
                <Text style={styles.alertText}>{t('feedingReadiness.' + alert.label)}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Flavor Modal ── */}
      <Modal visible={showFlavorModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('feedingReadiness.addFlavorEntry')}</Text>

            <Text style={styles.fieldLabel}>{t('feedingReadiness.foodName')}</Text>
            <TextInput style={styles.input} value={flavorForm.food} onChangeText={f => setFlavorForm(s => ({ ...s, food: f }))} placeholder="e.g. banana" placeholderTextColor={C.muted} />

            <Text style={styles.fieldLabel}>{t('feedingReadiness.category')}</Text>
            <View style={styles.flavorGrid}>
              {FLAVOR_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.flavorChip, flavorForm.category === cat && styles.flavorChipActive]}
                  onPress={() => setFlavorForm(s => ({ ...s, category: cat }))}>
                  <Text style={[styles.flavorChipText, flavorForm.category === cat && styles.flavorChipTextActive]}>
                    {t('feedingReadiness.cat' + cat.charAt(0).toUpperCase() + cat.slice(1))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('feedingReadiness.amountG')}</Text>
            <TextInput style={styles.input} value={flavorForm.amount_g} onChangeText={v => setFlavorForm(s => ({ ...s, amount_g: v }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={C.muted} />

            <Text style={styles.fieldLabel}>{t('feedingReadiness.reactionSeverity')}</Text>
            <View style={styles.severityRow}>
              {([1, 2, 3] as const).map(sev => (
                <TouchableOpacity key={sev} style={[styles.severityBtn, flavorForm.severity === sev && styles.severityBtnActive]}
                  onPress={() => setFlavorForm(s => ({ ...s, severity: sev }))}>
                  <Text style={[styles.severityBtnText, flavorForm.severity === sev && styles.severityBtnTextActive]}>
                    {sev === 1 ? t('feedingReadiness.accepted') : sev === 2 ? t('feedingReadiness.reluctant') : t('feedingReadiness.rejected')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFlavorModal(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveFlavorEntry}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Allergen Modal ── */}
      <Modal visible={showAllergenModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {TOP_ALLERGENS.find(a => a.id === selectedAllergen)?.emoji} {TOP_ALLERGENS.find(a => a.id === selectedAllergen)?.name}
            </Text>

            <Text style={styles.fieldLabel}>{t('feedingReadiness.dateIntroduced')}</Text>
            <TextInput style={styles.input} value={allergenDate} onChangeText={setAllergenDate} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} />

            <Text style={styles.fieldLabel}>{t('feedingReadiness.reactionSeverity')}</Text>
            <View style={styles.severityRow}>
              {(['none', 'mild', 'moderate', 'severe'] as const).map(sev => (
                <TouchableOpacity key={sev} style={[styles.severityBtn, allergenSeverity === sev && styles.severityBtnActive]}
                  onPress={() => setAllergenSeverity(sev)}>
                  <Text style={[styles.severityBtnText, allergenSeverity === sev && styles.severityBtnTextActive]}>
                    {t('feedingReadiness.' + sev)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAllergenModal(false)}>
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveAllergenEntry}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
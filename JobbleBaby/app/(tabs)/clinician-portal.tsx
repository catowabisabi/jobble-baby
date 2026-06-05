import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const VISIT_HISTORY_KEY   = '@jobble/visit_history';
const REPORT_CONFIG_KEY  = '@jobble/clinician_report_config';
const CHECKLIST_KEY      = '@jobble/visit_checklist';
const GROWTH_KEY         = '@jobble/growth_entries';
const MILESTONE_KEY      = '@jobble/milestone_photos';
const TRACKING_KEY       = '@jobble/tracking_entries';
const ALLERGEN_KEY       = '@jobble/allergen_entries';
const PROFILE_KEY        = '@jobble_baby_profile';
const TONGUE_KEY         = '@jobble/tongue_assessment';
const CRY_KEY            = '@jobble/cry_entries';
const REFLEX_KEY         = '@jobble/reflex_entries';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BabyProfile {
  name: string;
  birthDate: string;
  gender?: string;
}

interface VisitRecord {
  id: string;
  date: string;
  doctorName: string;
  clinic: string;
  notes: string;
  actionItems: string[];
}

interface ReportConfig {
  includeGrowth: boolean;
  includeMilestones: boolean;
  includeFeeding: boolean;
  includeSleep: boolean;
  includeCry: boolean;
  includeAllergen: boolean;
  includeAssessments: boolean;
  dateRange: 30 | 60 | 90;
}

interface GrowthEntry {
  id: string;
  date: string;
  height?: number;
  weight?: number;
  percentileHeight?: number;
  percentileWeight?: number;
}

interface MilestoneEntry {
  id: string;
  type: string;
  date: string;
  baby_age?: string;
}

interface TrackingEntry {
  id: string;
  type: string;
  subtype: string;
  time: string;
  date: string;
  note?: string;
}

interface AllergenEntry {
  id: string;
  allergen_id: string;
  date_introduced: string;
  status: string;
  reaction?: string;
}

interface TongueAssessment {
  id: string;
  date: string;
  hazelbaker: number;
  jawNotes: string;
}

interface CryEntry {
  id: string;
  timestamp_start: string;
  duration_minutes: number;
  cause_tag?: string;
}

interface ReflexEntry {
  id: string;
  date: string;
  reflex_type: string;
  status: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  dueAgeMonths?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getAgeInMonths(birthDateStr: string): number {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  } catch { return 0; }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function filterByDays<T extends { date: string }>(entries: T[], days: number): T[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entries.filter(e => new Date(e.date) >= cutoff);
}

// ─── Default Checklist ────────────────────────────────────────────────────────
const DEFAULT_CHECKLIST = (ageMo: number): ChecklistItem[] => [
  { id: 'vax', label: 'Vaccination due — check schedule', checked: false, dueAgeMonths: 2 },
  { id: 'growth', label: 'Growth measurement recorded this month', checked: false },
  { id: 'tongue', label: 'Tongue tie assessment completed', checked: false, dueAgeMonths: 0 },
  { id: 'reflex', label: 'Reflex integration check done', checked: false, dueAgeMonths: 4 },
  { id: 'allergen', label: 'Allergen introduction on track', checked: false, dueAgeMonths: 6 },
  { id: 'milestone', label: 'Recent milestone photo taken', checked: false },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClinicianPortalScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [visitHistory, setVisitHistory] = useState<VisitRecord[]>([]);
  const [config, setConfig] = useState<ReportConfig>({
    includeGrowth: true, includeMilestones: true, includeFeeding: true,
    includeSleep: true, includeCry: true, includeAllergen: true,
    includeAssessments: true, dateRange: 30,
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [growthEntries, setGrowthEntries] = useState<GrowthEntry[]>([]);
  const [milestoneEntries, setMilestoneEntries] = useState<MilestoneEntry[]>([]);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [allergenEntries, setAllergenEntries] = useState<AllergenEntry[]>([]);
  const [tongueEntries, setTongueEntries] = useState<TongueAssessment[]>([]);
  const [cryEntries, setCryEntries] = useState<CryEntry[]>([]);
  const [reflexEntries, setReflexEntries] = useState<ReflexEntry[]>([]);

  const [showAddVisit, setShowAddVisit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [newVisit, setNewVisit] = useState({ date: '', doctorName: '', clinic: '', notes: '', actionItems: '' });
  const [reportGenerated, setReportGenerated] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const [profileRaw, visitRaw, configRaw, checklistRaw, growthRaw, milestoneRaw, trackingRaw, allergenRaw, tongueRaw, cryRaw, reflexRaw] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(VISIT_HISTORY_KEY),
        AsyncStorage.getItem(REPORT_CONFIG_KEY),
        AsyncStorage.getItem(CHECKLIST_KEY),
        AsyncStorage.getItem(GROWTH_KEY),
        AsyncStorage.getItem(MILESTONE_KEY),
        AsyncStorage.getItem(TRACKING_KEY),
        AsyncStorage.getItem(ALLERGEN_KEY),
        AsyncStorage.getItem(TONGUE_KEY),
        AsyncStorage.getItem(CRY_KEY),
        AsyncStorage.getItem(REFLEX_KEY),
      ]);
      if (profileRaw) setProfile(JSON.parse(profileRaw));
      if (visitRaw) setVisitHistory(JSON.parse(visitRaw));
      if (configRaw) setConfig(JSON.parse(configRaw));
      if (checklistRaw) {
        setChecklist(JSON.parse(checklistRaw));
      } else {
        const age = profileRaw ? getAgeInMonths(JSON.parse(profileRaw).birthDate) : 0;
        setChecklist(DEFAULT_CHECKLIST(age));
      }
      if (growthRaw) setGrowthEntries(JSON.parse(growthRaw));
      if (milestoneRaw) setMilestoneEntries(JSON.parse(milestoneRaw));
      if (trackingRaw) setTrackingEntries(JSON.parse(trackingRaw));
      if (allergenRaw) setAllergenEntries(JSON.parse(allergenRaw));
      if (tongueRaw) setTongueEntries(JSON.parse(tongueRaw));
      if (cryRaw) setCryEntries(JSON.parse(cryRaw));
      if (reflexRaw) setReflexEntries(JSON.parse(reflexRaw));
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Save Visit ──────────────────────────────────────────────────────────────
  const saveVisit = async () => {
    if (!newVisit.date || !newVisit.doctorName) {
      Alert.alert(t('clinician.required'), t('clinician.fillRequired'));
      return;
    }
    const visit: VisitRecord = {
      id: Date.now().toString(),
      date: newVisit.date,
      doctorName: newVisit.doctorName,
      clinic: newVisit.clinic,
      notes: newVisit.notes,
      actionItems: newVisit.actionItems.split('\n').filter(a => a.trim()),
    };
    const updated = [visit, ...visitHistory];
    setVisitHistory(updated);
    await AsyncStorage.setItem(VISIT_HISTORY_KEY, JSON.stringify(updated));
    setShowAddVisit(false);
    setNewVisit({ date: '', doctorName: '', clinic: '', notes: '', actionItems: '' });
    // Award badge after 4 visits
    if (updated.length >= 4) await awardBadge('well-baby-champion');
  };

  // ── Delete Visit ───────────────────────────────────────────────────────────
  const deleteVisit = async (id: string) => {
    const updated = visitHistory.filter(v => v.id !== id);
    setVisitHistory(updated);
    await AsyncStorage.setItem(VISIT_HISTORY_KEY, JSON.stringify(updated));
  };

  // ── Toggle Checklist ─────────────────────────────────────────────────────────
  const toggleChecklist = async (itemId: string) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(updated));
  };

  // ── Generate Report ─────────────────────────────────────────────────────────
  const generateReport = async () => {
    setShowReport(true);
    setReportGenerated(true);
    // Award badge after first report
    const prevReports = visitHistory.length;
    if (prevReports >= 0) await awardBadge('prepared-parent');
  };

  // ── Share Report ────────────────────────────────────────────────────────────
  const shareReport = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert(t('clinician.shareError'), t('clinician.shareErrorMsg'));
      return;
    }
    const html = buildHtmlReport();
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      // Fallback: share text summary
      const text = buildTextReport();
      try {
        await Share.share({ message: text, title: t('clinician.visitReport') });
      } catch {}
    }
  };

  // ── Build HTML Report ──────────────────────────────────────────────────────
  const buildHtmlReport = (): string => {
    const babyName = profile?.name || 'Baby';
    const birthDate = profile?.birthDate ? formatDate(profile.birthDate) : 'N/A';
    const ageMo = profile ? getAgeInMonths(profile.birthDate) : 0;
    const filteredGrowth = filterByDays(growthEntries, config.dateRange);
    const filteredMilestones = filterByDays(milestoneEntries, config.dateRange);
    const filteredTracking = filterByDays(trackingEntries, config.dateRange);
    const filteredCry = (() => {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - config.dateRange);
      return cryEntries.filter(e => new Date(e.timestamp_start) >= cutoff);
    })();
    const filteredAllergen = (() => {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - config.dateRange);
      return allergenEntries.filter(e => new Date(e.date_introduced) >= cutoff);
    })();

    const growthRows = filteredGrowth.map(g => `
      <tr><td>${formatDate(g.date)}</td><td>${g.height ? g.height + ' cm' : '-'}</td><td>${g.weight ? g.weight + ' kg' : '-'}</td><td>${g.percentileWeight ? g.percentileWeight + 'th' : '-'}</td></tr>
    `).join('');

    const milestoneRows = filteredMilestones.map(m => `
      <tr><td>${formatDate(m.date)}</td><td>${m.type}</td><td>${m.baby_age || '-'}</td></tr>
    `).join('');

    const feedingEntries = filteredTracking.filter(e => e.type === 'feed');
    const sleepEntries = filteredTracking.filter(e => e.type === 'sleep');

    const latestTongue = tongueEntries.length > 0 ? tongueEntries[tongueEntries.length - 1] : null;
    const latestReflex = reflexEntries.length > 0 ? reflexEntries[reflexEntries.length - 1] : null;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${babyName} — Clinician Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #222; }
    h1 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 8px; }
    h2 { color: #374151; margin-top: 24px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    .section { margin-bottom: 24px; }
    .meta { background: #f0f9ff; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
    .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${babyName} — ${t('clinician.visitReport')}</h1>
  <div class="meta">
    <strong>${t('clinician.babyName')}:</strong> ${babyName}<br>
    <strong>${t('clinician.birthDate')}:</strong> ${birthDate} (${ageMo} ${t('clinician.monthsOld')})<br>
    <strong>${t('clinician.reportDate')}:</strong> ${formatDate(new Date().toISOString())}<br>
    <strong>${t('clinician.dateRange')}:</strong> ${config.dateRange} ${t('clinician.days')}
  </div>

  ${config.includeGrowth ? `
  <div class="section">
    <h2>📈 ${t('clinician.growth')}</h2>
    ${filteredGrowth.length > 0 ? `
    <table><tr><th>${t('clinician.date')}</th><th>${t('clinician.height')}</th><th>${t('clinician.weight')}</th><th>${t('clinician.percentile')}</th></tr>${growthRows}</table>
    ` : `<p>${t('clinician.noData')}</p>`}
  </div>` : ''}

  ${config.includeMilestones ? `
  <div class="section">
    <h2>🏆 ${t('clinician.milestones')}</h2>
    ${filteredMilestones.length > 0 ? `
    <table><tr><th>${t('clinician.date')}</th><th>${t('clinician.type')}</th><th>${t('clinician.babyAge')}</th></tr>${milestoneRows}</table>
    ` : `<p>${t('clinician.noData')}</p>`}
  </div>` : ''}

  ${config.includeFeeding ? `
  <div class="section">
    <h2>🍼 ${t('clinician.feeding')}</h2>
    <p>${t('clinician.totalFeedings')}: ${feedingEntries.length} (${t('clinician.lastNdays').replace('{n}', config.dateRange.toString())})</p>
  </div>` : ''}

  ${config.includeSleep ? `
  <div class="section">
    <h2>🌙 ${t('clinician.sleep')}</h2>
    <p>${t('clinician.totalSleepEntries')}: ${sleepEntries.length} (${t('clinician.lastNdays').replace('{n}', config.dateRange.toString())})</p>
  </div>` : ''}

  ${config.includeCry && filteredCry.length > 0 ? `
  <div class="section">
    <h2>💧 ${t('clinician.cry')}</h2>
    <p>${t('clinician.totalCry')}: ${filteredCry.length} ${t('clinician.episodes')}</p>
  </div>` : ''}

  ${config.includeAllergen && filteredAllergen.length > 0 ? `
  <div class="section">
    <h2>🥜 ${t('clinician.allergens')}</h2>
    <p>${filteredAllergen.length} ${t('clinician.allergensTracked')}</p>
  </div>` : ''}

  ${config.includeAssessments ? `
  <div class="section">
    <h2>🩺 ${t('clinician.assessments')}</h2>
    ${latestTongue ? `<p><strong>${t('clinician.tongueTieScore')}:</strong> ${latestTongue.hazelbaker}/12 (${formatDate(latestTongue.date)})</p>` : ''}
    ${latestReflex ? `<p><strong>${t('clinician.reflexStatus')}:</strong> ${latestReflex.reflex_type} — ${latestReflex.status} (${formatDate(latestReflex.date)})</p>` : ''}
    ${!latestTongue && !latestReflex ? `<p>${t('clinician.noAssessmentData')}</p>` : ''}
  </div>` : ''}

  <div class="section">
    <h2>📋 ${t('clinician.visitHistory')}</h2>
    ${visitHistory.length > 0 ? visitHistory.slice(0, 5).map(v => `
      <div style="margin-bottom:8px;padding:8px;background:#f9fafb;border-radius:6px;">
        <strong>${formatDate(v.date)}</strong> — ${v.doctorName}${v.clinic ? ` (${v.clinic})` : ''}<br>
        ${v.notes ? `<em>${v.notes}</em>` : ''}
        ${v.actionItems.length > 0 ? `<br><span class="badge">${v.actionItems.length} action items</span>` : ''}
      </div>
    `).join('') : `<p>${t('clinician.noVisits')}</p>`}
  </div>

  <p style="color:#9ca3af;font-size:12px;margin-top:32px;">
    Generated by Jobble Baby — ${new Date().toLocaleString()}
  </p>
</body>
</html>`;
  };

  const buildTextReport = (): string => {
    const babyName = profile?.name || 'Baby';
    const ageMo = profile ? getAgeInMonths(profile.birthDate) : 0;
    return `${babyName} — ${t('clinician.visitReport')} (${ageMo} ${t('clinician.monthsOld')})\n\n` +
      `${t('clinician.growth')}: ${growthEntries.length} entries\n` +
      `${t('clinician.milestones')}: ${milestoneEntries.length} entries\n` +
      `${t('clinician.visitHistory')}: ${visitHistory.length} visits logged`;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: C.card },
    headerTitle: { fontSize: 22, fontWeight: '700', color: C.text },
    headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
    section: { marginHorizontal: 16, marginTop: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 10 },
    card: { backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    cardSub: { fontSize: 12, color: C.muted, marginTop: 2 },
    cardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    cardLabel: { fontSize: 13, color: C.muted, width: 90 },
    cardValue: { fontSize: 13, color: C.text, flex: 1 },
    primaryBtn: {
      backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 12,
      paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', marginHorizontal: 16, marginTop: 16,
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
    secondaryBtn: {
      backgroundColor: C.card, borderRadius: 10, paddingVertical: 10,
      paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', marginHorizontal: 16, marginTop: 8,
      borderWidth: 1, borderColor: '#1a56db',
    },
    secondaryBtnText: { color: '#1a56db', fontSize: 14, fontWeight: '500' },
    chip: {
      backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 10,
      paddingVertical: 4, marginRight: 6, marginBottom: 6,
    },
    chipText: { color: '#1e40af', fontSize: 12, fontWeight: '500' },
    chipActive: { backgroundColor: '#1a56db' },
    chipTextActive: { color: '#fff' },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
    checklistItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    checkbox: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 2,
      borderColor: '#1a56db', marginRight: 10, alignItems: 'center', justifyContent: 'center',
    },
    checkText: { fontSize: 13, color: C.text, flex: 1 },
    modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16, textAlign: 'center' },
    input: {
      backgroundColor: C.background, borderRadius: 10, borderWidth: 1, borderColor: C.border,
      paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text, marginBottom: 12,
    },
    inputLabel: { fontSize: 12, color: C.muted, marginBottom: 4, fontWeight: '500' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
    toggleLabel: { fontSize: 14, color: C.text, flex: 1 },
    toggleTrack: {
      width: 44, height: 24, borderRadius: 12, padding: 2,
      justifyContent: 'center',
    },
    emptyState: { textAlign: 'center', paddingVertical: 32, color: C.muted, fontSize: 14 },
    badge: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6 },
    badgeText: { color: '#92400e', fontSize: 11, fontWeight: '600' },
  });

  const Toggle = ({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) => (
    <TouchableOpacity onPress={() => onValueChange(!value)}>
      <View style={[s.toggleTrack, { backgroundColor: value ? '#1a56db' : '#e5e7eb' }]}>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const ageMo = profile ? getAgeInMonths(profile.birthDate) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{t('clinician.title')}</Text>
          <Text style={s.headerSub}>{t('clinician.subtitle')}</Text>
        </View>

        {/* Baby Info Card */}
        {profile && (
          <View style={s.section}>
            <View style={s.card}>
              <Text style={s.cardTitle}>👶 {profile.name}</Text>
              <View style={s.cardRow}><Text style={s.cardLabel}>{t('clinician.birthDate')}</Text><Text style={s.cardValue}>{formatDate(profile.birthDate)}</Text></View>
              <View style={s.cardRow}><Text style={s.cardLabel}>{t('clinician.age')}</Text><Text style={s.cardValue}>{ageMo} {t('clinician.monthsOld')}</Text></View>
              {profile.gender && <View style={s.cardRow}><Text style={s.cardLabel}>{t('clinician.gender')}</Text><Text style={s.cardValue}>{profile.gender}</Text></View>}
            </View>
          </View>
        )}

        {/* Prepare Report Button */}
        <TouchableOpacity style={s.primaryBtn} onPress={generateReport}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.primaryBtnText}>{t('clinician.prepareReport')}</Text>
        </TouchableOpacity>

        {/* Report Config */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clinician.reportSections')}</Text>
          <View style={s.card}>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>{t('clinician.includeGrowth')}</Text>
              <Toggle value={config.includeGrowth} onValueChange={v => setConfig(c => ({ ...c, includeGrowth: v }))} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>{t('clinician.includeMilestones')}</Text>
              <Toggle value={config.includeMilestones} onValueChange={v => setConfig(c => ({ ...c, includeMilestones: v }))} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>{t('clinician.includeFeeding')}</Text>
              <Toggle value={config.includeFeeding} onValueChange={v => setConfig(c => ({ ...c, includeFeeding: v }))} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>{t('clinician.includeSleep')}</Text>
              <Toggle value={config.includeSleep} onValueChange={v => setConfig(c => ({ ...c, includeSleep: v }))} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>{t('clinician.includeCry')}</Text>
              <Toggle value={config.includeCry} onValueChange={v => setConfig(c => ({ ...c, includeCry: v }))} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>{t('clinician.includeAllergen')}</Text>
              <Toggle value={config.includeAllergen} onValueChange={v => setConfig(c => ({ ...c, includeAllergen: v }))} />
            </View>
            <View style={s.divider} />
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>{t('clinician.includeAssessments')}</Text>
              <Toggle value={config.includeAssessments} onValueChange={v => setConfig(c => ({ ...c, includeAssessments: v }))} />
            </View>
            <View style={s.divider} />
            <Text style={s.inputLabel}>{t('clinician.dateRange')}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {([30, 60, 90] as const).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[s.chip, config.dateRange === d && s.chipActive]}
                  onPress={() => setConfig(c => ({ ...c, dateRange: d }))}
                >
                  <Text style={[s.chipText, config.dateRange === d && s.chipTextActive]}>{d} {t('clinician.days')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Pre-Visit Checklist */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clinician.preVisitChecklist')}</Text>
          <View style={s.card}>
            {checklist.length === 0 && <Text style={s.emptyState}>{t('clinician.noChecklist')}</Text>}
            {checklist.map(item => (
              <TouchableOpacity key={item.id} style={s.checklistItem} onPress={() => toggleChecklist(item.id)}>
                <View style={[s.checkbox, item.checked && { backgroundColor: '#1a56db' }]}>
                  {item.checked && <MaterialCommunityIcons name="check" size={14} color="#fff" />}
                </View>
                <Text style={[s.checkText, item.checked && { textDecorationLine: 'line-through', color: C.muted }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Visit History */}
        <View style={s.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={s.sectionTitle}>{t('clinician.visitHistory')}</Text>
            <TouchableOpacity onPress={() => setShowAddVisit(true)}>
              <MaterialCommunityIcons name="plus-circle" size={24} color="#1a56db" />
            </TouchableOpacity>
          </View>
          {visitHistory.length === 0 && <View style={s.card}><Text style={s.emptyState}>{t('clinician.noVisits')}</Text></View>}
          {visitHistory.map(visit => (
            <View key={visit.id} style={s.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={s.cardTitle}>{formatDate(visit.date)}</Text>
                <TouchableOpacity onPress={() => deleteVisit(visit.id)}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <Text style={s.cardSub}>{visit.doctorName}{visit.clinic ? ` · ${visit.clinic}` : ''}</Text>
              {visit.notes ? <Text style={{ fontSize: 13, color: C.text, marginTop: 6 }}>{visit.notes}</Text> : null}
              {visit.actionItems.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                  {visit.actionItems.map((item, i) => (
                    <View key={i} style={s.badge}><Text style={s.badgeText}>{item}</Text></View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clinician.quickStats')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
            {[
              { label: t('clinician.growthEntries'), value: growthEntries.length, icon: 'chart-line' },
              { label: t('clinician.milestoneEntries'), value: milestoneEntries.length, icon: 'trophy-variant' },
              { label: t('clinician.visitCount'), value: visitHistory.length, icon: 'calendar-check' },
              { label: t('clinician.allergenCount'), value: allergenEntries.length, icon: 'food-apple' },
            ].map((stat, i) => (
              <View key={i} style={{ width: '50%', paddingHorizontal: 5, marginBottom: 10 }}>
                <View style={s.card}>
                  <MaterialCommunityIcons name={stat.icon as any} size={20} color="#1a56db" style={{ marginBottom: 4 }} />
                  <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }}>{stat.value}</Text>
                  <Text style={{ fontSize: 11, color: C.muted }}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Visit Modal */}
      <Modal visible={showAddVisit} transparent animationType="slide">
        <View style={s.modal}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{t('clinician.addVisit')}</Text>
            <Text style={s.inputLabel}>{t('clinician.date')} *</Text>
            <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted}
              value={newVisit.date} onChangeText={v => setNewVisit(n => ({ ...n, date: v }))} />
            <Text style={s.inputLabel}>{t('clinician.doctorName')} *</Text>
            <TextInput style={s.input} placeholder={t('clinician.doctorNamePlaceholder')} placeholderTextColor={C.muted}
              value={newVisit.doctorName} onChangeText={v => setNewVisit(n => ({ ...n, doctorName: v }))} />
            <Text style={s.inputLabel}>{t('clinician.clinic')}</Text>
            <TextInput style={s.input} placeholder={t('clinician.clinicPlaceholder')} placeholderTextColor={C.muted}
              value={newVisit.clinic} onChangeText={v => setNewVisit(n => ({ ...n, clinic: v }))} />
            <Text style={s.inputLabel}>{t('clinician.notes')}</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder={t('clinician.notesPlaceholder')} placeholderTextColor={C.muted} multiline
              value={newVisit.notes} onChangeText={v => setNewVisit(n => ({ ...n, notes: v }))} />
            <Text style={s.inputLabel}>{t('clinician.actionItems')} ({t('clinician.onePerLine')})</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder={t('clinician.actionItemsPlaceholder')} placeholderTextColor={C.muted} multiline
              value={newVisit.actionItems} onChangeText={v => setNewVisit(n => ({ ...n, actionItems: v }))} />
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity style={[s.secondaryBtn, { flex: 1, marginRight: 8 }]} onPress={() => setShowAddVisit(false)}>
                <Text style={s.secondaryBtnText}>{t('clinician.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={saveVisit}>
                <Text style={s.primaryBtnText}>{t('clinician.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Preview Modal */}
      <Modal visible={showReport} transparent animationType="slide">
        <View style={s.modal}>
          <View style={[s.modalContent, { maxHeight: '95%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={s.modalTitle}>{t('clinician.reportPreview')}</Text>
              <TouchableOpacity onPress={() => setShowReport(false)}>
                <MaterialCommunityIcons name="close" size={24} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 500 }}>
              <Text style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                {t('clinician.reportGenerated')}: {formatDate(new Date().toISOString())}
              </Text>
              {config.includeGrowth && growthEntries.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: C.text }}>📈 {t('clinician.growth')}</Text>
                  {filterByDays(growthEntries, config.dateRange).slice(-5).map(g => (
                    <Text key={g.id} style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {formatDate(g.date)} · {g.height}cm · {g.weight}kg {g.percentileWeight ? `· ${g.percentileWeight}th %ile` : ''}
                    </Text>
                  ))}
                </View>
              )}
              {config.includeMilestones && milestoneEntries.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: C.text }}>🏆 {t('clinician.milestones')}</Text>
                  {filterByDays(milestoneEntries, config.dateRange).slice(-5).map(m => (
                    <Text key={m.id} style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {formatDate(m.date)} · {m.type}
                    </Text>
                  ))}
                </View>
              )}
              {config.includeFeeding && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: C.text }}>🍼 {t('clinician.feeding')}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>
                    {filterByDays(trackingEntries, config.dateRange).filter(e => e.type === 'feed').length} {t('clinician.feedingsLogged')}
                  </Text>
                </View>
              )}
              {config.includeSleep && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: C.text }}>🌙 {t('clinician.sleep')}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>
                    {filterByDays(trackingEntries, config.dateRange).filter(e => e.type === 'sleep').length} {t('clinician.sleepEntriesLogged')}
                  </Text>
                </View>
              )}
              {config.includeCry && cryEntries.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: C.text }}>💧 {t('clinician.cry')}</Text>
                  <Text style={{ fontSize: 12, color: C.muted }}>
                    {((): number => { const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - config.dateRange); return cryEntries.filter(e => new Date(e.timestamp_start) >= cutoff).length; })()} {t('clinician.cryEpisodesLogged')}
                  </Text>
                </View>
              )}
              {config.includeAssessments && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: '600', fontSize: 14, color: C.text }}>🩺 {t('clinician.assessments')}</Text>
                  {tongueEntries.length > 0 && <Text style={{ fontSize: 12, color: C.muted }}>{t('clinician.tongueTieScore')}: {tongueEntries[tongueEntries.length-1].hazelbaker}/12</Text>}
                  {reflexEntries.length > 0 && <Text style={{ fontSize: 12, color: C.muted }}>{t('clinician.reflexStatus')}: {reflexEntries[reflexEntries.length-1].reflex_type}</Text>}
                  {!tongueEntries.length && !reflexEntries.length && <Text style={{ fontSize: 12, color: C.muted }}>{t('clinician.noAssessmentData')}</Text>}
                </View>
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <TouchableOpacity style={[s.secondaryBtn, { flex: 1, marginRight: 8 }]} onPress={() => setShowReport(false)}>
                <Text style={s.secondaryBtnText}>{t('clinician.close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.primaryBtn, { flex: 1, marginTop: 0 }]} onPress={shareReport}>
                <MaterialCommunityIcons name="share-variant" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={s.primaryBtnText}>{t('clinician.share')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

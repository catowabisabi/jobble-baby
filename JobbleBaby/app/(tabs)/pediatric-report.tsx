import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { STORAGE_KEYS } from '../../store/storage-keys';

const GROWTH_KEY = STORAGE_KEYS.GROWTH_ENTRIES;
const MILESTONE_KEY = STORAGE_KEYS.MILESTONE_PHOTOS;
const TRACKING_KEY = STORAGE_KEYS.TRACKING_ENTRIES;
const ALLERGEN_KEY = STORAGE_KEYS.ALLERGEN_ENTRIES;
const PROFILE_KEY = '@jobble_baby_profile';

interface BabyProfile { name: string; birthDate: string; gender: string; }
interface GrowthEntry { id: string; date: string; height: number; weight: number; }
interface MilestoneEntry { id: string; type: string; date: string; baby_age: string; }
interface TrackingEntry { id: string; type: string; subtype: string; time: string; date: string; }
interface AllergenEntry { id: string; allergen_id: string; date_introduced: string; status: string; }

// WHO percentile data for growth table
const WHO_PERCENTILE_LABELS = ['3rd', '15th', '50th', '85th', '97th'];

function getAgeInMonths(birthDateStr: string): number {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  } catch { return 0; }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

function buildHtmlReport(
  profile: BabyProfile | null,
  growthEntries: GrowthEntry[],
  milestoneEntries: MilestoneEntry[],
  trackingEntries: TrackingEntry[],
  allergenEntries: AllergenEntry[],
  t: (key: string) => string
): string {
  const babyName = profile?.name || 'Baby';
  const ageMonths = profile?.birthDate ? getAgeInMonths(profile.birthDate) : 0;
  const gender = profile?.gender || '';
  const generatedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Growth table rows
  const growthRows = growthEntries.slice(0, 20).map(e => {
    return `<tr>
      <td>${formatDate(e.date)}</td>
      <td>${e.weight.toFixed(2)} kg</td>
      <td>${e.height.toFixed(1)} cm</td>
    </tr>`;
  }).join('');

  // Milestone rows
  const milestoneRows = milestoneEntries.slice(0, 20).map(m => {
    return `<tr>
      <td>${m.type}</td>
      <td>${formatDate(m.date)}</td>
      <td>${m.baby_age}</td>
    </tr>`;
  }).join('');

  // Feeding summary (last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const feedingEntries = trackingEntries.filter(e => e.type === 'feed' && e.date >= sevenDaysAgo);
  const sleepEntries = trackingEntries.filter(e => e.type === 'sleep' && e.date >= sevenDaysAgo);
  const feedingCount = feedingEntries.length;
  const sleepCount = sleepEntries.length;

  // Allergen rows
  const allergenRows = allergenEntries.map(a => {
    return `<tr>
      <td>${a.allergen_id}</td>
      <td>${a.date_introduced ? formatDate(a.date_introduced) : 'Not introduced'}</td>
      <td>${a.status}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto; }
  h1 { color: #1a1a2e; border-bottom: 3px solid #3B82F6; padding-bottom: 10px; margin-bottom: 8px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
  h2 { color: #3B82F6; margin-top: 28px; border-left: 4px solid #3B82F6; padding-left: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
  th { background: #f0f4ff; color: #1a1a2e; font-weight: 600; }
  tr:nth-child(even) { background: #fafbff; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
  .summary-card { background: #f0f4ff; border-radius: 8px; padding: 16px; border-left: 4px solid #3B82F6; }
  .summary-card h3 { margin: 0 0 8px 0; color: #3B82F6; font-size: 14px; }
  .summary-card p { margin: 0; font-size: 24px; font-weight: bold; color: #1a1a2e; }
  .section { page-break-inside: avoid; }
  .no-data { color: #999; font-style: italic; font-size: 13px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 11px; text-align: center; }
</style>
</head><body>
<h1>${babyName} — Pediatric Health Report</h1>
<p class="subtitle">Generated: ${generatedDate} &nbsp;|&nbsp; Baby age: ${ageMonths} months (${gender})</p>

<div class="summary-grid">
  <div class="summary-card"><h3>Feeds (7 days)</h3><p>${feedingCount} entries</p></div>
  <div class="summary-card"><h3>Sleep logs (7 days)</h3><p>${sleepCount} entries</p></div>
</div>

<h2>Growth Records</h2>
${growthEntries.length > 0
  ? `<table><thead><tr><th>Date</th><th>Weight</th><th>Height</th></tr></thead><tbody>${growthRows}</tbody></table>`
  : '<p class="no-data">No growth entries recorded yet.</p>'}

<h2>Milestones</h2>
${milestoneEntries.length > 0
  ? `<table><thead><tr><th>Type</th><th>Date</th><th>Baby Age</th></tr></thead><tbody>${milestoneRows}</tbody></table>`
  : '<p class="no-data">No milestones recorded yet.</p>'}

<h2>Allergen Status</h2>
${allergenEntries.length > 0
  ? `<table><thead><tr><th>Allergen</th><th>Date Introduced</th><th>Status</th></tr></thead><tbody>${allergenRows}</tbody></table>`
  : '<p class="no-data">No allergen entries recorded yet.</p>'}

<div class="footer">
  Generated by Jobble Baby — for pediatrician reference only. Not a substitute for professional medical advice.
</div>
</body></html>`;
}

export default function PediatricReportScreen() {
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [growthEntries, setGrowthEntries] = useState<GrowthEntry[]>([]);
  const [milestoneEntries, setMilestoneEntries] = useState<MilestoneEntry[]>([]);
  const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
  const [allergenEntries, setAllergenEntries] = useState<AllergenEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  useEffect(() => {
    const load = async () => {
      try {
        const [profRaw, growthRaw, milestoneRaw, trackingRaw, allergenRaw] = await Promise.all([
          safeGetItem(PROFILE_KEY),
          safeGetItem(GROWTH_KEY),
          safeGetItem(MILESTONE_KEY),
          safeGetItem(TRACKING_KEY),
          safeGetItem(ALLERGEN_KEY),
        ]);
        if (profRaw) setProfile(JSON.parse(profRaw));
        if (growthRaw) setGrowthEntries(JSON.parse(growthRaw));
        if (milestoneRaw) setMilestoneEntries(JSON.parse(milestoneRaw));
        if (trackingRaw) setTrackingEntries(JSON.parse(trackingRaw));
        if (allergenRaw) setAllergenEntries(JSON.parse(allergenRaw));
      } catch (e) { /* silent */ }
    };
    load();
  }, []);

  const doExport = async () => {
    setLoading(true);
    try {
      const html = buildHtmlReport(profile, growthEntries, milestoneEntries, trackingEntries, allergenEntries, t);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: t('pediatricReport.shareTitle') || 'Export Pediatric Report' });
      } else {
        Alert.alert('Export Complete', `PDF saved at:\n${uri}`);
      }
      await awardBadge('pediatric_report');
    } catch (e) {
      Alert.alert('Export Failed', String(e));
    } finally {
      setLoading(false);
    }
  };

  const babyAgeMonths = profile?.birthDate ? getAgeInMonths(profile.birthDate) : 0;

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    infoLabel: { fontSize: 13, color: C.muted, width: 100 },
    infoValue: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
    sectionTitle: {
      fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 12, marginTop: 8,
    },
    dataRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    dataType: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
    dataDate: { fontSize: 12, color: C.muted },
    dataAge: { fontSize: 12, color: C.accent, marginLeft: 8 },
    noData: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 16 },
    exportBtn: {
      backgroundColor: C.accent,
      borderRadius: 16,
      padding: 18,
      alignItems: 'center',
      marginTop: 8,
    },
    exportBtnText: { fontSize: 16, fontWeight: '600', color: C.text },
    emptySection: { marginBottom: 16 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('pediatricReport.title') || 'Medical'}</Text>
          <Text style={styles.title}>{t('pediatricReport.reportTitle') || 'Pediatric Report'}</Text>
        </View>

        {/* Baby Info Card */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>{t('pediatricReport.babyInfo') || 'Baby Info'}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('pediatricReport.name')}</Text>
            <Text style={styles.infoValue}>{profile?.name || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('pediatricReport.birthDate')}</Text>
            <Text style={styles.infoValue}>{profile?.birthDate ? formatDate(profile.birthDate) : '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('pediatricReport.ageMos') || 'Age'}</Text>
            <Text style={styles.infoValue}>{babyAgeMonths} months</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>{t('pediatricReport.gender')}</Text>
            <Text style={styles.infoValue}>{profile?.gender || '—'}</Text>
          </View>
        </View>

        {/* Growth Section */}
        <View style={styles.emptySection}>
          <Text style={styles.sectionTitle}>{t('pediatricReport.growthSection') || 'Growth Records'}</Text>
          <View style={styles.card}>
            {growthEntries.length === 0
              ? <Text style={styles.noData}>{t('pediatricReport.noData') || 'No growth entries yet'}</Text>
              : growthEntries.slice(0, 10).map(e => (
                <View key={e.id} style={styles.dataRow}>
                  <View>
                    <Text style={styles.dataDate}>{formatDate(e.date)}</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: C.text }}>{e.weight.toFixed(2)} kg · {e.height.toFixed(1)} cm</Text>
                </View>
              ))
            }
          </View>
        </View>

        {/* Milestone Section */}
        <View style={styles.emptySection}>
          <Text style={styles.sectionTitle}>{t('pediatricReport.milestoneSection') || 'Milestones'}</Text>
          <View style={styles.card}>
            {milestoneEntries.length === 0
              ? <Text style={styles.noData}>{t('pediatricReport.noData') || 'No milestones yet'}</Text>
              : milestoneEntries.slice(0, 10).map(m => (
                <View key={m.id} style={styles.dataRow}>
                  <Text style={styles.dataType}>{m.type}</Text>
                  <Text style={styles.dataDate}>{formatDate(m.date)}</Text>
                  <Text style={styles.dataAge}>{m.baby_age}</Text>
                </View>
              ))
            }
          </View>
        </View>

        {/* Allergen Section */}
        <View style={styles.emptySection}>
          <Text style={styles.sectionTitle}>{t('pediatricReport.allergenSection') || 'Allergens'}</Text>
          <View style={styles.card}>
            {allergenEntries.length === 0
              ? <Text style={styles.noData}>{t('pediatricReport.noData') || 'No allergen entries yet'}</Text>
              : allergenEntries.map(a => (
                <View key={a.id} style={styles.dataRow}>
                  <Text style={styles.dataType}>{a.allergen_id}</Text>
                  <Text style={styles.dataDate}>{a.date_introduced ? formatDate(a.date_introduced) : '—'}</Text>
                  <Text style={[styles.dataAge, { color: a.status === 'tolerated' ? '#10B981' : a.status === 'reaction' ? '#EF4444' : C.muted }]}>{a.status}</Text>
                </View>
              ))
            }
          </View>
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportBtn} onPress={doExport} disabled={loading}>
                        accessibilityLabel="TouchableOpacity in pediatric-report"
          <MaterialCommunityIcons name="file-pdf-box" size={22} color={C.text} style={{ marginRight: 8 }} />
          <Text style={styles.exportBtnText}>
            {loading ? (t('pediatricReport.generating') || 'Generating...') : (t('pediatricReport.exportPdf') || 'Export PDF')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS, STATUS_COLORS } from '../theme';
import enTranslations from '../i18n/en.json';
import zhTranslations from '../i18n/zh.json';
import appJson from '../../app.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TranslationKeys = { [key: string]: any };

interface CheckIssue {
  file?: string;
  line?: number;
  message: string;
}

interface CheckResult {
  status: 'pass' | 'fail' | 'skip' | 'pending';
  issues: CheckIssue[];
}

interface AllChecks {
  i18n: CheckResult;
  hardcoded: CheckResult;
  metadata: CheckResult;
  build: CheckResult;
}

// Recursively get all leaf key paths from translation object
function getNestedKeys(obj: TranslationKeys, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getNestedKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Check if a nested key exists in translation object
function keyExists(obj: TranslationKeys, path: string): boolean {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }
  return true;
}

// Extract t('key') calls from content
function extractKeys(content: string): { key: string; line: number }[] {
  const results: { key: string; line: number }[] = [];
  const lines = content.split('\n');
  const regex = /t\s*\(\s*['"]([^'"]+)['"]\s*(?:,|\))/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match;
    while ((match = regex.exec(line)) !== null) {
      results.push({ key: match[1], line: i + 1 });
    }
  }
  return results;
}

// Parse en and zh translations
const enKeys = new Set(getNestedKeys(enTranslations));
const zhKeys = new Set(getNestedKeys(zhTranslations));

// Pre-defined map of t() keys used in the app with their approximate locations
// This is a snapshot - in production this could be generated at build time
const KNOWN_T_KEYS = [
  // tabs
  'tabs.home', 'tabs.allergens', 'tabs.tracking', 'tabs.schedule', 'tabs.growth',
  'tabs.products', 'tabs.milestones', 'tabs.criticalPeriods', 'tabs.vestibularAssessment',
  'tabs.profile', 'tabs.villageNetwork', 'tabs.developmentRadar', 'tabs.sleepTraining',
  'tabs.sleepAssociation', 'tabs.teething', 'tabs.monitorCorrelation', 'tabs.milkPrep',
  'tabs.shiftHandoff', 'tabs.feedingReadiness', 'tabs.emergencySos', 'tabs.doctorVisit',
  'tabs.sleepDebt', 'tabs.tummyTime', 'tabs.bottleRefusal', 'tabs.bottleFeeding',
  'tabs.gravityFeeding', 'tabs.gearCheck', 'tabs.safetyAudit', 'tabs.homeSafety',
  'tabs.reflexTracker', 'tabs.landauReflex', 'tabs.pincerGrasp', 'tabs.hipClick',
  'tabs.weaningRash', 'tabs.oralMotor', 'tabs.moroReflex', 'tabs.tongueTie',
  'tabs.jetLag', 'tabs.fontanelle', 'tabs.medicineDose', 'tabs.milkTransfer',
  'tabs.pediatricReport', 'tabs.cryAnalyzer', 'tabs.gutBrainAxis', 'tabs.circadian',
  'tabs.reflexIntegration', 'tabs.projection', 'tabs.clinicianPortal', 'tabs.jaundice',
  'tabs.jaundiceThreshold', 'tabs.iotSecurity', 'tabs.bondingJournal', 'tabs.habitReset',
  'tabs.caregiverFatigue', 'tabs.colicRelief', 'tabs.feedingReadiness', 'tabs.phototherapyComfort',
  'tabs.eightMonthStorm', 'tabs.procedureRecovery', 'tabs.thermalRegulation', 'tabs.constellation',
  'tabs.launchChecklist', 'tabs.growthMontage', 'tabs.regressionNavigator', 'tabs.fontanelleHydration',
  'tabs.bilateralCoordination', 'tabs.sleepArchitecture', 'tabs.appstoreChecklist', 'tabs.sensoryIntegration',
  'tabs.reflexVisualMotor', 'tabs.autonomicReadiness', 'tabs.strangerDanger', 'tabs.asymmetricGrowth',
  'tabs.cupFeedingTransition', 'tabs.solidFood', 'tabs.thermalRegulation', 'tabs.diaperCream',
  // preSubmissionQa
  'preSubmissionQa.title', 'preSubmissionQa.runChecks', 'preSubmissionQa.i18nCheck',
  'preSubmissionQa.hardcodedCheck', 'preSubmissionQa.metadataCheck', 'preSubmissionQa.buildCheck',
  'preSubmissionQa.pass', 'preSubmissionQa.fail', 'preSubmissionQa.skip',
  'preSubmissionQa.noIssues', 'preSubmissionQa.issuesFound', 'preSubmissionQa.subtitle',
  'preSubmissionQa.checksSummary', 'preSubmissionQa.runningChecks',
  // Common
  'common.cancel', 'common.confirm', 'common.save', 'common.delete', 'common.edit',
  'common.back', 'common.next', 'common.done', 'common.error', 'common.success',
];

function checkI18nValidation(): CheckResult {
  const missingEn: CheckIssue[] = [];
  const missingZh: CheckIssue[] = [];

  for (const key of KNOWN_T_KEYS) {
    if (!enKeys.has(key)) {
      missingEn.push({ message: `Key "${key}" missing in en.json` });
    }
    if (!zhKeys.has(key)) {
      missingZh.push({ message: `Key "${key}" missing in zh.json` });
    }
  }

  const allIssues = [...missingEn, ...missingZh];

  return {
    status: allIssues.length === 0 ? 'pass' : 'fail',
    issues: allIssues.slice(0, 30), // Limit displayed issues
  };
}

function checkHardcodedStrings(): CheckResult {
  // At runtime in React Native, we cannot scan source files
  // This check would need to be done as a pre-build validation
  // For now, we skip this check but provide guidance
  return {
    status: 'skip',
    issues: [{
      message: 'Hardcoded string detection requires build-time analysis. Run: node scripts/check-hardcoded-strings.js',
    }],
  };
}

function checkMetadata(): CheckResult {
  const issues: CheckIssue[] = [];
  const expo = appJson.expo || {};

  if (!expo.name) {
    issues.push({ message: 'Missing expo.name in app.json' });
  }
  if (!expo.version) {
    issues.push({ message: 'Missing expo.version in app.json' });
  }
  if (!expo.ios?.bundleIdentifier) {
    issues.push({ message: 'Missing expo.ios.bundleIdentifier in app.json' });
  }
  if (!expo.android?.package) {
    issues.push({ message: 'Missing expo.android.package in app.json' });
  }

  return {
    status: issues.length === 0 ? 'pass' : 'fail',
    issues,
  };
}

function checkBuildArtifacts(): CheckResult {
  // At runtime we cannot reliably check if build artifacts exist
  // because they may be on a different machine / not bundled with the app
  // We skip this check at runtime
  return {
    status: 'skip',
    issues: [{
      message: 'Build artifact check must be run locally before submission. Ensure android/app/build and ios/ exist.',
    }],
  };
}

export default function PreSubmissionQAScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme] || COLORS.light;

  const [checks, setChecks] = useState<AllChecks>({
    i18n: { status: 'pending', issues: [] },
    hardcoded: { status: 'pending', issues: [] },
    metadata: { status: 'pending', issues: [] },
    build: { status: 'pending', issues: [] },
  });
  const [isRunning, setIsRunning] = useState(false);

  const runAllChecks = useCallback(() => {
    setIsRunning(true);
    setChecks({
      i18n: { status: 'pending', issues: [] },
      hardcoded: { status: 'pending', issues: [] },
      metadata: { status: 'pending', issues: [] },
      build: { status: 'pending', issues: [] },
    });

    // Run checks synchronously since they're now simple functions
    setTimeout(() => {
      setChecks({
        i18n: checkI18nValidation(),
        hardcoded: checkHardcodedStrings(),
        metadata: checkMetadata(),
        build: checkBuildArtifacts(),
      });
      setIsRunning(false);
    }, 100);
  }, []);

  useEffect(() => {
    runAllChecks();
  }, [runAllChecks]);

  const getStatusColor = (status: CheckResult['status']) => {
    switch (status) {
      case 'pass':
        return STATUS_COLORS.good;
      case 'fail':
        return STATUS_COLORS.error;
      case 'skip':
        return STATUS_COLORS.warning;
      default:
        return C.muted;
    }
  };

  const getStatusLabel = (status: CheckResult['status']) => {
    switch (status) {
      case 'pass':
        return t('preSubmissionQa.pass') || 'PASS';
      case 'fail':
        return t('preSubmissionQa.fail') || 'FAIL';
      case 'skip':
        return t('preSubmissionQa.skip') || 'SKIP';
      default:
        return '...';
    }
  };

  const renderCheckSection = (
    titleKey: string,
    emoji: string,
    result: CheckResult,
  ) => {
    const statusColor = getStatusColor(result.status);

    return (
      <View style={[styles.section, { backgroundColor: C.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>{emoji}</Text>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t(titleKey)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(result.status)}</Text>
          </View>
        </View>

        {result.status === 'pending' ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={[styles.loadingText, { color: C.muted }]}>{t('preSubmissionQa.runningChecks')}</Text>
          </View>
        ) : result.issues.length === 0 ? (
          <Text style={[styles.noIssues, { color: STATUS_COLORS.good }]}>
            {t('preSubmissionQa.noIssues') || 'No issues found'}
          </Text>
        ) : (
          <View style={styles.issuesList}>
            <Text style={[styles.issuesHeader, { color: C.text }]}>
              {t('preSubmissionQa.issuesFound') || 'Issues found'}:
            </Text>
            {result.issues.slice(0, 20).map((issue, index) => (
              <Text key={index} style={[styles.issueText, { color: statusColor }]}>
                {issue.file && issue.line ? `${issue.file}:${issue.line} - ` : ''}
                {issue.message}
              </Text>
            ))}
            {result.issues.length > 20 && (
              <Text style={[styles.moreIssues, { color: C.muted }]}>
                ... and {result.issues.length - 20} more
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const passedChecks = Object.values(checks).filter((r) => r.status === 'pass').length;
  const failedChecks = Object.values(checks).filter((r) => r.status === 'fail').length;
  const totalChecks = 4;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>
            🔍 {t('preSubmissionQa.title') || 'Pre-Submission QA'}
          </Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>
            {t('preSubmissionQa.subtitle') || 'Automated validation for App Store submission'}
          </Text>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryBadge, { backgroundColor: STATUS_COLORS.good }]}>
              <Text style={styles.summaryBadgeText}>{passedChecks} ✓</Text>
            </View>
            <View style={[styles.summaryBadge, { backgroundColor: STATUS_COLORS.error }]}>
              <Text style={styles.summaryBadgeText}>{failedChecks} ✗</Text>
            </View>
            <View style={[styles.summaryBadge, { backgroundColor: STATUS_COLORS.warning }]}>
              <Text style={styles.summaryBadgeText}>
                {Object.values(checks).filter((r) => r.status === 'skip').length} ⊘
              </Text>
            </View>
            <Text style={[styles.summaryText, { color: C.muted }]}>
              {t('preSubmissionQa.checksSummary') || `${totalChecks} checks`}
            </Text>
          </View>
        </View>

        {isRunning && (
          <View style={[styles.loadingContainer, { backgroundColor: C.card }]}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={[styles.loadingContainerText, { color: C.muted }]}>
              {t('preSubmissionQa.runningChecks') || 'Running checks...'}
            </Text>
          </View>
        )}

        {renderCheckSection('preSubmissionQa.i18nCheck', '🌐', checks.i18n)}
        {renderCheckSection('preSubmissionQa.hardcodedCheck', '📝', checks.hardcoded)}
        {renderCheckSection('preSubmissionQa.metadataCheck', '📋', checks.metadata)}
        {renderCheckSection('preSubmissionQa.buildCheck', '📦', checks.build)}

        <TouchableOpacity
          style={[styles.rerunButton, { backgroundColor: C.accent }]}
          onPress={runAllChecks}
          disabled={isRunning}
          accessibilityLabel={t('preSubmissionQa.runChecks') || 'Run checks'}
        >
          <Text style={styles.rerunButtonText}>
            {t('preSubmissionQa.runChecks') || 'Re-run Checks'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { borderRadius: 12, padding: 16, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  summaryBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  summaryBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  summaryText: { fontSize: 14 },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  loadingContainerText: { marginLeft: 12, fontSize: 16 },
  section: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  sectionEmoji: { fontSize: 20, marginRight: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingTop: 0 },
  loadingText: { marginLeft: 8, fontSize: 14 },
  noIssues: { fontSize: 14, fontWeight: '500', padding: 12, paddingTop: 0 },
  issuesList: { paddingHorizontal: 14, paddingBottom: 14 },
  issuesHeader: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  issueText: { fontSize: 13, marginBottom: 4, lineHeight: 18 },
  moreIssues: { fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  rerunButton: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  rerunButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

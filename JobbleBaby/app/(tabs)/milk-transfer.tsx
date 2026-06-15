import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { awardBadge } from '../utils/badgeService';
import { STORAGE_KEYS } from '../../store/storage-keys';

const HISTORY_KEY = STORAGE_KEYS.MILK_TRANSFER_HISTORY;
const STATS_KEY = STORAGE_KEYS.MILK_TRANSFER_STATS;

type BreastSide = 'left' | 'right' | 'both';

interface MilkTransferEntry {
  id: string;
  date: string;
  side: BreastSide;
  durationSeconds: number;
  preWeight: number;
  postWeight: number;
  offeredMl: number;
  transferredMl: number;
  efficiency: number;
}

interface SideStats {
  totalSeconds: number;
  sessionCount: number;
}

// Efficiency colors
const EFF_GREEN = '#22c55e';
const EFF_YELLOW = '#eab308';
const EFF_RED = '#ef4444';

const MILK_BLUE = '#60A5FA';
const MILK_AMBER = '#F59E0B';

const EFFICIENCY_THRESHOLD_GOOD = 80;
const EFFICIENCY_THRESHOLD_MODERATE = 50;

function getEfficiencyColor(eff: number): string {
  if (eff >= EFFICIENCY_THRESHOLD_GOOD) return EFF_GREEN;
  if (eff >= EFFICIENCY_THRESHOLD_MODERATE) return EFF_YELLOW;
  return EFF_RED;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimerDisplay(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export default function MilkTransferScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [history, setHistory] = useState<MilkTransferEntry[]>([]);
  const [sideStats, setSideStats] = useState<Record<BreastSide, SideStats>>({
    left: { totalSeconds: 0, sessionCount: 0 },
    right: { totalSeconds: 0, sessionCount: 0 },
    both: { totalSeconds: 0, sessionCount: 0 },
  });

  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedSide, setSelectedSide] = useState<BreastSide>('left');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [preWeight, setPreWeight] = useState('');
  const [postWeight, setPostWeight] = useState('');
  const [offeredMl, setOfferedMl] = useState('');

  const [currentView, setCurrentView] = useState<'session' | 'chart' | 'history'>('session');

  useEffect(() => {
    const load = async () => {
      try {
        const [histRaw, statsRaw] = await Promise.all([
          safeGetItem(HISTORY_KEY),
          safeGetItem(STATS_KEY),
        ]);
        if (histRaw) setHistory(JSON.parse(histRaw));
        if (statsRaw) setSideStats(JSON.parse(statsRaw));
      } catch {}
    };
    load();
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const startTimer = () => setIsRunning(true);
  const stopTimer = () => setIsRunning(false);
  const resetTimer = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  const saveSession = async () => {
    const pre = parseFloat(preWeight);
    const post = parseFloat(postWeight);
    const offered = parseFloat(offeredMl);

    if (isNaN(pre) || isNaN(post) || pre <= 0 || post <= 0) {
      Alert.alert(t('milkTransfer.alertTitle') || 'Missing Data', t('milkTransfer.enterWeight') || 'Please enter both pre and post weights.');
      return;
    }

    const transferred = Math.max(0, pre - post); // ml (1g ≈ 1ml)
    const efficiency = offered > 0 ? Math.round((transferred / offered) * 100) : 0;

    const entry: MilkTransferEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      side: selectedSide,
      durationSeconds: elapsedSeconds,
      preWeight: pre,
      postWeight: post,
      offeredMl: offered || 0,
      transferredMl: transferred,
      efficiency,
    };

    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated);
    await safeSetItem(HISTORY_KEY, JSON.stringify(updated));

    const updatedStats = { ...sideStats };
    const sideKey = selectedSide;
    updatedStats[sideKey] = {
      totalSeconds: updatedStats[sideKey].totalSeconds + elapsedSeconds,
      sessionCount: updatedStats[sideKey].sessionCount + 1,
    };
    setSideStats(updatedStats);
    await safeSetItem(STATS_KEY, JSON.stringify(updatedStats));

    const totalSessions = Object.values(updatedStats).reduce((sum, s) => sum + s.sessionCount, 0);
    if (totalSessions >= 10) {
      await awardBadge('efficient_feeder');
    }

    setPreWeight('');
    setPostWeight('');
    setOfferedMl('');
    resetTimer();
  };

  const calcEfficiency = (): number => {
    const pre = parseFloat(preWeight);
    const post = parseFloat(postWeight);
    const offered = parseFloat(offeredMl);
    if (isNaN(pre) || isNaN(post) || pre <= 0 || post <= 0) return 0;
    const transferred = Math.max(0, pre - post);
    return offered > 0 ? Math.round((transferred / offered) * 100) : 0;
  };

  const previewEff = calcEfficiency();
  const previewTransfer = (() => {
    const pre = parseFloat(preWeight);
    const post = parseFloat(postWeight);
    if (isNaN(pre) || isNaN(post) || pre <= 0 || post <= 0) return 0;
    return Math.max(0, pre - post);
  })();

  const totalSideTime = sideStats.left.totalSeconds + sideStats.right.totalSeconds + sideStats.both.totalSeconds;
  const leftPct = totalSideTime > 0 ? Math.round((sideStats.left.totalSeconds / totalSideTime) * 100) : 50;
  const rightPct = totalSideTime > 0 ? Math.round((sideStats.right.totalSeconds / totalSideTime) * 100) : 50;

  const chartData = history.slice(0, 7).reverse();
  const maxTransfer = Math.max(...chartData.map((e) => e.transferredMl), 1);

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
    tabBar: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tabButton: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    tabButtonActive: { backgroundColor: MILK_BLUE, borderColor: MILK_BLUE },
    tabButtonText: { fontSize: 11, fontWeight: '600', color: C.muted },
    tabButtonTextActive: { color: '#fff' },
    // Timer card
    timerCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    timerDisplay: { fontSize: 56, fontWeight: '200', color: C.text, marginVertical: 16 },
    timerRunning: { color: MILK_BLUE },
    timerRow: { flexDirection: 'row', gap: 12 },
    timerBtn: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1 },
    timerBtnStart: { backgroundColor: MILK_BLUE, borderColor: MILK_BLUE },
    timerBtnStop: { backgroundColor: EFF_RED, borderColor: EFF_RED },
    timerBtnReset: { backgroundColor: C.card, borderColor: C.border },
    timerBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    timerBtnTextAlt: { color: C.text },
    // Side selector
    sideCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    sideRow: { flexDirection: 'row', gap: 8 },
    sideBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    sideBtnActive: { backgroundColor: MILK_BLUE, borderColor: MILK_BLUE },
    sideBtnText: { fontSize: 14, fontWeight: '600', color: C.text },
    sideBtnTextActive: { color: '#fff' },
    // Weight inputs
    weightCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    inputRow: { flexDirection: 'row', gap: 12 },
    inputGroup: { flex: 1 },
    inputLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    input: { backgroundColor: C.background, borderRadius: 12, padding: 14, fontSize: 18, color: C.text, borderWidth: 1, borderColor: C.border, textAlign: 'center' },
    inputMl: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 4 },
    // Efficiency display
    resultCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    resultLabel: { fontSize: 14, color: C.muted },
    resultValue: { fontSize: 24, fontWeight: '700', color: C.text },
    efficiencyBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
    efficiencyText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    // Save button
    saveButton: { backgroundColor: MILK_BLUE, borderRadius: 16, padding: 16, alignItems: 'center' },
    saveButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    // Balance card
    balanceCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    balanceRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    balanceSide: { flex: 1, alignItems: 'center' },
    balanceSideLabel: { fontSize: 12, color: C.muted, marginBottom: 4 },
    balancePercent: { fontSize: 22, fontWeight: '700', color: C.text },
    balanceTime: { fontSize: 11, color: C.muted, marginTop: 2 },
    balanceBar: { height: 8, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden' },
    balanceBarFill: { height: 8, backgroundColor: MILK_BLUE },
    balanceDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 8 },
    // Chart card
    chartCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 120, marginTop: 12 },
    chartBarContainer: { alignItems: 'center', flex: 1 },
    chartBar: { width: 28, backgroundColor: MILK_BLUE, borderRadius: 6, minHeight: 4 },
    chartLabel: { fontSize: 10, color: C.muted, marginTop: 4 },
    chartValue: { fontSize: 9, color: C.text, fontWeight: '600', marginBottom: 2 },
    chartEmpty: { alignItems: 'center', paddingVertical: 40 },
    chartEmptyText: { fontSize: 14, color: C.muted },
    // History card
    historyCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
    historyEntry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    historyEntryLast: { borderBottomWidth: 0 },
    historyInfo: { flex: 1 },
    historyDate: { fontSize: 13, fontWeight: '600', color: C.text },
    historyDetails: { fontSize: 12, color: C.muted, marginTop: 2 },
    historyEffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    historyEffText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    historyEmpty: { paddingVertical: 40, alignItems: 'center' },
    historyEmptyText: { fontSize: 14, color: C.muted },
    // Badge banner
    badgeBanner: { backgroundColor: C.card, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: MILK_AMBER },
    badgeBannerIcon: { fontSize: 20, marginRight: 10 },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: MILK_AMBER, flex: 1 },
  });

  const renderSession = () => (
    <View>
      <View style={styles.timerCard}>
        <Text style={styles.sectionTitle}>{t('milkTransfer.session.timer')}</Text>
        <Text style={[styles.timerDisplay, isRunning && styles.timerRunning]}>
          {formatTimerDisplay(elapsedSeconds)}
        </Text>
        <View style={styles.timerRow}>
          {!isRunning ? (
            <TouchableOpacity style={[styles.timerBtn, styles.timerBtnStart]} onPress={startTimer} activeOpacity={0.7}>
                            accessibilityLabel="Start milk-transfer timer"
              <Text style={styles.timerBtnText}>▶ {t('milkTransfer.timer.start')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.timerBtn, styles.timerBtnStop]} onPress={stopTimer} activeOpacity={0.7}>
                            accessibilityLabel="Stop milk-transfer timer"
              <Text style={styles.timerBtnText}>■ {t('milkTransfer.timer.stop')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.timerBtn, styles.timerBtnReset]} onPress={resetTimer} activeOpacity={0.7}>
                          accessibilityLabel="TouchableOpacity in milk-transfer"
            <Text style={[styles.timerBtnText, styles.timerBtnTextAlt]}>{t('milkTransfer.timer.reset')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sideCard}>
        <Text style={styles.sectionTitle}>{t('milkTransfer.session.side')}</Text>
        <View style={styles.sideRow}>
          {(['left', 'right', 'both'] as BreastSide[]).map((side) => (
            <TouchableOpacity
                            accessibilityLabel="TouchableOpacity in milk-transfer"
              key={side}
              style={[styles.sideBtn, selectedSide === side && styles.sideBtnActive]}
              activeOpacity={0.7}
              onPress={() => setSelectedSide(side)}
            >
              <Text style={[styles.sideBtnText, selectedSide === side && styles.sideBtnTextActive]}>
                {side === 'left' && t('milkTransfer.session.leftSide')}
                {side === 'right' && t('milkTransfer.session.rightSide')}
                {side === 'both' && t('milkTransfer.session.bothSides')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.weightCard}>
        <Text style={styles.sectionTitle}>{t('milkTransfer.weight.title')}</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('milkTransfer.weight.preFeed')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
              value={preWeight}
              onChangeText={setPreWeight}
            />
            <Text style={styles.inputMl}>{t('milkTransfer.weight.grams')}</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('milkTransfer.weight.postFeed')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
              value={postWeight}
              onChangeText={setPostWeight}
            />
            <Text style={styles.inputMl}>{t('milkTransfer.weight.grams')}</Text>
          </View>
        </View>
        <View style={[styles.inputRow, { marginTop: 12 }]}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('milkTransfer.offered.label')}</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
              value={offeredMl}
              onChangeText={setOfferedMl}
            />
            <Text style={styles.inputMl}>{t('milkTransfer.offered.mlUnit')}</Text>
          </View>
        </View>
      </View>

      {(preWeight || postWeight || offeredMl) && previewTransfer > 0 && (
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>{t('milkTransfer.result.transferred')}</Text>
            <Text style={styles.resultValue}>{previewTransfer} ml</Text>
          </View>
          {offeredMl && parseFloat(offeredMl) > 0 && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('milkTransfer.result.efficiency')}</Text>
              <View style={[styles.efficiencyBadge, { backgroundColor: getEfficiencyColor(previewEff) }]}>
                <Text style={styles.efficiencyText}>{previewEff}%</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} activeOpacity={0.7} onPress={saveSession}>
                      accessibilityLabel="Save milk-transfer entry"
        <Text style={styles.saveButtonText}>✓ {t('milkTransfer.session.saveSession')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderChart = () => (
    <View>
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>{t('milkTransfer.chart.transferRate')}</Text>
        {chartData.length === 0 ? (
          <View style={styles.chartEmpty}>
            <Ionicons name="bar-chart-outline" size={40} color={C.muted} />
            <Text style={styles.chartEmptyText}>{t('milkTransfer.chart.noData')}</Text>
          </View>
        ) : (
          <View style={styles.chartBars}>
            {chartData.map((entry, idx) => {
              const barHeight = (entry.transferredMl / maxTransfer) * 100;
              return (
                <View key={entry.id} style={styles.chartBarContainer}>
                  <Text style={styles.chartValue}>{entry.transferredMl}</Text>
                  <View style={[styles.chartBar, { height: Math.max(4, barHeight * 0.9) }]} />
                  <Text style={styles.chartLabel}>
                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.sectionTitle}>{t('milkTransfer.balance.title')}</Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceSide}>
            <Text style={styles.balanceSideLabel}>{t('milkTransfer.balance.leftSide')}</Text>
            <Text style={styles.balancePercent}>{leftPct}%</Text>
            <Text style={styles.balanceTime}>{formatDuration(sideStats.left.totalSeconds)}</Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceSide}>
            <Text style={styles.balanceSideLabel}>{t('milkTransfer.balance.rightSide')}</Text>
            <Text style={styles.balancePercent}>{rightPct}%</Text>
            <Text style={styles.balanceTime}>{formatDuration(sideStats.right.totalSeconds)}</Text>
          </View>
        </View>
        <View style={styles.balanceBar}>
          <View style={[styles.balanceBarFill, { width: `${leftPct}%` }]} />
        </View>
      </View>

      <View style={styles.badgeBanner}>
        <Text style={styles.badgeBannerIcon}>🏆</Text>
        <Text style={styles.badgeBannerText}>
          {t('milkTransfer.badge.efficientFeeder')}: {t('milkTransfer.badge.badgeDesc')}
        </Text>
      </View>
    </View>
  );

  const renderHistory = () => (
    <View>
      <View style={styles.historyCard}>
        {history.length === 0 ? (
          <View style={styles.historyEmpty}>
            <Ionicons name="time-outline" size={40} color={C.muted} />
            <Text style={styles.historyEmptyText}>{t('milkTransfer.history.empty')}</Text>
          </View>
        ) : (
          history.map((entry, idx) => (
            <View key={entry.id} style={[styles.historyEntry, idx === history.length - 1 && styles.historyEntryLast]}>
              <View style={styles.historyInfo}>
                <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                <Text style={styles.historyDetails}>
                  {entry.side === 'left' ? t('milkTransfer.session.leftSide') :
                    entry.side === 'right' ? t('milkTransfer.session.rightSide') :
                      t('milkTransfer.session.bothSides')}
                  {' · '}
                  {formatDuration(entry.durationSeconds)}
                  {' · '}
                  {entry.offeredMl}ml offered → {entry.transferredMl}ml transferred
                </Text>
              </View>
              <View style={[styles.historyEffBadge, { backgroundColor: getEfficiencyColor(entry.efficiency) }]}>
                <Text style={styles.historyEffText}>{entry.efficiency}%</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('milkTransfer.greeting')}</Text>
          <Text style={styles.title}>🍼 {t('milkTransfer.title')}</Text>
          <Text style={styles.subtitle}>{t('milkTransfer.subtitle')}</Text>
        </View>

        <View style={styles.tabBar}>
          {(['session', 'chart', 'history'] as const).map((tab) => (
            <TouchableOpacity
                            accessibilityLabel="TouchableOpacity in milk-transfer"
              key={tab}
              style={[styles.tabButton, currentView === tab && styles.tabButtonActive]}
              activeOpacity={0.7}
              onPress={() => setCurrentView(tab)}
            >
              <Text style={[styles.tabButtonText, currentView === tab && styles.tabButtonTextActive]}>
                {tab === 'session' && t('milkTransfer.tabs.session')}
                {tab === 'chart' && t('milkTransfer.tabs.chart')}
                {tab === 'history' && t('milkTransfer.tabs.history')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {currentView === 'session' && renderSession()}
        {currentView === 'chart' && renderChart()}
        {currentView === 'history' && renderHistory()}
      </ScrollView>
    </SafeAreaView>
  );
}
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

// ─── Mock Data ────────────────────────────────────────────────────────────────

interface RadarAxis {
  id: string;
  value: number;
  titleKey: string;
  descKey: string;
  color: string;
}

const RADAR_AXES: RadarAxis[] = [
  {
    id: 'motor',
    value: 72,
    titleKey: 'developmentRadar.axis.motor.title',
    descKey: 'developmentRadar.axis.motor.desc',
    color: '#3B82F6',
  },
  {
    id: 'language',
    value: 58,
    titleKey: 'developmentRadar.axis.language.title',
    descKey: 'developmentRadar.axis.language.desc',
    color: '#8B5CF6',
  },
  {
    id: 'feeding',
    value: 85,
    titleKey: 'developmentRadar.axis.feeding.title',
    descKey: 'developmentRadar.axis.feeding.desc',
    color: '#10B981',
  },
  {
    id: 'sleep',
    value: 64,
    titleKey: 'developmentRadar.axis.sleep.title',
    descKey: 'developmentRadar.axis.sleep.desc',
    color: '#F59E0B',
  },
];

interface Milestone {
  id: string;
  emoji: string;
  titleKey: string;
  date: string;
}

const MOCK_MILESTONES: Milestone[] = [
  { id: '1', emoji: '🎉', titleKey: 'developmentRadar.milestone.firstWord', date: '2026-06-10' },
  { id: '2', emoji: '🧸', titleKey: 'developmentRadar.milestone.crawling', date: '2026-06-01' },
  { id: '3', emoji: '🥣', titleKey: 'developmentRadar.milestone.solidFood', date: '2026-05-20' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function DevelopmentRadarScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const chartSize = 220;
  const center = chartSize / 2;
  const maxRadius = center - 30;

  const getPoint = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 4 - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const fillPoints = RADAR_AXES.map((axis, i) => getPoint(i, axis.value));
  const fillPath = fillPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const axisLines = RADAR_AXES.map((_, i) => {
    const end = getPoint(i, 100);
    return { x1: center, y1: center, x2: end.x, y2: end.y };
  });

  const axisLabels = RADAR_AXES.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / 4 - Math.PI / 2;
    const labelR = maxRadius + 22;
    return {
      x: center + labelR * Math.cos(angle),
      y: center + labelR * Math.sin(angle),
      axis,
    };
  });

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    label: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 6 },

    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 14 },

    // Radar chart
    chartContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    chartSvg: {
      width: chartSize,
      height: chartSize,
    },
    chartBackground: {
      width: chartSize,
      height: chartSize,
      borderRadius: chartSize / 2,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
      position: 'absolute',
    },
    axisLine: {
      position: 'absolute',
      backgroundColor: C.accent,
      transformOrigin: 'left center',
    },
    gridCircle: {
      position: 'absolute',
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 9999,
    },
    fillPolygon: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    axisLabel: {
      position: 'absolute',
      fontSize: 11,
      fontWeight: '600',
      color: C.text,
      textAlign: 'center',
    },
    scoreBadge: {
      position: 'absolute',
      fontSize: 10,
      color: C.muted,
      textAlign: 'center',
    },

    // Axis detail cards
    axisCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    axisColorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 14,
    },
    axisInfo: { flex: 1 },
    axisTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 4 },
    axisDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
    axisScore: { alignItems: 'flex-end' },
    axisScoreValue: { fontSize: 22, fontWeight: '700', color: C.text },
    axisTrend: { fontSize: 12, color: '#2ecc71', marginTop: 2 },
    axisTrendDown: { fontSize: 12, color: '#e74c3c', marginTop: 2 },

    // Milestone cards
    milestoneCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    milestoneEmoji: { fontSize: 32, marginRight: 14 },
    milestoneInfo: { flex: 1 },
    milestoneTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 4 },
    milestoneDate: { fontSize: 12, color: C.muted },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.label}>{t('developmentRadar.label')}</Text>
          <Text style={styles.title}>{t('developmentRadar.title')}</Text>
          <Text style={styles.subtitle}>{t('developmentRadar.subtitle')}</Text>
        </View>

        {/* SECTION A — Radar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('developmentRadar.radarTitle')}</Text>
          <View style={styles.chartContainer}>
            <View style={styles.chartBackground} />
            {/* Grid circles */}
            {[25, 50, 75, 100].map(pct => {
              const r = (pct / 100) * maxRadius;
              return (
                <View
                  key={pct}
                  style={[
                    styles.gridCircle,
                    {
                      width: r * 2,
                      height: r * 2,
                      top: center - r,
                      left: center - r,
                    },
                  ]}
                />
              );
            })}
            {/* Axis lines */}
            {axisLines.map((line, i) => {
              const dx = line.x2 - line.x1;
              const dy = line.y2 - line.y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View
                  key={i}
                  style={[
                    styles.axisLine,
                    {
                      width: length,
                      height: 1,
                      top: line.y1,
                      left: line.x1,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
            {/* Fill polygon using positioned views at each vertex */}
            {fillPoints.map((p, i) => {
              const next = fillPoints[(i + 1) % fillPoints.length];
              const midX = (p.x + next.x) / 2;
              const midY = (p.y + next.y) / 2;
              const dx = next.x - p.x;
              const dy = next.y - p.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              const axis = RADAR_AXES[i];
              return (
                <View
                  key={i}
                  style={[
                    styles.fillPolygon,
                    {
                      width: length,
                      height: 4,
                      top: midY - 2,
                      left: p.x,
                      backgroundColor: axis.color + '99',
                      transform: [{ rotate: `${angle}deg` }],
                      transformOrigin: 'left center',
                    },
                  ]}
                />
              );
            })}
            {/* Axis labels */}
            {axisLabels.map((label, i) => {
              const axis = RADAR_AXES[i];
              return (
                <Text
                  key={i}
                  style={[
                    styles.axisLabel,
                    {
                      top: label.y - 8,
                      left: label.x - 40,
                      width: 80,
                    },
                  ]}
                >
                  {t(axis.titleKey)}
                </Text>
              );
            })}
            {/* Score badges near vertices */}
            {fillPoints.map((p, i) => {
              const axis = RADAR_AXES[i];
              return (
                <Text
                  key={i}
                  style={[
                    styles.scoreBadge,
                    {
                      top: p.y + 8,
                      left: p.x - 12,
                    },
                  ]}
                >
                  {axis.value}
                </Text>
              );
            })}
          </View>
        </View>

        {/* SECTION B — Axis Detail Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('developmentRadar.axisDetailTitle')}</Text>
          {RADAR_AXES.map(axis => (
            <View key={axis.id} style={styles.axisCard}>
              <View style={[styles.axisColorDot, { backgroundColor: axis.color }]} />
              <View style={styles.axisInfo}>
                <Text style={styles.axisTitle}>{t(axis.titleKey)}</Text>
                <Text style={styles.axisDesc}>{t(axis.descKey)}</Text>
              </View>
              <View style={styles.axisScore}>
                <Text style={styles.axisScoreValue}>{axis.value}</Text>
                <Text style={styles.axisTrend}>↑ 3%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* SECTION C — Recent Milestones Feed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('developmentRadar.milestonesTitle')}</Text>
          {MOCK_MILESTONES.map(milestone => (
            <View key={milestone.id} style={styles.milestoneCard}>
              <Text style={styles.milestoneEmoji}>{milestone.emoji}</Text>
              <View style={styles.milestoneInfo}>
                <Text style={styles.milestoneTitle}>{t(milestone.titleKey)}</Text>
                <Text style={styles.milestoneDate}>{milestone.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

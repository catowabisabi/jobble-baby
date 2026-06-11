import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { onNewGrowthEntry } from '../utils/badgeService';
import { Badge } from '../data/badges';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const STORAGE_KEY = '@jobble/growth_entries';
const VELOCITY_STORAGE_KEY = '@jobble/growth_velocity_data';
const ALERT_THRESHOLD_KEY = '@jobble/velocity_alert_threshold';
const SKINFOLD_KEY = '@jobble/skinfold_entries';
const PONDERAL_KEY = '@jobble/ponderal_index';
const PARENTAL_KEY = '@jobble/parental_heights';

// WHO Child Growth Standards — ages 0 to 24 months
const AGES_MONTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24];

// Boys height (cm) — 3rd, 15th, 50th, 85th, 97th percentiles
const BOYS_HEIGHT: number[][] = [
  [46.1, 47.2, 49.9, 52.0, 53.0], // 0m
  [48.9, 50.2, 53.7, 56.2, 57.6],  // 1m
  [51.7, 53.0, 57.1, 59.9, 61.5], // 2m
  [54.2, 55.6, 59.8, 62.9, 64.7], // 3m
  [56.2, 57.7, 62.1, 65.4, 67.3], // 4m
  [57.8, 59.3, 63.9, 67.4, 69.4], // 5m
  [59.1, 60.7, 65.4, 69.1, 71.2], // 6m
  [60.3, 62.0, 66.8, 70.6, 72.8], // 7m
  [61.4, 63.2, 68.0, 72.0, 74.2], // 8m
  [62.4, 64.3, 69.2, 73.2, 75.6], // 9m
  [63.4, 65.3, 70.3, 74.4, 76.9], // 10m
  [64.3, 66.3, 71.3, 75.5, 78.1], // 11m
  [65.1, 67.2, 72.4, 76.6, 79.2], // 12m
  [67.6, 69.9, 75.2, 79.8, 82.5], // 15m
  [70.0, 72.4, 78.0, 82.8, 85.7], // 18m
  [72.0, 74.6, 80.5, 85.4, 88.4], // 21m
  [73.9, 76.6, 82.7, 87.8, 91.0], // 24m
];

// Girls height (cm)
const GIRLS_HEIGHT: number[][] = [
  [45.4, 46.5, 49.1, 51.0, 52.0], // 0m
  [47.8, 49.0, 52.0, 54.4, 55.6], // 1m
  [50.4, 51.7, 55.0, 57.8, 59.2], // 2m
  [52.8, 54.1, 57.9, 60.8, 62.5], // 3m
  [54.7, 56.1, 60.0, 63.1, 65.0], // 4m
  [56.2, 57.7, 61.8, 65.0, 67.0], // 5m
  [57.5, 59.1, 63.3, 66.8, 68.8], // 6m
  [58.7, 60.3, 64.7, 68.4, 70.4], // 7m
  [59.8, 61.5, 65.9, 69.8, 72.0], // 8m
  [60.8, 62.6, 67.1, 71.2, 73.5], // 9m
  [61.7, 63.7, 68.3, 72.4, 74.8], // 10m
  [62.7, 64.7, 69.4, 73.6, 76.0], // 11m
  [63.5, 65.6, 70.4, 74.7, 77.2], // 12m
  [65.9, 68.1, 73.3, 77.8, 80.4], // 15m
  [68.1, 70.3, 75.8, 80.6, 83.4], // 18m
  [70.0, 72.3, 78.0, 83.0, 86.0], // 21m
  [71.8, 74.1, 80.0, 85.1, 88.0], // 24m
];

// Boys weight (kg)
const BOYS_WEIGHT: number[][] = [
  [2.5, 2.9, 3.3, 3.9, 4.3],  // 0m
  [3.4, 3.9, 4.5, 5.1, 5.7],  // 1m
  [4.3, 4.9, 6.0, 7.0, 7.7], // 2m
  [5.0, 5.7, 6.4, 7.4, 8.1],  // 3m
  [5.6, 6.2, 7.0, 8.0, 8.7],  // 4m
  [6.0, 6.7, 7.5, 8.5, 9.3],  // 5m
  [6.4, 7.0, 7.9, 8.9, 9.8],  // 6m
  [6.7, 7.4, 8.3, 9.3, 10.2], // 7m
  [7.0, 7.7, 8.6, 9.7, 10.5], // 8m
  [7.3, 8.0, 8.9, 10.0, 10.9],// 9m
  [7.5, 8.2, 9.2, 10.3, 11.2],// 10m
  [7.7, 8.4, 9.4, 10.5, 11.5],// 11m
  [7.9, 8.6, 9.6, 10.8, 11.8],// 12m
  [8.5, 9.2, 10.3, 11.6, 12.7],// 15m
  [9.2, 9.9, 11.1, 12.5, 13.7],// 18m
  [9.7, 10.5, 11.8, 13.2, 14.5],// 21m
  [10.2, 11.0, 12.3, 13.9, 15.1],// 24m
];

// Girls weight (kg)
const GIRLS_WEIGHT: number[][] = [
  [2.4, 2.8, 3.2, 3.7, 4.1],  // 0m
  [3.1, 3.5, 4.2, 4.8, 5.5],  // 1m
  [3.8, 4.3, 5.5, 6.3, 7.0],  // 2m
  [4.4, 5.0, 5.8, 6.7, 7.4],  // 3m
  [4.9, 5.5, 6.4, 7.3, 8.1],  // 4m
  [5.3, 6.0, 6.9, 7.8, 8.8],  // 5m
  [5.6, 6.3, 7.3, 8.3, 9.3],  // 6m
  [5.9, 6.6, 7.6, 8.7, 9.8],  // 7m
  [6.2, 6.9, 7.9, 9.0, 10.2],  // 8m
  [6.4, 7.2, 8.2, 9.3, 10.5], // 9m
  [6.6, 7.4, 8.5, 9.6, 10.8], // 10m
  [6.8, 7.6, 8.7, 9.9, 11.1], // 11m
  [7.0, 7.8, 8.9, 10.1, 11.4],// 12m
  [7.5, 8.3, 9.6, 10.9, 12.3],// 15m
  [8.1, 8.9, 10.2, 11.6, 13.0],// 18m
  [8.6, 9.4, 10.8, 12.2, 13.7],// 21m
  [9.0, 9.9, 11.3, 12.8, 14.3],// 24m
];

// WHO Height Velocity Standards (cm/month) for boys [3rd, 50th, 97th]
const BOYS_HEIGHT_VELOCITY: number[][] = [
  [3.5, 4.0, 4.5],  // 0-1m
  [2.5, 3.0, 3.5],  // 1-2m
  [2.0, 2.5, 3.0],  // 2-3m
  [1.5, 2.0, 2.5],  // 3-4m
  [1.2, 1.7, 2.2],  // 4-5m
  [1.0, 1.5, 2.0],  // 5-6m
  [0.8, 1.3, 1.8],  // 6-7m
  [0.7, 1.2, 1.7],  // 7-8m
  [0.6, 1.1, 1.6],  // 8-9m
  [0.5, 1.0, 1.5],  // 9-10m
  [0.4, 0.9, 1.4],  // 10-11m
  [0.3, 0.8, 1.3],  // 11-12m
  [0.3, 0.7, 1.1],  // 12-15m
  [0.3, 0.6, 0.9],  // 15-18m
  [0.2, 0.5, 0.8],  // 18-21m
  [0.2, 0.5, 0.8],  // 21-24m
];

// WHO Height Velocity Standards (cm/month) for girls [3rd, 50th, 97th]
const GIRLS_HEIGHT_VELOCITY: number[][] = [
  [3.0, 3.5, 4.0],  // 0-1m
  [2.3, 2.8, 3.3],  // 1-2m
  [1.8, 2.3, 2.8],  // 2-3m
  [1.4, 1.9, 2.4],  // 3-4m
  [1.1, 1.6, 2.1],  // 4-5m
  [0.9, 1.4, 1.9],  // 5-6m
  [0.7, 1.2, 1.7],  // 6-7m
  [0.6, 1.1, 1.6],  // 7-8m
  [0.5, 1.0, 1.5],  // 8-9m
  [0.4, 0.9, 1.4],  // 9-10m
  [0.3, 0.8, 1.3],  // 10-11m
  [0.3, 0.7, 1.2],  // 11-12m
  [0.2, 0.6, 1.0],  // 12-15m
  [0.2, 0.5, 0.8],  // 15-18m
  [0.2, 0.5, 0.8],  // 18-21m
  [0.2, 0.4, 0.7],  // 21-24m
];

// WHO Ponderal Index Standards [3rd, 50th, 97th] by age in months
const BOYS_PONDERAL: number[][] = [
  [10.2, 12.3, 14.5],  // 0m
  [11.1, 13.4, 15.8],  // 1m
  [11.8, 14.2, 16.8],  // 2m
  [12.3, 14.8, 17.5],  // 3m
  [12.7, 15.3, 18.1],  // 4m
  [13.0, 15.6, 18.5],  // 5m
  [13.2, 15.9, 18.9],  // 6m
  [13.4, 16.1, 19.2],  // 7m
  [13.5, 16.3, 19.4],  // 8m
  [13.6, 16.4, 19.6],  // 9m
  [13.6, 16.5, 19.7],  // 10m
  [13.6, 16.6, 19.8],  // 11m
  [13.6, 16.6, 19.9],  // 12m
  [13.5, 16.5, 19.8],  // 15m
  [13.4, 16.4, 19.6],  // 18m
  [13.3, 16.2, 19.4],  // 21m
  [13.2, 16.0, 19.2],  // 24m
];

const GIRLS_PONDERAL: number[][] = [
  [9.8, 11.8, 14.0],  // 0m
  [10.6, 12.8, 15.2],  // 1m
  [11.3, 13.6, 16.2],  // 2m
  [11.8, 14.2, 16.9],  // 3m
  [12.2, 14.7, 17.5],  // 4m
  [12.5, 15.0, 17.9],  // 5m
  [12.7, 15.3, 18.3],  // 6m
  [12.9, 15.5, 18.6],  // 7m
  [13.0, 15.7, 18.8],  // 8m
  [13.1, 15.8, 19.0],  // 9m
  [13.1, 15.9, 19.1],  // 10m
  [13.1, 15.9, 19.2],  // 11m
  [13.1, 15.9, 19.2],  // 12m
  [13.0, 15.8, 19.1],  // 15m
  [12.9, 15.6, 18.9],  // 18m
  [12.8, 15.4, 18.7],  // 21m
  [12.7, 15.3, 18.5],  // 24m
];

type Gender = 'boys' | 'girls';
type ChartType = 'height' | 'weight';

interface GrowthEntry {
  id: string;
  date: string;
  height: number;
  weight: number;
}

interface VelocityEntry {
  id: string;
  date: string;
  velocity: number;
  ageMonths: number;
}

interface VelocityAlertThreshold {
  mild: number;
  moderate: number;
  severe: number;
}

interface SkinfoldEntry {
  id: string;
  date: string;
  triceps: number;
  subscapular: number;
  ratio: number;
}

interface PonderalEntry {
  id: string;
  date: string;
  weight: number;
  height: number;
  pi: number;
  ageMonths: number;
}

interface ParentalHeights {
  father: number;
  mother: number;
  mphBoys: number;
  mphGirls: number;
}

type AlertLevel = 'mild' | 'moderate' | 'severe';
type GrowthPhase = 'infancy' | 'toddler' | 'preschool';

const getDateStr = () => new Date().toISOString().split('T')[0];

const getTrendArrow = (current: number, previous: number): string => {
  const diff = current - previous;
  if (diff > 0.1) return '↑';
  if (diff < -0.1) return '↓';
  return '→';
};

const getGrowthPhase = (ageMonths: number): GrowthPhase => {
  if (ageMonths < 12) return 'infancy';
  if (ageMonths < 36) return 'toddler';
  return 'preschool';
};

const getPhaseLabel = (phase: GrowthPhase, t: (key: string) => string): string => {
  switch (phase) {
    case 'infancy': return t('growth.infancy');
    case 'toddler': return t('growth.toddler');
    case 'preschool': return t('growth.preschool');
  }
};

const getPhaseDescription = (phase: GrowthPhase, t: (key: string) => string): string => {
  switch (phase) {
    case 'infancy': return t('growth.phaseInfancy');
    case 'toddler': return t('growth.phaseToddler');
    case 'preschool': return t('growth.phasePreschool');
  }
};

const calculateVelocity = (entries: GrowthEntry[]): VelocityEntry[] => {
  if (entries.length < 2) return [];
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const velocities: VelocityEntry[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevDate = new Date(prev.date);
    const currDate = new Date(curr.date);
    const monthDiff = (currDate.getFullYear() - prevDate.getFullYear()) * 12 + (currDate.getMonth() - prevDate.getMonth());
    if (monthDiff > 0) {
      const heightDiff = curr.height - prev.height;
      const velocity = heightDiff / monthDiff;
      const ageMonths = getAgeInMonths(curr.date);
      velocities.push({
        id: `vel_${i}`,
        date: curr.date,
        velocity,
        ageMonths,
      });
    }
  }
  return velocities;
};

const calculatePonderalIndex = (weight: number, height: number): number => {
  if (height <= 0) return 0;
  const heightM = height / 100;
  return weight / (heightM * heightM * heightM);
};

const calculateMPH = (father: number, mother: number, gender: Gender): number => {
  if (gender === 'boys') {
    return (father + mother + 13) / 2;
  }
  return (father + mother - 13) / 2;
};

const getVelocityStatus = (velocity: number, ageIndex: number, gender: Gender): 'acceleration' | 'deceleration' | 'normal' => {
  const velocityData = gender === 'boys' ? BOYS_HEIGHT_VELOCITY : GIRLS_HEIGHT_VELOCITY;
  if (ageIndex < 0 || ageIndex >= velocityData.length) return 'normal';
  const [pct3, pct50, pct97] = velocityData[ageIndex];
  if (velocity > pct97) return 'acceleration';
  if (velocity < pct3) return 'deceleration';
  return 'normal';
};

const getAlertLevel = (velocity: number, threshold: VelocityAlertThreshold): AlertLevel | null => {
  if (velocity < threshold.severe) return 'severe';
  if (velocity < threshold.moderate) return 'moderate';
  if (velocity < threshold.mild) return 'mild';
  return null;
};

const getAgeInMonths = (dateStr: string): number => {
  try {
    const entryDate = new Date(dateStr);
    const now = new Date();
    const months = (now.getFullYear() - entryDate.getFullYear()) * 12 + (now.getMonth() - entryDate.getMonth());
    return Math.max(0, Math.min(months, 24));
  } catch {
    return 0;
  }
};

const CHART_H = 200;
const CHART_PADDING = { top: 20, bottom: 30, left: 10, right: 10 };
const CHART_W = 340; // approximate, flexes with container

// Map age-in-months to chart X position
const ageToX = (age: number, chartWidth: number): number => {
  const usableW = chartWidth - CHART_PADDING.left - CHART_PADDING.right;
  return CHART_PADDING.left + (age / 24) * usableW;
};

// Map a value (height or weight) to chart Y position
const valueToY = (value: number, min: number, max: number): number => {
  const usableH = CHART_H - CHART_PADDING.top - CHART_PADDING.bottom;
  return CHART_H - CHART_PADDING.bottom - ((value - min) / (max - min)) * usableH;
};

// Generate SVG-like path string from points
const makePath = (points: { x: number; y: number }[]): string => {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
};

interface ChartProps {
  gender: Gender;
  chartType: ChartType;
  entries: GrowthEntry[];
  chartBg: string;
  chartMuted: string;
  t: (key: string) => string;
}

function GrowthChart({ gender, chartType, entries, chartBg, chartMuted, t }: ChartProps) {
  const [chartW, setChartW] = useState(CHART_W);
  const data = chartType === 'height'
    ? (gender === 'boys' ? BOYS_HEIGHT : GIRLS_HEIGHT)
    : (gender === 'boys' ? BOYS_WEIGHT : GIRLS_WEIGHT);

  // Determine min/max for Y scale
  const allVals = data.flat();
  const minVal = Math.floor(Math.min(...allVals) * 0.9);
  const maxVal = Math.ceil(Math.max(...allVals) * 1.05);

  // Map entries to chart coordinates
  const entryPoints = entries
    .map(e => {
      const age = getAgeInMonths(e.date);
      const value = chartType === 'height' ? e.height : e.weight;
      return { x: ageToX(age, chartW), y: valueToY(value, minVal, maxVal) };
    })
    .filter(p => p.x >= CHART_PADDING.left);

  // Smooth percentile curves
  const pct3 = AGES_MONTHS.map((age, i) => ({ x: ageToX(age, chartW), y: valueToY(data[i][0], minVal, maxVal) }));
  const pct15 = AGES_MONTHS.map((age, i) => ({ x: ageToX(age, chartW), y: valueToY(data[i][1], minVal, maxVal) }));
  const pct50 = AGES_MONTHS.map((age, i) => ({ x: ageToX(age, chartW), y: valueToY(data[i][2], minVal, maxVal) }));
  const pct85 = AGES_MONTHS.map((age, i) => ({ x: ageToX(age, chartW), y: valueToY(data[i][3], minVal, maxVal) }));
  const pct97 = AGES_MONTHS.map((age, i) => ({ x: ageToX(age, chartW), y: valueToY(data[i][4], minVal, maxVal) }));

  const path3 = makePath(pct3);
  const path15 = makePath(pct15);
  const path50 = makePath(pct50);
  const path85 = makePath(pct85);
  const path97 = makePath(pct97);

  // Build area paths for bands
  const band3to15 = `${makePath(pct3)} L ${pct15.reverse().map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
  const band15to50 = `${makePath(pct15)} L ${pct50.reverse().map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
  const band50to85 = `${makePath(pct50)} L ${pct85.reverse().map(p => `${p.x} ${p.y}`).join(' L ')} Z`;
  const band85to97 = `${makePath(pct85)} L ${pct97.reverse().map(p => `${p.x} ${p.y}`).join(' L ')} Z`;

  // X-axis labels
  const xLabels = [0, 6, 12, 18, 24];

  return (
    <View style={chartStyles.container} onLayout={e => setChartW(e.nativeEvent.layout.width)}>
      {/* Legend */}
      <View style={chartStyles.legend}>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendLine, { backgroundColor: '#93c5fd' }]} />
          <Text style={[chartStyles.legendText, { color: chartMuted }]}>{t('growth.third15th')}</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendLine, { backgroundColor: '#60a5fa' }]} />
          <Text style={[chartStyles.legendText, { color: chartMuted }]}>{t('growth.fifteenth85th')}</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendLine, { backgroundColor: '#3B82F6' }]} />
          <Text style={[chartStyles.legendText, { color: chartMuted }]}>{t('growth.thirty50th')}</Text>
        </View>
        <View style={chartStyles.legendItem}>
          <View style={[chartStyles.legendDot, { backgroundColor: '#fbbf24' }]} />
          <Text style={[chartStyles.legendText, { color: chartMuted }]}>{t('growth.baby')}</Text>
        </View>
      </View>

      <View style={[chartStyles.svgContainer, { backgroundColor: chartBg }]}>
        <View style={chartStyles.bandContainer}>
          {/* 3rd-15th band */}
          {AGES_MONTHS.slice(0, -1).map((_, i) => {
            const x1 = ageToX(AGES_MONTHS[i], chartW);
            const x2 = ageToX(AGES_MONTHS[i + 1], chartW);
            const y3t = valueToY(data[i][0], minVal, maxVal);
            const y3b = valueToY(data[i + 1][0], minVal, maxVal);
            const y15t = valueToY(data[i][1], minVal, maxVal);
            const y15b = valueToY(data[i + 1][1], minVal, maxVal);
            return (
              <View key={`b3_${i}`} style={{
                position: 'absolute',
                left: x1, top: Math.min(y3t, y15t),
                width: x2 - x1, height: Math.abs(y15t - y3t) + Math.abs(y15b - y3b) + 1,
                backgroundColor: 'rgba(147, 197, 253, 0.25)',
              }} />
            );
          })}
          {/* 50th-85th band */}
          {AGES_MONTHS.slice(0, -1).map((_, i) => {
            const x1 = ageToX(AGES_MONTHS[i], chartW);
            const x2 = ageToX(AGES_MONTHS[i + 1], chartW);
            const y50t = valueToY(data[i][2], minVal, maxVal);
            const y50b = valueToY(data[i + 1][2], minVal, maxVal);
            const y85t = valueToY(data[i][3], minVal, maxVal);
            const y85b = valueToY(data[i + 1][3], minVal, maxVal);
            return (
              <View key={`b85_${i}`} style={{
                position: 'absolute',
                left: x1, top: Math.min(y50t, y85t),
                width: x2 - x1, height: Math.abs(y85t - y50t) + Math.abs(y85b - y50b) + 1,
                backgroundColor: 'rgba(96, 165, 250, 0.20)',
              }} />
            );
          })}
        </View>

        {/* Percentile lines rendered as text (approximated as dots row) */}
        {/* Using a simple visual approach: stacked bars per age marker */}
        {AGES_MONTHS.map((age, i) => {
          const cx = ageToX(age, chartW);
          const y50 = valueToY(data[i][2], minVal, maxVal);
          const y3 = valueToY(data[i][0], minVal, maxVal);
          const y97 = valueToY(data[i][4], minVal, maxVal);
          const bandH = y97 - y3;
          return (
            <View key={`pct_${i}`} style={{
              position: 'absolute',
              left: cx - 4, top: y97,
              width: 8, height: bandH,
              borderLeftWidth: 1, borderLeftColor: 'rgba(147, 197, 253, 0.5)',
              borderRightWidth: 1, borderRightColor: 'rgba(147, 197, 253, 0.5)',
            }}>
              {/* 50th marker */}
              <View style={{ position: 'absolute', top: y50 - y97 - 1.5, left: 1, width: 6, height: 3, backgroundColor: '#3B82F6', borderRadius: 1 }} />
            </View>
          );
        })}

        {/* Baby entry dots */}
        {entryPoints.map((pt, i) => (
          <View key={`dot_${i}`} style={{
            position: 'absolute',
            left: pt.x - 5, top: pt.y - 5,
            width: 10, height: 10,
            borderRadius: 5,
            backgroundColor: '#fbbf24',
            borderWidth: 2, borderColor: '#fff',
          }} />
        ))}

        {/* X-axis */}
        <View style={chartStyles.xAxis}>
          {xLabels.map(age => (
            <Text key={`x_${age}`} style={[chartStyles.xLabel, { left: ageToX(age, chartW) - 10, color: chartMuted }]}>
              {age}m
            </Text>
          ))}
        </View>

        {/* Y-axis labels */}
        <Text style={[chartStyles.yLabel, { top: valueToY(maxVal, minVal, maxVal) - 6, color: chartMuted }]}>{maxVal}</Text>
        <Text style={[chartStyles.yLabel, { top: valueToY(minVal, minVal, maxVal) - 6, color: chartMuted }]}>{minVal}</Text>
      </View>
    </View>
  );
}

// chartStyles — shared layout, colors passed via props (chartBg, chartMuted)
const chartStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 16, height: 3, borderRadius: 2 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10 },
  svgContainer: { height: CHART_H, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  bandContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 30 },
  xAxis: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30 },
  xLabel: { position: 'absolute', fontSize: 10, width: 20, textAlign: 'center' },
  yLabel: { position: 'absolute', right: 2, fontSize: 9 },
});

export default function GrowthScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<GrowthEntry[]>([]);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [newBadges, setNewBadges] = useState<Badge[]>([]);
  const [gender, setGender] = useState<Gender>('boys');
  const [chartType, setChartType] = useState<ChartType>('height');
  const [velocityEntries, setVelocityEntries] = useState<VelocityEntry[]>([]);
  const [alertThreshold, setAlertThreshold] = useState<VelocityAlertThreshold>({ mild: 0.5, moderate: 0.3, severe: 0.1 });
  const [velocityAlert, setVelocityAlert] = useState<AlertLevel | null>(null);
  const [skinfoldEntries, setSkinfoldEntries] = useState<SkinfoldEntry[]>([]);
  const [triceps, setTriceps] = useState('');
  const [subscapular, setSubscapular] = useState('');
  const [ponderalEntries, setPonderalEntries] = useState<PonderalEntry[]>([]);
  const [parentalHeights, setParentalHeights] = useState<ParentalHeights | null>(null);
  const [fatherHeight, setFatherHeight] = useState('');
  const [motherHeight, setMotherHeight] = useState('');
  const [currentPhase, setCurrentPhase] = useState<GrowthPhase>('infancy');
  const [showVelocitySection, setShowVelocitySection] = useState(false);
  const [showSkinfoldSection, setShowSkinfoldSection] = useState(false);
  const [showPonderalSection, setShowPonderalSection] = useState(false);
  const [showParentalSection, setShowParentalSection] = useState(false);
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    milestoneBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 12, marginTop: 4,
    },
    milestoneBtnText: { fontSize: 12, fontWeight: '600', color: C.text },
    badgeBanner: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.accent,
    },
    badgeBannerIcon: { fontSize: 20, marginRight: 10 },
    badgeBannerText: { fontSize: 13, fontWeight: '600', color: C.accent, flex: 1 },
    chartCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    chartHeader: { marginBottom: 12 },
    chartTitle: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    chartSubtitle: { fontSize: 11, color: C.muted, marginTop: 2 },
    toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    toggleBtn: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: C.card,
      alignItems: 'center',
    },
    toggleBtnSmall: { flex: 0.5 },
    toggleBtnActive: { backgroundColor: C.accent },
    toggleBtnText: { fontSize: 13, color: C.muted, fontWeight: '500' },
    toggleBtnTextSmall: { fontSize: 12 },
    toggleBtnTextActive: { color: C.text },
    inputCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    inputLabel: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 12 },
    input: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 18,
      color: C.text,
      borderWidth: 1,
      borderColor: C.border,
    },
    saveButton: {
      backgroundColor: C.accent,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginTop: 20,
    },
    saveButtonText: { fontSize: 16, fontWeight: '600', color: C.text },
    sectionTitle: {
      fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 12, marginTop: 8,
    },
    historyCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    entryInfo: { flex: 1 },
    entryDate: { fontSize: 14, fontWeight: '600', color: C.text },
    entryMeasurements: { fontSize: 12, color: C.muted, marginTop: 4 },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
  });

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setEntries(JSON.parse(stored));
        } else {
          setEntries([]);
        }
      } catch (e) {
        setEntries([]);
      }
    };
    const loadGender = async () => {
      try {
        const saved = await AsyncStorage.getItem('@jobble/gender_preference');
        if (saved === 'boys' || saved === 'girls') {
          setGender(saved);
        }
      } catch {}
    };
    loadEntries();
    loadGender();
  }, []);

  // Persist gender preference when it changes
  useEffect(() => {
    AsyncStorage.setItem('@jobble/gender_preference', gender).catch(() => {});
  }, [gender]);

  const saveEntry = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) return;
    const newEntry: GrowthEntry = { id: Date.now().toString(), date: getDateStr(), height: h, weight: w };
    const updated = [newEntry, ...entries].slice(0, 10);
    setEntries(updated);
    setHeight('');
    setWeight('');
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      const awarded = await onNewGrowthEntry();
      if (awarded.length > 0) {
        setNewBadges(awarded);
        setTimeout(() => setNewBadges([]), 4000);
      }
    } catch (e) {
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.greeting}>{t('growth.greeting')}</Text>
              <Text style={styles.title}>📈 {t('growth.title')}</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="View milestones"
              accessibilityHint="Navigate to the milestones screen to capture photos"
              style={[styles.milestoneBtn, { backgroundColor: C.accent, minHeight: 44, minWidth: 44 }]}
              onPress={() => router.push('/milestones')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="camera" size={16} color={C.text} />
              <Text style={styles.milestoneBtnText}>📸 {t('growth.milestone')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {newBadges.length > 0 && (
          <View style={styles.badgeBanner}>
            <Text style={styles.badgeBannerIcon}>
              {newBadges.map((b) => b.icon).join(' ')}
            </Text>
            <Text style={styles.badgeBannerText}>
              {t('growth.badgeEarned', { badges: newBadges.map((b) => b.name).join(', ') })}
            </Text>
          </View>
        )}

        {/* WHO Growth Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{t('growth.whoGrowthChart')}</Text>
            <Text style={styles.chartSubtitle}>{t('growth.percentileCurves')}</Text>
          </View>

          {/* Chart type toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              accessibilityLabel="Show height chart"
              accessibilityRole="tab"
              accessibilityState={{ selected: chartType === 'height' }}
              style={[styles.toggleBtn, chartType === 'height' && styles.toggleBtnActive, { minHeight: 44, minWidth: 44 }]}
              onPress={() => setChartType('height')}
            >
              <Text style={[styles.toggleBtnText, chartType === 'height' && styles.toggleBtnTextActive]}>{t('growth.height')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Show weight chart"
              accessibilityRole="tab"
              accessibilityState={{ selected: chartType === 'weight' }}
              style={[styles.toggleBtn, chartType === 'weight' && styles.toggleBtnActive, { minHeight: 44, minWidth: 44 }]}
              onPress={() => setChartType('weight')}
            >
              <Text style={[styles.toggleBtnText, chartType === 'weight' && styles.toggleBtnTextActive]}>{t('growth.weight')}</Text>
            </TouchableOpacity>
          </View>

          {/* Gender toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              accessibilityLabel="Show boys growth data"
              accessibilityRole="tab"
              accessibilityState={{ selected: gender === 'boys' }}
              style={[styles.toggleBtn, styles.toggleBtnSmall, gender === 'boys' && styles.toggleBtnActive, { minHeight: 44, minWidth: 44 }]}
              onPress={() => setGender('boys')}
            >
              <Text style={[styles.toggleBtnText, styles.toggleBtnTextSmall, gender === 'boys' && styles.toggleBtnTextActive]}>{t('growth.boys')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Show girls growth data"
              accessibilityRole="tab"
              accessibilityState={{ selected: gender === 'girls' }}
              style={[styles.toggleBtn, styles.toggleBtnSmall, gender === 'girls' && styles.toggleBtnActive, { minHeight: 44, minWidth: 44 }]}
              onPress={() => setGender('girls')}
            >
              <Text style={[styles.toggleBtnText, styles.toggleBtnTextSmall, gender === 'girls' && styles.toggleBtnTextActive]}>{t('growth.girls')}</Text>
            </TouchableOpacity>
          </View>

          <GrowthChart gender={gender} chartType={chartType} entries={entries} chartBg={C.card} chartMuted={C.muted} t={t} />
        </View>

        {/* Input card */}
        <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>{t('growth.heightCm')}</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            placeholderTextColor={C.muted}
            keyboardType="decimal-pad"
            value={height}
            onChangeText={setHeight}
          />
            <Text style={styles.inputLabel}>{t('growth.weightKg')}</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            placeholderTextColor={C.muted}
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />
          <TouchableOpacity
            style={[styles.saveButton, { minHeight: 44, minWidth: 44 }]}
            accessibilityLabel="Save growth measurement"
            accessibilityHint="Stores the entered height and weight for tracking"
            activeOpacity={0.7}
            onPress={saveEntry}
          >
            <Text style={styles.saveButtonText}>{t('growth.saveMeasurement')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('growth.history')}</Text>
        <View style={styles.historyCard}>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>{t('growth.noEntries')}</Text>
          ) : (
            entries.map((entry, idx) => {
              const prev = entries[idx + 1];
              const weightTrend = prev ? getTrendArrow(entry.weight, prev.weight) : '';
              const heightTrend = prev ? getTrendArrow(entry.height, prev.height) : '';
              return (
                <View key={entry.id} style={styles.entryRow}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryDate}>{entry.date}</Text>
                    <Text style={styles.entryMeasurements}>
                      H: {entry.height} cm {heightTrend} | W: {entry.weight} kg {weightTrend}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



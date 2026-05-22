/**
 * Salary Comparator Component
 * Shows where user stands vs market range with visual anchor
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ThemedText } from './themed-text';
import { Spacing } from '@/constants/theme';

interface MarketData {
  low: number;
  median: number;
  high: number;
  currency: string;
}

interface SalaryComparatorProps {
  jobTitle: string;
  level: string;
  userTarget: number;
  market: MarketData;
  positionPercent: number;
  status: string;
  statusLabel: string;
  statusColor: string;
  comparisonText: string;
  recommendation: string;
  negotiationTips: string[];
}

const SalaryComparator: React.FC<SalaryComparatorProps> = ({
  jobTitle,
  level,
  userTarget,
  market,
  positionPercent,
  status,
  statusLabel,
  statusColor,
  comparisonText,
  recommendation,
  negotiationTips,
}) => {
  const formatCurrency = (value: number, currency: string = 'HKD') => {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const levelLabels: Record<string, string> = {
    junior: '初級 (0-3年)',
    mid: '中級 (4-7年)',
    senior: '高級 (8+年)',
  };

  // Calculate user marker position on the bar (0-100%)
  const userMarkerPosition = Math.min(100, Math.max(0, positionPercent));

  // Calculate median marker position (should be around 50% if range is properly distributed)
  const range = market.high - market.low;
  const medianPosition = range > 0 ? ((market.median - market.low) / range) * 100 : 50;

  const handleLinkToNegotiation = () => {
    // Link to negotiation tips or CV improvement
    Linking.openURL('https://example.com/negotiation-tips');
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        薪資比較分析
      </ThemedText>

      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <ThemedText type="default" style={styles.statusBadgeText}>
          {statusLabel}
        </ThemedText>
      </View>

      {/* Comparison Context */}
      <View style={styles.comparisonContext}>
        <ThemedText type="subtitle" style={styles.comparisonText}>
          {comparisonText}
        </ThemedText>
      </View>

      {/* Visual Bar with Market Range */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          {/* Color zones */}
          <View style={[styles.zone, styles.zoneLow]} />
          <View style={[styles.zone, styles.zoneMedian]} />
          <View style={[styles.zone, styles.zoneHigh]} />

          {/* Median Marker */}
          <View style={[styles.medianMarker, { left: `${medianPosition}%` }]} />

          {/* User Position Marker */}
          <View style={[styles.userMarker, { left: `${userMarkerPosition}%` }]}>
            <View style={[styles.userMarkerDot, { backgroundColor: statusColor }]} />
            <View style={[styles.userMarkerLine, { backgroundColor: statusColor }]} />
          </View>
        </View>

        {/* Bar Labels */}
        <View style={styles.barLabels}>
          <View style={styles.labelItem}>
            <ThemedText type="small" style={styles.labelTitle}>低</ThemedText>
            <ThemedText type="default" style={styles.labelValue}>{formatCurrency(market.low)}</ThemedText>
          </View>
          <View style={styles.labelItem}>
            <ThemedText type="small" style={styles.labelTitle}>中位數</ThemedText>
            <ThemedText type="default" style={[styles.labelValue, styles.medianLabel]}>{formatCurrency(market.median)}</ThemedText>
          </View>
          <View style={styles.labelItem}>
            <ThemedText type="small" style={styles.labelTitle}>高</ThemedText>
            <ThemedText type="default" style={styles.labelValue}>{formatCurrency(market.high)}</ThemedText>
          </View>
        </View>
      </View>

      {/* User Target */}
      <View style={styles.userTargetContainer}>
        <ThemedText type="small" style={styles.userTargetLabel}>你的期望薪資</ThemedText>
        <ThemedText type="title" style={[styles.userTargetValue, { color: statusColor }]}>
          {formatCurrency(userTarget)}
        </ThemedText>
      </View>

      {/* Recommendation */}
      <View style={styles.recommendationContainer}>
        <ThemedText type="default" style={[styles.recommendationText, { color: statusColor }]}>
          {recommendation}
        </ThemedText>
      </View>

      {/* Negotiation Tips */}
      <View style={styles.tipsContainer}>
        <ThemedText type="smallBold" style={styles.tipsTitle}>
          薪資談判建議
        </ThemedText>
        {negotiationTips.map((tip, index) => (
          <View key={index} style={styles.tipItem}>
            <View style={[styles.tipBullet, { backgroundColor: statusColor }]} />
            <ThemedText type="small" style={styles.tipText}>{tip}</ThemedText>
          </View>
        ))}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: statusColor }]}
        onPress={handleLinkToNegotiation}
        accessibilityLabel="查看談判技巧連結"
      >
        <ThemedText type="default" style={styles.ctaButtonText}>
          爭取更好的薪資
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.four,
    marginTop: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: 20,
    marginBottom: Spacing.three,
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '600',
  },
  comparisonContext: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  comparisonText: {
    textAlign: 'center',
    color: '#333',
  },
  barContainer: {
    marginVertical: Spacing.four,
  },
  barBackground: {
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  zone: {
    height: '100%',
  },
  zoneLow: {
    backgroundColor: '#dbeafe',
    flex: 33,
  },
  zoneMedian: {
    backgroundColor: '#bfdbfe',
    flex: 34,
  },
  zoneHigh: {
    backgroundColor: '#93c5fd',
    flex: 33,
  },
  medianMarker: {
    position: 'absolute',
    top: -4,
    width: 3,
    height: 40,
    backgroundColor: '#1d4ed8',
    borderRadius: 2,
    marginLeft: -1.5,
  },
  userMarker: {
    position: 'absolute',
    top: -8,
    alignItems: 'center',
    marginLeft: -12,
  },
  userMarkerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  userMarkerLine: {
    width: 3,
    height: 40,
    marginTop: 4,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.half,
  },
  labelItem: {
    alignItems: 'center',
  },
  labelTitle: {
    color: '#666',
    marginBottom: 2,
  },
  labelValue: {
    fontWeight: '600',
    color: '#333',
  },
  medianLabel: {
    color: '#007AFF',
  },
  userTargetContainer: {
    alignItems: 'center',
    marginVertical: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  userTargetLabel: {
    color: '#666',
    marginBottom: Spacing.half,
  },
  userTargetValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  recommendationContainer: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  recommendationText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  tipsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  tipsTitle: {
    marginBottom: Spacing.two,
    color: '#333',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.half,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: Spacing.half,
  },
  tipText: {
    flex: 1,
    color: '#555',
    lineHeight: 20,
  },
  ctaButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SalaryComparator;
/**
 * 薪資查詢畫面
 */
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import SalaryComparator from '@/components/salary-comparator';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

// 薪資回應類型
interface SalaryQueryResponse {
  job_title: string;
  level: string;
  low: number;
  median: number;
  high: number;
  currency: string;
  sample_size: number;
}

interface MarketRangeResponse {
  job_title: string;
  level: string;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  percentile_90: number;
  currency: string;
}

interface SalaryCompareResponse {
  job_title: string;
  level: string;
  market: {
    low: number;
    median: number;
    high: number;
    currency: string;
  };
  user_target: number;
  position_percent: number;
  status: string;
  status_label: string;
  status_color: string;
  comparison_text: string;
  recommendation: string;
  negotiation_tips: string[];
}

export default function SalaryQueryScreen() {
  const router = useRouter();

  // 表單狀態
  const [jobTitle, setJobTitle] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');

  // UI 狀態
  const [isLoading, setIsLoading] = useState(false);
  const [isMarketRangeLoading, setIsMarketRangeLoading] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SalaryQueryResponse | null>(null);
  const [marketResult, setMarketResult] = useState<MarketRangeResponse | null>(null);
  const [compareResult, setCompareResult] = useState<SalaryCompareResponse | null>(null);
  const [targetSalary, setTargetSalary] = useState('');

  const handleSubmit = async () => {
    // 驗證必填欄位
    if (!jobTitle.trim()) {
      Alert.alert('錯誤', '請輸入職位名稱');
      return;
    }
    if (!experienceYears.trim()) {
      Alert.alert('錯誤', '請輸入工作年資');
      return;
    }

    const years = parseInt(experienceYears, 10);
    if (isNaN(years) || years < 1 || years > 30) {
      Alert.alert('錯誤', '工作年資必須是 1-30 的數字');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setMarketResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/salary/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          experience_years: years,
          industry: industry.trim() || undefined,
          location: location.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '查詢失敗');
      }

      setResult(data);
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarketRange = async () => {
    if (!jobTitle.trim()) {
      Alert.alert('錯誤', '請輸入職位名稱以查詢市場薪資');
      return;
    }

    const years = experienceYears.trim() ? parseInt(experienceYears, 10) : 0;
    if (experienceYears.trim() && (isNaN(years) || years < 1 || years > 30)) {
      Alert.alert('錯誤', '工作年資必須是 1-30 的數字');
      return;
    }

    setIsMarketRangeLoading(true);
    setError(null);
    setResult(null);
    setMarketResult(null);

    try {
      const queryParams = new URLSearchParams({
        job_title: jobTitle.trim(),
        ...(years > 0 && { experience_years: years.toString() }),
      });

      const response = await fetch(
        `${API_BASE_URL}/salary/market-range/${encodeURIComponent(jobTitle.trim())}?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '查詢失敗');
      }

      setMarketResult(data);
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsMarketRangeLoading(false);
    }
  };

  const handleCompareSalary = async () => {
    if (!jobTitle.trim()) {
      Alert.alert('錯誤', '請輸入職位名稱');
      return;
    }
    if (!targetSalary.trim()) {
      Alert.alert('錯誤', '請輸入你的期望薪資');
      return;
    }

    const salary = parseInt(targetSalary.replace(/[^0-9]/g, ''), 10);
    if (isNaN(salary) || salary < 5000) {
      Alert.alert('錯誤', '請輸入有效的期望薪資');
      return;
    }

    const years = experienceYears.trim() ? parseInt(experienceYears, 10) : 5;

    setIsCompareLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/salary/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_title: jobTitle.trim(),
          experience_years: years,
          target_salary: salary,
          industry: industry.trim() || undefined,
          location: location.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '比較失敗');
      }

      setCompareResult(data);
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsCompareLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'HKD') => {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderSalaryRangeBar = (low: number, median: number, high: number) => {
    // 計算區間
    const range = high - low;
    const lowPercent = range > 0 ? ((median - low) / range) * 50 : 0;
    const highPercent = range > 0 ? ((high - median) / range) * 50 : 0;

    return (
      <View style={styles.rangeBarContainer}>
        <View style={styles.rangeBar}>
          <View style={[styles.rangeSegment, styles.rangeLow, { flex: 50 }]}>
            <View style={[styles.rangeFill, styles.rangeLowFill, { width: '100%' }]} />
          </View>
          <View style={[styles.rangeSegment, styles.rangeMedian, { flex: 0, width: 8 }]}>
            <View style={styles.medianIndicator} />
          </View>
          <View style={[styles.rangeSegment, styles.rangeHigh, { flex: 50 }]}>
            <View style={[styles.rangeFill, styles.rangeHighFill, { width: '100%' }]} />
          </View>
        </View>
        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>{formatCurrency(low)}</Text>
          <Text style={styles.rangeLabel}>Median</Text>
          <Text style={styles.rangeLabel}>{formatCurrency(high)}</Text>
        </View>
      </View>
    );
  };

  const renderResult = () => {
    if (!result) return null;

    const levelLabels: Record<string, string> = {
      junior: '初級 (0-3年)',
      mid: '中級 (4-7年)',
      senior: '高級 (8+年)',
    };

    return (
      <View style={styles.resultCard}>
        <ThemedText type="title" style={styles.resultTitle}>
          薪資查詢結果
        </ThemedText>
        <ThemedText type="subtitle" style={styles.resultSubtitle}>
          {result.job_title}
          {result.level && ` (${levelLabels[result.level] || result.level})`}
        </ThemedText>

        <View style={styles.percentileRow}>
          <View style={styles.percentileItem}>
            <ThemedText type="small" style={styles.percentileLabel}>
              25th
            </ThemedText>
            <ThemedText type="default" style={styles.percentileValue}>
              {formatCurrency(result.low)}
            </ThemedText>
          </View>
          <View style={styles.percentileItem}>
            <ThemedText type="small" style={styles.percentileLabel}>
              50th
            </ThemedText>
            <ThemedText type="default" style={[styles.percentileValue, styles.salaryMedian]}>
              {formatCurrency(result.median)}
            </ThemedText>
          </View>
          <View style={styles.percentileItem}>
            <ThemedText type="small" style={styles.percentileLabel}>
              75th
            </ThemedText>
            <ThemedText type="default" style={styles.percentileValue}>
              {formatCurrency(result.high)}
            </ThemedText>
          </View>
        </View>

        {renderSalaryRangeBar(result.low, result.median, result.high)}
      </View>
    );
  };

  const renderMarketResult = () => {
    if (!marketResult) return null;

    const levelLabels: Record<string, string> = {
      junior: '初級 (0-3年)',
      mid: '中級 (4-7年)',
      senior: '高級 (8+年)',
    };

    return (
      <View style={styles.resultCard}>
        <ThemedText type="title" style={styles.resultTitle}>
          市場薪資範圍
        </ThemedText>
        <ThemedText type="subtitle" style={styles.resultSubtitle}>
          {marketResult.job_title}
          {marketResult.level && ` (${levelLabels[marketResult.level] || marketResult.level})`}
        </ThemedText>

        <View style={styles.percentileRow}>
          <View style={styles.percentileItem}>
            <ThemedText type="small" style={styles.percentileLabel}>
              25th
            </ThemedText>
            <ThemedText type="default" style={styles.percentileValue}>
              {formatCurrency(marketResult.percentile_25)}
            </ThemedText>
          </View>
          <View style={styles.percentileItem}>
            <ThemedText type="small" style={styles.percentileLabel}>
              50th
            </ThemedText>
            <ThemedText type="default" style={[styles.percentileValue, styles.salaryMedian]}>
              {formatCurrency(marketResult.percentile_50)}
            </ThemedText>
          </View>
          <View style={styles.percentileItem}>
            <ThemedText type="small" style={styles.percentileLabel}>
              75th
            </ThemedText>
            <ThemedText type="default" style={styles.percentileValue}>
              {formatCurrency(marketResult.percentile_75)}
            </ThemedText>
          </View>
        </View>

        {renderSalaryRangeBar(
          marketResult.percentile_25,
          marketResult.percentile_50,
          marketResult.percentile_75
        )}

        <View style={styles.percentileNote}>
          <ThemedText type="small" style={styles.noteText}>
            90th percentile: {formatCurrency(marketResult.percentile_90)}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderCompareResult = () => {
    if (!compareResult) return null;

    return (
      <SalaryComparator
        jobTitle={compareResult.job_title}
        level={compareResult.level}
        userTarget={compareResult.user_target}
        market={compareResult.market}
        positionPercent={compareResult.position_percent}
        status={compareResult.status}
        statusLabel={compareResult.status_label}
        statusColor={compareResult.status_color}
        comparisonText={compareResult.comparison_text}
        recommendation={compareResult.recommendation}
        negotiationTips={compareResult.negotiation_tips}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              薪資查詢
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              輸入職位資訊以查詢薪資範圍
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>
                職位名稱 *
              </ThemedText>
              <TextInput
                style={[styles.input, isLoading && styles.inputDisabled]}
                placeholder="例如：軟體工程師、產品經理"
                placeholderTextColor="#999"
                value={jobTitle}
                onChangeText={setJobTitle}
                editable={!isLoading}
                accessibilityLabel="職位名稱輸入"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>
                工作年資 * (1-30)
              </ThemedText>
              <TextInput
                style={[styles.input, isLoading && styles.inputDisabled]}
                placeholder="例如：5"
                placeholderTextColor="#999"
                value={experienceYears}
                onChangeText={setExperienceYears}
                keyboardType="number-pad"
                editable={!isLoading}
                accessibilityLabel="工作年資輸入"
                maxLength={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>
                產業 (選填)
              </ThemedText>
              <TextInput
                style={[styles.input, isLoading && styles.inputDisabled]}
                placeholder="例如：科技、金融、醫療"
                placeholderTextColor="#999"
                value={industry}
                onChangeText={setIndustry}
                editable={!isLoading}
                accessibilityLabel="產業輸入"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>
                地點 (選填)
              </ThemedText>
              <TextInput
                style={[styles.input, isLoading && styles.inputDisabled]}
                placeholder="例如：香港、新加坡"
                placeholderTextColor="#999"
                value={location}
                onChangeText={setLocation}
                editable={!isLoading}
                accessibilityLabel="地點輸入"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold" style={styles.label}>
                期望薪資 (HKD) *
              </ThemedText>
              <TextInput
                style={[styles.input, isLoading && styles.inputDisabled]}
                placeholder="例如：50000"
                placeholderTextColor="#999"
                value={targetSalary}
                onChangeText={setTargetSalary}
                keyboardType="number-pad"
                editable={!isLoading}
                accessibilityLabel="期望薪資輸入"
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              accessibilityLabel="查詢薪資按鈕"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>查詢薪資</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, isMarketRangeLoading && styles.buttonDisabled]}
              onPress={handleMarketRange}
              disabled={isMarketRangeLoading}
              accessibilityLabel="市場薪資範圍按鈕"
            >
              {isMarketRangeLoading ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={styles.secondaryButtonText}>市場薪資範圍</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.compareButton, isCompareLoading && styles.buttonDisabled]}
              onPress={handleCompareSalary}
              disabled={isCompareLoading}
              accessibilityLabel="薪資比較按鈕"
            >
              {isCompareLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.compareButtonText}>比較我的薪資</Text>
              )}
            </TouchableOpacity>
          </View>

          {renderResult()}
          {renderMarketResult()}
          {renderCompareResult()}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.four,
  },
  header: {
    marginBottom: Spacing.five,
  },
  title: {
    marginBottom: Spacing.two,
  },
  subtitle: {
    color: '#666',
  },
  form: {
    gap: Spacing.three,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    marginBottom: Spacing.half,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    backgroundColor: '#a0cfff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  compareButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  compareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.four,
    marginTop: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  resultSubtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: Spacing.four,
  },
  salaryNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  salaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  salaryLabel: {
    color: '#666',
    marginBottom: Spacing.half,
  },
  salaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  salaryMedian: {
    color: '#007AFF',
    fontSize: 22,
  },
  percentileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
  },
  percentileItem: {
    alignItems: 'center',
    flex: 1,
  },
  percentileLabel: {
    color: '#666',
    marginBottom: Spacing.half,
  },
  percentileValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  percentileNote: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  noteText: {
    color: '#888',
    fontSize: 13,
  },
  rangeBarContainer: {
    marginTop: Spacing.two,
  },
  rangeBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  rangeSegment: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeLow: {
    backgroundColor: '#dbeafe',
  },
  rangeLowFill: {
    backgroundColor: '#3b82f6',
    height: '100%',
    borderRadius: 12,
  },
  rangeMedian: {
    backgroundColor: '#60a5fa',
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -4 }],
    zIndex: 1,
  },
  medianIndicator: {
    width: 8,
    height: 24,
    backgroundColor: '#1d4ed8',
    borderRadius: 4,
  },
  rangeHigh: {
    backgroundColor: '#dbeafe',
  },
  rangeHighFill: {
    backgroundColor: '#3b82f6',
    height: '100%',
    borderRadius: 12,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.half,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#666',
  },
});
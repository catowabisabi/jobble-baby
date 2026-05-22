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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

// 薪資回應類型
interface SalaryQueryResponse {
  low: number;
  median: number;
  high: number;
  currency: string;
}

interface MarketRangeResponse {
  job_title: string;
  experience_years: number;
  low: number;
  median: number;
  high: number;
  currency: string;
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
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SalaryQueryResponse | null>(null);
  const [marketResult, setMarketResult] = useState<MarketRangeResponse | null>(null);

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

    return (
      <View style={styles.resultCard}>
        <ThemedText type="title" style={styles.resultTitle}>
          薪資查詢結果
        </ThemedText>
        <ThemedText type="subtitle" style={styles.resultSubtitle}>
          {jobTitle}
        </ThemedText>

        <View style={styles.salaryNumbers}>
          <View style={styles.salaryItem}>
            <ThemedText type="small" style={styles.salaryLabel}>
              低位
            </ThemedText>
            <ThemedText type="default" style={styles.salaryValue}>
              {formatCurrency(result.low)}
            </ThemedText>
          </View>
          <View style={styles.salaryItem}>
            <ThemedText type="small" style={styles.salaryLabel}>
              中位
            </ThemedText>
            <ThemedText type="default" style={[styles.salaryValue, styles.salaryMedian]}>
              {formatCurrency(result.median)}
            </ThemedText>
          </View>
          <View style={styles.salaryItem}>
            <ThemedText type="small" style={styles.salaryLabel}>
              高位
            </ThemedText>
            <ThemedText type="default" style={styles.salaryValue}>
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

    return (
      <View style={styles.resultCard}>
        <ThemedText type="title" style={styles.resultTitle}>
          市場薪資範圍
        </ThemedText>
        <ThemedText type="subtitle" style={styles.resultSubtitle}>
          {marketResult.job_title}
          {marketResult.experience_years > 0 && ` (${marketResult.experience_years}年經驗)`}
        </ThemedText>

        <View style={styles.salaryNumbers}>
          <View style={styles.salaryItem}>
            <ThemedText type="small" style={styles.salaryLabel}>
              低位
            </ThemedText>
            <ThemedText type="default" style={styles.salaryValue}>
              {formatCurrency(marketResult.low)}
            </ThemedText>
          </View>
          <View style={styles.salaryItem}>
            <ThemedText type="small" style={styles.salaryLabel}>
              中位
            </ThemedText>
            <ThemedText type="default" style={[styles.salaryValue, styles.salaryMedian]}>
              {formatCurrency(marketResult.median)}
            </ThemedText>
          </View>
          <View style={styles.salaryItem}>
            <ThemedText type="small" style={styles.salaryLabel}>
              高位
            </ThemedText>
            <ThemedText type="default" style={styles.salaryValue}>
              {formatCurrency(marketResult.high)}
            </ThemedText>
          </View>
        </View>

        {renderSalaryRangeBar(marketResult.low, marketResult.median, marketResult.high)}
      </View>
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
          </View>

          {renderResult()}
          {renderMarketResult()}
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
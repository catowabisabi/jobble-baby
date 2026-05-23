import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { JobMatchCard, JobMatchCardProps } from '@/components/job-match-card';
import { Spacing, Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'] as const;

interface Step2JobPreferencesProps {
  onBack: () => void;
  onNext: () => void;
}

export default function Step2JobPreferences({ onBack, onNext }: Step2JobPreferencesProps) {
  const { token } = useAuth();

  const [jobType, setJobType] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [salaryMin, setSalaryMin] = useState<string>('');
  const [salaryMax, setSalaryMax] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchingJobs, setMatchingJobs] = useState<JobMatchCardProps['job'][]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSubmit = async () => {
    if (!jobType) {
      Alert.alert('錯誤', '請選擇工作類型');
      return;
    }
    if (!location.trim()) {
      Alert.alert('錯誤', '請輸入工作地點');
      return;
    }

    setIsSubmitting(true);

    try {
      const alertResponse = await fetch(`${API_BASE_URL}/users/alert-preferences`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_types: [jobType],
          locations: [location.trim()],
          salary_min: salaryMin ? parseInt(salaryMin, 10) : null,
          salary_max: salaryMax ? parseInt(salaryMax, 10) : null,
        }),
      });

      if (!alertResponse.ok) {
        const errorData = await alertResponse.json();
        throw new Error(errorData.detail || '儲存偏好設定失敗');
      }

      setIsLoadingMatches(true);
      const params = new URLSearchParams({
        job_type: jobType,
        location: location.trim(),
      });
      if (salaryMin) params.append('salary_min', salaryMin);
      if (salaryMax) params.append('salary_max', salaryMax);

      const matchesResponse = await fetch(`${API_BASE_URL}/jobs/matches?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!matchesResponse.ok) {
        throw new Error('獲取配對職位失敗');
      }

      const matchesData = await matchesResponse.json();
      const jobs = Array.isArray(matchesData.jobs) ? matchesData.jobs : [];
      setMatchingJobs(jobs.slice(0, 3));
      setShowResults(true);
    } catch (e: any) {
      Alert.alert('錯誤', e.message || '網絡錯誤');
    } finally {
      setIsSubmitting(false);
      setIsLoadingMatches(false);
    }
  };

  const canProceed = jobType && location.trim();

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              求職偏好
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              設定你的理想職位條件
            </ThemedText>
          </View>

          {!showResults ? (
            <>
              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  工作類型
                </ThemedText>
                <View style={styles.chipsContainer}>
                  {JOB_TYPES.map((type, index) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        jobType === type && styles.chipSelected,
                        { marginRight: index < JOB_TYPES.length - 1 ? Spacing.two : 0 },
                      ]}
                      onPress={() => setJobType(type)}
                    >
                      <ThemedText
                        type="small"
                        style={[
                          styles.chipText,
                          jobType === type && styles.chipTextSelected,
                        ]}
                      >
                        {type}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  工作地點
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="例如：香港島、九龍、遙距"
                  placeholderTextColor="#999"
                  value={location}
                  onChangeText={setLocation}
                  editable={!isSubmitting}
                  accessibilityLabel="工作地點輸入"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  月薪範圍 (HK$)
                </ThemedText>
                <View style={styles.salaryRow}>
                  <View style={styles.salaryInputContainer}>
                    <ThemedText type="small" style={styles.currencyPrefix}>
                      最低
                    </ThemedText>
                    <TextInput
                      style={[styles.input, styles.salaryInput]}
                      placeholder="e.g. 30000"
                      placeholderTextColor="#999"
                      value={salaryMin}
                      onChangeText={setSalaryMin}
                      keyboardType="number-pad"
                      editable={!isSubmitting}
                      accessibilityLabel="最低薪資輸入"
                    />
                  </View>
                  <View style={styles.salaryInputContainer}>
                    <ThemedText type="small" style={styles.currencyPrefix}>
                      最高
                    </ThemedText>
                    <TextInput
                      style={[styles.input, styles.salaryInput]}
                      placeholder="e.g. 80000"
                      placeholderTextColor="#999"
                      value={salaryMax}
                      onChangeText={setSalaryMax}
                      keyboardType="number-pad"
                      editable={!isSubmitting}
                      accessibilityLabel="最高薪資輸入"
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, (!canProceed || isSubmitting) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={!canProceed || isSubmitting}
                accessibilityLabel="搜尋配對職位"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText type="default" style={styles.buttonText}>
                    搜尋配對職位
                  </ThemedText>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.resultsSection}>
                <ThemedText type="subtitle" style={styles.resultsTitle}>
                  找到 {matchingJobs.length} 個配對職位！
                </ThemedText>
                <View style={styles.rewardBadge}>
                  <ThemedText type="small" style={styles.rewardBadgeText}>
                    Jobs tailored to you!
                  </ThemedText>
                </View>
              </View>

              {isLoadingMatches ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <ThemedText type="small" style={styles.loadingText}>
                    載入配對職位中...
                  </ThemedText>
                </View>
              ) : (
                <>
                  {matchingJobs.length > 0 ? (
                    <View style={styles.jobsContainer}>
                      {matchingJobs.map((job) => (
                        <JobMatchCard key={job.id} job={job} />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.noJobsContainer}>
                      <ThemedText themeColor="textSecondary" style={styles.noJobsText}>
                        暫時沒有符合條件的職位
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.navigationButtons}>
                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={onBack}
                      accessibilityLabel="上一步"
                    >
                      <ThemedText type="default" style={styles.backButtonText}>
                        上一步
                      </ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.nextButton, !canProceed && styles.buttonDisabled]}
                      onPress={onNext}
                      disabled={!canProceed}
                      accessibilityLabel="下一步"
                    >
                      <ThemedText type="default" style={styles.nextButtonText}>
                        下一步
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  label: {
    marginBottom: Spacing.two,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: Colors.light.backgroundElement,
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  salaryRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  salaryInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  currencyPrefix: {
    paddingLeft: Spacing.three,
    color: '#666',
  },
  salaryInput: {
    flex: 1,
    borderWidth: 0,
    paddingLeft: Spacing.half,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  buttonDisabled: {
    backgroundColor: '#a0cfff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultsSection: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  rewardBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  rewardBadgeText: {
    color: '#333',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.six,
  },
  loadingText: {
    marginTop: Spacing.two,
    color: '#666',
  },
  jobsContainer: {
    gap: Spacing.two,
  },
  noJobsContainer: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  noJobsText: {
    fontSize: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
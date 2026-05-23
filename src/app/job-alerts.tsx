/**
 * 求職警報設定畫面
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import PremiumGate from '@/components/premium-gate';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

const JOB_TYPES = ['Backend', 'Frontend', 'Full Stack', 'DevOps', 'Data', 'Mobile', 'PM', 'Design'] as const;
const JOB_TYPE_CATEGORIES: Record<typeof JOB_TYPES[number], string> = {
  Backend: 'engineering',
  Frontend: 'engineering',
  'Full Stack': 'engineering',
  DevOps: 'engineering',
  Data: 'engineering',
  Mobile: 'engineering',
  PM: 'general',
  Design: 'general',
};

const LOCATIONS = ['Hong Kong', 'Remote', 'Kowloon', 'New Territories'] as const;

interface AlertPreferences {
  job_types: string[];
  locations: string[];
  min_salary: number | null;
  keywords: string[];
  notifications_enabled: boolean;
}

export default function JobAlertsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [selectedJobTypes, setSelectedJobTypes] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [minSalary, setMinSalary] = useState('');
  const [keywords, setKeywords] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadPreferences();
    }
  }, [token]);

  const loadPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/users/alert-preferences`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load preferences');
      }

      const data: AlertPreferences = await response.json();

      if (data.job_types && Array.isArray(data.job_types)) {
        setSelectedJobTypes(new Set(data.job_types));
      }
      if (data.locations && Array.isArray(data.locations)) {
        setSelectedLocations(new Set(data.locations));
      }
      if (data.min_salary) {
        setMinSalary(data.min_salary.toString());
      }
      if (data.keywords && Array.isArray(data.keywords)) {
        setKeywords(data.keywords.join(', '));
      }
      if (data.notifications_enabled !== undefined) {
        setNotificationsEnabled(data.notifications_enabled);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load preferences');
      console.warn('Failed to load alert preferences:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleJobType = (jobType: string) => {
    const newSelected = new Set(selectedJobTypes);
    if (newSelected.has(jobType)) {
      newSelected.delete(jobType);
    } else {
      newSelected.add(jobType);
    }
    setSelectedJobTypes(newSelected);
  };

  const toggleLocation = (location: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(location)) {
      newSelected.delete(location);
    } else {
      newSelected.add(location);
    }
    setSelectedLocations(newSelected);
  };

  const handleSave = async () => {
    if (selectedJobTypes.size === 0) {
      Alert.alert('錯誤', '請選擇至少一個職位類型');
      return;
    }

    if (selectedLocations.size === 0) {
      Alert.alert('錯誤', '請選擇至少一個地點');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const keywordList = keywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const response = await fetch(`${API_BASE_URL}/users/alert-preferences`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_types: Array.from(selectedJobTypes),
          locations: Array.from(selectedLocations),
          min_salary: minSalary ? parseInt(minSalary, 10) : null,
          keywords: keywordList,
          notifications_enabled: notificationsEnabled,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || '儲存失敗');
      }

      Alert.alert('成功', '警報設定已儲存', [
        {
          text: '確定',
          onPress: () => router.back(),
        },
      ]);
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
      Alert.alert('錯誤', e.message || '儲存失敗');
    } finally {
      setIsSaving(false);
    }
  };

  const renderChip = (
    label: string,
    isSelected: boolean,
    onPress: () => void,
    index: number
  ) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
        { marginRight: index < JOB_TYPES.length - 1 ? Spacing.two : 0 },
      ]}
    >
      <ThemedText
        type="small"
        style={[styles.chipText, isSelected && styles.chipTextSelected]}
      >
        {label}
      </ThemedText>
    </TouchableOpacity>
  );

if (isLoading) {
    return (
      <PremiumGate featureName="求職警報設定">
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <ThemedText type="small" style={styles.loadingText}>
              載入設定中...
            </ThemedText>
          </View>
        </ThemedView>
      </PremiumGate>
    );
  }

  return (
    <PremiumGate featureName="求職警報設定">
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
                求職警報
              </ThemedText>
              <ThemedText type="subtitle" style={styles.subtitle}>
                設定您的職位偏好以獲得最新招聘資訊
              </ThemedText>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              </View>
            )}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  職位類型
                </ThemedText>
                <View style={styles.chipsContainer}>
                  {JOB_TYPES.map((jobType, index) =>
                    renderChip(jobType, selectedJobTypes.has(jobType), () => toggleJobType(jobType), index)
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  地點
                </ThemedText>
                <View style={styles.chipsContainer}>
                  {LOCATIONS.map((location, index) =>
                    renderChip(location, selectedLocations.has(location), () => toggleLocation(location), index)
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  最低薪資 (HK$)
                </ThemedText>
                <View style={styles.salaryInputContainer}>
                  <ThemedText type="default" style={styles.currencyPrefix}>
                    HK$
                  </ThemedText>
                  <TextInput
                    style={[styles.input, styles.salaryInput]}
                    placeholder="例如：30000"
                    placeholderTextColor="#999"
                    value={minSalary}
                    onChangeText={setMinSalary}
                    keyboardType="number-pad"
                    accessibilityLabel="最低薪資輸入"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="smallBold" style={styles.label}>
                  關鍵字 (逗號分隔)
                </ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="例如：React, TypeScript, Senior"
                  placeholderTextColor="#999"
                  value={keywords}
                  onChangeText={setKeywords}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="關鍵字輸入"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabelContainer}>
                    <ThemedText type="smallBold" style={styles.label}>
                      接收通知
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.toggleDescription}>
                      當有新職位符合您的偏好時通知您
                    </ThemedText>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#e0e0e0', true: '#81c784' }}
                    thumbColor={notificationsEnabled ? '#4CAF50' : '#f4f4f4'}
                    accessibilityLabel="通知開關"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
                accessibilityLabel="儲存設定按鈕"
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText type="default" style={styles.buttonText}>
                    儲存設定
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </PremiumGate>
  );
}
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
    gap: Spacing.four,
  },
  inputGroup: {
    gap: Spacing.one,
  },
  label: {
    marginBottom: Spacing.half,
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
    backgroundColor: '#f5f5f5',
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
  salaryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  currencyPrefix: {
    paddingLeft: 16,
    color: '#666',
  },
  salaryInput: {
    flex: 1,
    paddingLeft: Spacing.half,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: Spacing.three,
  },
  toggleDescription: {
    marginTop: Spacing.half,
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
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    marginTop: Spacing.two,
    color: '#666',
  },
});
    </PremiumGate>
  );
}

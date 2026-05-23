import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { JobMatchCard } from '@/components/job-match-card';
import { Colors, Spacing } from '@/constants/theme';

const JOB_TYPES = ['全職', '兼職', '合約', '實習', '臨時'];
const LOCATIONS = ['香港島', '九龍', '新界', '混合', '遙距'];
const SALARY_MIN = 15000;
const SALARY_MAX = 150000;
const SALARY_STEP = 5000;

const MOCK_JOBS = [
  { id: '1', title: '高級軟件工程師', company: 'TechCorp HK', salary_range: '45,000 - 65,000', match_score: 0.92 },
  { id: '2', title: '產品經理', company: 'StartupHub', salary_range: '40,000 - 55,000', match_score: 0.85 },
  { id: '3', title: '數據分析師', company: 'DataWorks', salary_range: '30,000 - 42,000', match_score: 0.78 },
];

interface Step2PreferencesProps {
  onComplete: (preferences: {
    job_types: string[];
    locations: string[];
    salary_min: number;
  }) => void;
}

export default function Step2Preferences({ onComplete }: Step2PreferencesProps) {
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState(SALARY_MIN);

  const toggleJobType = (type: string) => {
    setSelectedJobTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const matchingCount = useMemo(() => {
    if (selectedJobTypes.length === 0 || selectedLocations.length === 0) return 0;
    return Math.floor(Math.random() * 20) + 5;
  }, [selectedJobTypes, selectedLocations, salaryMin]);

  const canProceed = selectedJobTypes.length > 0 && selectedLocations.length > 0;

  const handleComplete = () => {
    onComplete({
      job_types: selectedJobTypes,
      locations: selectedLocations,
      salary_min: salaryMin,
    });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(400)}>
        <ThemedText type="subtitle" style={styles.title}>
          設定求職偏好
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          告訴我們你想要的工作
        </ThemedText>

        
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            工作類型
          </ThemedText>
          <View style={styles.chipContainer}>
            {JOB_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  selectedJobTypes.includes(type) && styles.chipSelected,
                ]}
                onPress={() => toggleJobType(type)}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.chipText,
                    selectedJobTypes.includes(type) && styles.chipTextSelected,
                  ]}
                >
                  {type}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            工作地點
          </ThemedText>
          <View style={styles.chipContainer}>
            {LOCATIONS.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[
                  styles.chip,
                  selectedLocations.includes(loc) && styles.chipSelected,
                ]}
                onPress={() => toggleLocation(loc)}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.chipText,
                    selectedLocations.includes(loc) && styles.chipTextSelected,
                  ]}
                >
                  {loc}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        
        <View style={styles.section}>
          <View style={styles.salaryHeader}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              最低月薪要求
            </ThemedText>
            <ThemedText type="small" style={styles.salaryValue}>
              {salaryMin.toLocaleString()} HKD
            </ThemedText>
          </View>
          <View style={styles.sliderContainer}>
            <Text>{SALARY_MIN.toLocaleString()}</Text>
            <View style={styles.salaryButtons}>
              <TouchableOpacity
                style={styles.salaryButton}
                onPress={() => setSalaryMin(Math.max(SALARY_MIN, salaryMin - SALARY_STEP))}
              >
                <Text>-5k</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.salaryButton}
                onPress={() => setSalaryMin(Math.min(SALARY_MAX, salaryMin + SALARY_STEP))}
              >
                <Text>+5k</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {canProceed && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.matchesSection}>
            <TouchableOpacity style={styles.ctaButton} onPress={handleComplete}>
              <ThemedText type="smallBold" style={styles.ctaButtonText}>
                找到了 {matchingCount} 個配職
              </ThemedText>
            </TouchableOpacity>
            {MOCK_JOBS.map(job => (
              <JobMatchCard key={job.id} job={job} />
            ))}
          </Animated.View>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.five,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    backgroundColor: Colors.light.backgroundElement,
  },
  chipSelected: {
    backgroundColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#fff',
  },
  salaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  salaryValue: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sliderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salaryButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  salaryButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
  },
  matchesSection: {
    marginTop: Spacing.four,
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
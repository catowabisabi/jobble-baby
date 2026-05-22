/**
 * CV Score Detail Screen
 * Shows AI CV analysis: overall score, category breakdown, and feedback
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

// Mock CV analysis data (replace with actual API data when backend is ready)
const MOCK_CV_ANALYSIS = {
  overall: 7.5,
  categories: [
    {
      name: 'Experience',
      score: 8,
      feedback: 'Strong work history with relevant experience. Consider quantifying achievements.',
    },
    {
      name: 'Skills',
      score: 7,
      feedback: 'Good technical skill set. Add more specific tool/technology keywords.',
    },
    {
      name: 'Education',
      score: 7,
      feedback: 'Adequate educational background. Consider reordering for relevance.',
    },
    {
      name: 'Formatting',
      score: 6,
      feedback: 'Consider improving layout and visual hierarchy. Use consistent formatting.',
    },
  ],
  overall_feedback:
    'Your CV is above average. Focus on quantifying achievements and tailoring keywords for each application to maximize interview chances.',
};

function getScoreColor(score: number): string {
  if (score >= 8) return '#34C759';
  if (score >= 6) return '#007AFF';
  if (score >= 4) return '#FF9500';
  return '#FF3B30';
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = score * 10;
  const color = getScoreColor(score);

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={[styles.scoreBarValue, { color }]}>{score}/10</Text>
      </View>
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

function getOverallBadgeColor(score: number): string {
  if (score >= 8) return '#34C759';
  if (score >= 6) return '#007AFF';
  return '#FF9500';
}

export default function CVDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const analysis = MOCK_CV_ANALYSIS;
  const badgeColor = getOverallBadgeColor(analysis.overall);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          CV 分析報告
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Overall Score */}
        <View style={styles.overallSection}>
          <View style={[styles.overallBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.overallScore}>{analysis.overall}</Text>
            <Text style={styles.overallMax}>/10</Text>
          </View>
          <Text style={styles.overallLabel}>整體評分</Text>
        </View>

        {/* Category Breakdown */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>各項評分</Text>
          {analysis.categories.map((cat) => (
            <ScoreBar key={cat.name} label={cat.name} score={cat.score} />
          ))}
        </View>

        {/* Category Feedback */}
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionTitle}>改進建議</Text>
          {analysis.categories.map((cat) => (
            <View key={cat.name} style={styles.feedbackItem}>
              <View style={styles.feedbackHeader}>
                <Text style={styles.feedbackCategory}>{cat.name}</Text>
                <Text style={[styles.feedbackScore, { color: getScoreColor(cat.score) }]}>
                  {cat.score}/10
                </Text>
              </View>
              <Text style={styles.feedbackText}>{cat.feedback}</Text>
            </View>
          ))}
        </View>

        {/* Overall Feedback */}
        <View style={styles.overallFeedbackSection}>
          <Text style={styles.sectionTitle}>總結</Text>
          <View style={styles.overallFeedbackCard}>
            <Text style={styles.overallFeedbackText}>{analysis.overall_feedback}</Text>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    paddingTop: Spacing.five,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingRight: Spacing.three,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
  },
  overallSection: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    marginBottom: Spacing.four,
  },
  overallBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: Spacing.two,
  },
  overallScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  overallMax: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  overallLabel: {
    fontSize: 16,
    color: '#666',
  },
  categoriesSection: {
    marginBottom: Spacing.five,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.three,
  },
  scoreBarContainer: {
    marginBottom: Spacing.three,
  },
  scoreBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  scoreBarLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  scoreBarValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreBarTrack: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  feedbackSection: {
    marginBottom: Spacing.five,
  },
  feedbackItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  feedbackCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  feedbackScore: {
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  overallFeedbackSection: {
    marginBottom: Spacing.five,
  },
  overallFeedbackCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: Spacing.four,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  overallFeedbackText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
});
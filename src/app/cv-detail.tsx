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
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCVAnalysis } from '@/hooks/useCVAnalysis';

import PremiumGate from '@/components/premium-gate';
const CATEGORY_META: Record<string, { label: string; feedback: string }> = {
  role_relevance: { label: 'Role Relevance', feedback: 'How well your experience matches target roles.' },
  experience_years: { label: 'Experience', feedback: 'Years of relevant work experience.' },
  education_quality: { label: 'Education', feedback: 'Quality and relevance of educational background.' },
  skills_clarity: { label: 'Skills', feedback: 'Clarity and specificity of listed skills.' },
  quantified_achievements: { label: 'Achievements', feedback: 'Use of quantified results and metrics.' },
};

function getScoreColor(score: number): string {
  if (score >= 8) return '#34C759';
  if (score >= 6) return '#007AFF';
  if (score >= 4) return '#FF9500';
  return '#FF3B30';
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = Math.min(100, score * 10);
  const color = getScoreColor(score);

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={[styles.scoreBarValue, { color }]}>{score.toFixed(1)}/10</Text>
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

function LoadingView() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>分析中...</Text>
    </View>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>載入失敗：{message}</Text>
    </View>
  );
}

export default function CVDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cvId = id ? parseInt(id, 10) : null;

  const { analysis, status, error } = useCVAnalysis(cvId);

  if (!cvId) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 返回</Text>
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>CV 分析報告</ThemedText>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>無法獲得 CV ID</Text>
        </View>
      </ThemedView>
    );
  }

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

      {status === 'loading' && <LoadingView />}

      {status === 'error' && <ErrorView message={error || '未知錯誤'} />}

      {status === 'success' && analysis && (() => {
        const overallScore = analysis.overall_professionalism;
        const badgeColor = getOverallBadgeColor(overallScore);
        const categories = Object.entries(CATEGORY_META).map(([key, meta]) => ({
          name: meta.label,
          score: (analysis[key as keyof typeof analysis] as number) ?? 0,
          feedback: meta.feedback,
        }));

        return (
          <PremiumGate featureName="CV 評分與優化">
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              {/* Overall Score */}
              <View style={styles.overallSection}>
                <View style={[styles.overallBadge, { backgroundColor: badgeColor }]}>
                  <Text style={styles.overallScore}>{overallScore.toFixed(1)}</Text>
                  <Text style={styles.overallMax}>/10</Text>
                </View>
                <Text style={styles.overallLabel}>整體評分</Text>
              </View>

              {/* Category Breakdown */}
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionTitle}>各項評分</Text>
                {categories.map((cat) => (
                  <ScoreBar key={cat.name} label={cat.name} score={cat.score} />
                ))}
              </View>

              {/* Category Feedback */}
              <View style={styles.feedbackSection}>
                <Text style={styles.sectionTitle}>改進建議</Text>
                {categories.map((cat) => (
                  <View key={cat.name} style={styles.feedbackItem}>
                    <View style={styles.feedbackHeader}>
                      <Text style={styles.feedbackCategory}>{cat.name}</Text>
                      <Text style={[styles.feedbackScore, { color: getScoreColor(cat.score) }]}>
                        {cat.score.toFixed(1)}/10
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
                  {analysis.text_suggestions && analysis.text_suggestions.length > 0 ? (
                    analysis.text_suggestions.map((suggestion, i) => (
                      <Text key={i} style={styles.overallFeedbackText}>• {suggestion}</Text>
                    ))
                  ) : (
                    <Text style={styles.overallFeedbackText}>
                      繼續優化你的 CV，提升各項評分以增加面試機會。
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
          </PremiumGate>
        );
      })()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  loadingText: {
    marginTop: Spacing.three,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.five,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
});
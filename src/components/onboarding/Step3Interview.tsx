import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

interface Question {
  id: number;
  category: string;
  difficulty: string;
  question: string;
  expected_duration?: string;
}

interface QuestionFeedback {
  question_id: number;
  score: number;
  feedback: string;
  improvement: string;
  tip: string;
}

interface FeedbackResponse {
  session_id: string;
  overall_score: number;
  per_question_feedback: QuestionFeedback[];
  summary: string;
  recommended_next_steps: string[];
}

interface Step3InterviewProps {
  onBack?: () => void;
  onNext?: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 8) return '#22c55e';
  if (score >= 5) return '#eab308';
  return '#ef4444';
}

function getScoreEmoji(score: number): string {
  if (score >= 8) return '🎉';
  if (score >= 5) return '👍';
  return '💪';
}

export default function Step3Interview({ onBack, onNext }: Step3InterviewProps) {
  const { token } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startInterview();
  }, []);

  const startInterview = async () => {
    setIsLoading(true);
    setError(null);

    if (!token) {
      setError('請先登入');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/interview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_type: 'general',
          interview_type: 'hr',
          num_questions: 1,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || '無法開始面試');
      }

      const data = await response.json();
      setSessionId(data.session_id);
      setQuestion(data.questions?.[0] || null);
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!sessionId || !token || !answer.trim()) {
      Alert.alert('錯誤', '請輸入回答');
      return;
    }

    if (!question) {
      Alert.alert('錯誤', '問題不存在');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/interviews/submit/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers: [
            {
              question_id: question.id,
              answer: answer.trim(),
            },
          ],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || '提交失敗');
      }

      const result: FeedbackResponse = await response.json();
      setFeedback(result);
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <ThemedText type="default" style={styles.loadingText}>
            準備HR面試問題...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error && !feedback) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <ThemedText type="default" style={styles.errorTitle}>
            發生錯誤
          </ThemedText>
          <ThemedText type="small" style={styles.errorMessage}>
            {error}
          </ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={startInterview}>
            <ThemedText type="default" style={styles.retryButtonText}>
              重試
            </ThemedText>
          </TouchableOpacity>
        </View>
        <View style={styles.navigation}>
          {onBack && (
            <TouchableOpacity style={[styles.button, styles.backButton]} onPress={onBack}>
              <ThemedText style={styles.buttonText}>返回</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  }

  if (feedback) {
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
            <Animated.View
              entering={FadeIn.duration(500).delay(200)}
              style={styles.rewardBadgeContainer}
            >
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardBadgeIcon}>🏆</Text>
                <ThemedText type="smallBold" style={styles.rewardBadgeText}>
                  Interview Practice Complete!
                </ThemedText>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(600).delay(200)}
              style={styles.scoreSection}
            >
              <Text style={styles.scoreEmoji}>{getScoreEmoji(feedback.overall_score)}</Text>
              <View style={styles.scoreBadge}>
                <Text style={[styles.scoreText, { color: getScoreColor(feedback.overall_score) }]}>
                  {feedback.overall_score.toFixed(1)}
                </Text>
                <Text style={styles.scoreLabel}>/10</Text>
              </View>
            </Animated.View>

            {feedback.per_question_feedback.map((fb, idx) => (
              <Animated.View
                key={fb.question_id}
                entering={FadeIn.duration(500).delay(300 + idx * 100)}
                style={styles.feedbackCard}
              >
                <View style={styles.feedbackHeader}>
                  <ThemedText type="smallBold">問題反饋</ThemedText>
                  <View
                    style={[styles.scoreBadgeSmall, { backgroundColor: getScoreColor(fb.score) }]}
                  >
                    <Text style={styles.scoreBadgeText}>{fb.score}</Text>
                  </View>
                </View>

                <View style={styles.feedbackSection}>
                  <View style={styles.feedbackLabelContainer}>
                    <Text style={styles.feedbackIcon}>✨</Text>
                    <ThemedText type="smallBold" style={styles.feedbackLabel}>
                      優點
                    </ThemedText>
                  </View>
                  <ThemedText type="default" themeColor="textSecondary" style={styles.feedbackText}>
                    {fb.feedback}
                  </ThemedText>
                </View>

                <View style={styles.feedbackSection}>
                  <View style={styles.feedbackLabelContainer}>
                    <Text style={styles.feedbackIcon}>🔧</Text>
                    <ThemedText type="smallBold" style={styles.feedbackLabel}>
                      需要改進
                    </ThemedText>
                  </View>
                  <ThemedText type="default" themeColor="textSecondary" style={styles.feedbackText}>
                    {fb.improvement}
                  </ThemedText>
                </View>

                <View style={styles.feedbackSection}>
                  <View style={styles.feedbackLabelContainer}>
                    <Text style={styles.feedbackIcon}>💡</Text>
                    <ThemedText type="smallBold" style={styles.feedbackLabel}>
                      建議
                    </ThemedText>
                  </View>
                  <ThemedText type="default" themeColor="textSecondary" style={styles.feedbackText}>
                    {fb.tip}
                  </ThemedText>
                </View>
              </Animated.View>
            ))}

            <Animated.View
              entering={FadeIn.duration(500).delay(600)}
              style={styles.summaryCard}
            >
              <ThemedText type="smallBold" style={styles.summaryTitle}>
                整體評價
              </ThemedText>
              <ThemedText type="default" style={styles.summaryText}>
                {feedback.summary}
              </ThemedText>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(500).delay(700)}
              style={styles.nextStepsCard}
            >
              <ThemedText type="smallBold" style={styles.nextStepsTitle}>
                下一步建議
              </ThemedText>
              {feedback.recommended_next_steps.map((step, idx) => (
                <View key={idx} style={styles.nextStepItem}>
                  <Text style={styles.nextStepBullet}>•</Text>
                  <ThemedText type="default" style={styles.nextStepText}>
                    {step}
                  </ThemedText>
                </View>
              ))}
            </Animated.View>

            <View style={styles.navigation}>
              {onBack && (
                <TouchableOpacity style={[styles.button, styles.backButton]} onPress={onBack}>
                  <ThemedText style={styles.buttonText}>返回</ThemedText>
                </TouchableOpacity>
              )}
              {onNext && (
                <TouchableOpacity style={[styles.button, styles.nextButton]} onPress={onNext}>
                  <ThemedText style={styles.buttonText}>下一步</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    );
  }

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
            <ThemedText type="subtitle" style={styles.title}>
              HR 面試問題
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              回答以下問題獲取AI反饋
            </ThemedText>
          </View>

          {question && (
            <Animated.View
              entering={FadeIn.duration(500)}
              style={styles.questionCard}
            >
              <View style={styles.questionBadgeRow}>
                <View style={styles.categoryBadge}>
                  <ThemedText type="small" style={styles.categoryBadgeText}>
                    HR
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {question.difficulty}
                </ThemedText>
              </View>
              <ThemedText type="default" style={styles.questionText}>
                {question.question}
              </ThemedText>
              {question.expected_duration && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.durationText}>
                  預期回答時間：{question.expected_duration}
                </ThemedText>
              )}
            </Animated.View>
          )}

          <View style={styles.answerSection}>
            <ThemedText type="smallBold" style={styles.answerLabel}>
              你的回答
            </ThemedText>
            <TextInput
              style={styles.answerInput}
              value={answer}
              onChangeText={setAnswer}
              placeholder="輸入你的回答..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorInline}>
              <ThemedText type="small" style={styles.errorInlineText}>
                {error}
              </ThemedText>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!answer.trim() || isSubmitting) && styles.submitButtonDisabled,
            ]}
            onPress={submitAnswer}
            disabled={!answer.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="default" style={styles.submitButtonText}>
                提交回答
              </ThemedText>
            )}
          </TouchableOpacity>

          <View style={styles.navigation}>
            {onBack && (
              <TouchableOpacity style={[styles.button, styles.backButton]} onPress={onBack}>
                <ThemedText style={styles.buttonText}>返回</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.four },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  loadingText: { marginTop: Spacing.two },
  header: { marginBottom: Spacing.four },
  title: { fontSize: 24, fontWeight: '700', marginBottom: Spacing.one },
  subtitle: { fontSize: 16 },
  questionCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    marginBottom: Spacing.three,
  },
  categoryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 4,
  },
  categoryBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  questionText: { fontSize: 18, lineHeight: 28, marginBottom: Spacing.two },
  durationText: { color: '#666', fontSize: 14 },
  answerSection: { marginBottom: Spacing.four },
  answerLabel: { marginBottom: Spacing.two },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 16,
    minHeight: 150,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  errorInline: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  errorInlineText: { color: '#dc2626', textAlign: 'center' },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#a0cfff' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  backButton: { backgroundColor: '#34C759' },
  nextButton: { backgroundColor: '#007AFF' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  errorIcon: { fontSize: 48, marginBottom: Spacing.three },
  errorTitle: { fontSize: 20, fontWeight: '600', marginBottom: Spacing.two },
  errorMessage: { color: '#666', textAlign: 'center', marginBottom: Spacing.four },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rewardBadgeContainer: { alignItems: 'center', marginBottom: Spacing.four },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    gap: Spacing.half,
  },
  rewardBadgeIcon: { fontSize: 20 },
  rewardBadgeText: { color: '#92400E', fontWeight: '600' },
  scoreSection: { alignItems: 'center', marginBottom: Spacing.four },
  scoreEmoji: { fontSize: 48, marginBottom: Spacing.two },
  scoreBadge: { flexDirection: 'row', alignItems: 'baseline' },
  scoreText: { fontSize: 64, fontWeight: '700' },
  scoreLabel: { fontSize: 24, color: '#999' },
  feedbackCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  scoreBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  feedbackSection: { marginTop: Spacing.three },
  feedbackLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    marginBottom: Spacing.one,
  },
  feedbackIcon: { fontSize: 16 },
  feedbackLabel: { marginBottom: Spacing.half },
  feedbackText: { lineHeight: 22 },
  summaryCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  summaryTitle: { marginBottom: Spacing.half, color: '#166534' },
  summaryText: { lineHeight: 22, color: '#166534' },
  nextStepsCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  nextStepsTitle: { marginBottom: Spacing.half, color: '#1E40AF' },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.half,
    gap: Spacing.half,
  },
  nextStepBullet: { color: '#1E40AF', fontSize: 16 },
  nextStepText: { flex: 1, lineHeight: 22, color: '#1E40AF' },
});
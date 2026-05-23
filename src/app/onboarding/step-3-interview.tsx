import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

interface Question {
  id: number;
  category: string;
  difficulty: string;
  question: string;
}

interface Feedback {
  question_id: number;
  score: number;
  feedback: string;
  improvement: string;
  tip: string;
}

interface Step3InterviewProps {
  onComplete: () => void;
}

export default function Step3Interview({ onComplete }: Step3InterviewProps) {
  const { token } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    overall_score: number;
    per_question_feedback: Feedback[];
    summary: string;
    recommended_next_steps: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startInterview();
  }, []);

  const startInterview = async () => {
    if (!token) {
      setError('請先登入');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/interviews/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_type: '全職',
          company_size: '中型',
          interview_type: 'hr',
          level: 'mid',
          num_questions: 1,
        }),
      });

      if (!response.ok) {
        throw new Error('無法開始面試');
      }

      const result = await response.json();
      setSessionId(result.session_id);
      setQuestion(result.questions[0]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!sessionId || !token || !answer.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/interviews/submit/${sessionId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: [
            {
              question_id: question?.id,
              answer: answer.trim(),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('提交失敗');
      }

      const result = await response.json();
      setFeedback(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText themeColor="textSecondary" style={styles.loadingText}>
          準備面試問題...
        </ThemedText>
      </View>
    );
  }

  if (feedback) {
    return (
      <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>
          AI 反饋
        </ThemedText>

        <View style={styles.scoreSection}>
          <Text style={styles.scoreEmoji}>
            {feedback.overall_score >= 8 ? '🎉' : feedback.overall_score >= 6 ? '👍' : '💪'}
          </Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{feedback.overall_score}</Text>
            <Text style={styles.scoreLabel}>/10</Text>
          </View>
        </View>

        {feedback.per_question_feedback.map((fb, idx) => (
          <View key={idx} style={styles.feedbackCard}>
            <ThemedText type="smallBold" style={styles.feedbackTitle}>
              強項
            </ThemedText>
            <ThemedText themeColor="textSecondary">{fb.feedback}</ThemedText>

            <ThemedText type="smallBold" style={[styles.feedbackTitle, styles.feedbackSection]}>
              需要改進
            </ThemedText>
            <ThemedText themeColor="textSecondary">{fb.improvement}</ThemedText>

            <ThemedText type="smallBold" style={[styles.feedbackTitle, styles.feedbackSection]}>
              建議
            </ThemedText>
            <ThemedText themeColor="textSecondary">{fb.tip}</ThemedText>
          </View>
        ))}

        <View style={styles.summaryCard}>
          <ThemedText type="smallBold">{feedback.summary}</ThemedText>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        嘗試模擬面試
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        測試你的回答
      </ThemedText>

      {/* Question */}
      {question && (
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionCategory}>HR 問題</Text>
            <Text style={styles.questionDifficulty}>{question.difficulty}</Text>
          </View>
          <ThemedText type="default" style={styles.questionText}>
            {question.question}
          </ThemedText>
        </View>
      )}

      {/* Answer Input */}
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
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, (!answer.trim() || isSubmitting) && styles.submitButtonDisabled]}
        onPress={submitAnswer}
        disabled={!answer.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.submitButtonText}>提交回答</ThemedText>
        )}
      </TouchableOpacity>

      {error && (
        <ThemedText themeColor="textSecondary" style={styles.errorText}>
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  loadingText: {
    marginTop: Spacing.two,
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
  questionCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.four,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  questionCategory: {
    backgroundColor: '#007AFF',
    color: '#fff',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  questionDifficulty: {
    color: '#999',
    fontSize: 12,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 28,
  },
  answerSection: {
    marginBottom: Spacing.four,
  },
  answerLabel: {
    marginBottom: Spacing.two,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  scoreEmoji: {
    fontSize: 48,
    marginBottom: Spacing.two,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#007AFF',
  },
  scoreLabel: {
    fontSize: 24,
    color: '#999',
  },
  feedbackCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  feedbackTitle: {
    marginBottom: Spacing.one,
  },
  feedbackSection: {
    marginTop: Spacing.three,
  },
  summaryCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: Spacing.three,
  },
});
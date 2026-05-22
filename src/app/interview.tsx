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
import * as SecureStore from 'expo-secure-store';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

interface Question {
  id: number;
  category: string;
  difficulty: string;
  question: string;
  expected_duration: string;
}

interface StartResponse {
  session_id: string;
  job_type: string;
  interview_type: string;
  level: string;
  questions: Question[];
}

interface Answer {
  question_id: number;
  answer: string;
}

interface QuestionFeedback {
  question_id: number;
  score: number;
  feedback: string;
  improvement: string;
  tip: string;
}

interface SubmitResponse {
  session_id: string;
  overall_score: number;
  per_question_feedback: QuestionFeedback[];
  summary: string;
  recommended_next_steps: string[];
}

type Step = 'config' | 'interview' | 'results';

const JOB_TYPES = ['engineering', 'sales', 'marketing', 'finance', 'operations', 'general'];
const COMPANY_SIZES = ['startup', 'smb', 'enterprise'];
const INTERVIEW_TYPES = ['hr', 'technical', 'final', 'mixed'];
const LEVELS = ['junior', 'mid', 'senior'];

const JOB_TYPE_LABELS: Record<string, string> = {
  engineering: '工程',
  sales: '銷售',
  marketing: '市場',
  finance: '財務',
  operations: '運營',
  general: '一般',
};

const CATEGORY_LABELS: Record<string, string> = {
  hr: 'HR',
  technical: '技術',
  situational: '情境',
  final: '最終',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '簡單',
  medium: '中等',
  hard: '困難',
};

export default function InterviewScreen() {
  const [step, setStep] = useState<Step>('config');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobType, setJobType] = useState('engineering');
  const [companySize, setCompanySize] = useState('startup');
  const [interviewType, setInterviewType] = useState('mixed');
  const [level, setLevel] = useState('mid');

  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');

  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch {
      return null;
    }
  };

  const startInterview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('錯誤', '請先登入');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/interviews/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_type: jobType,
          company_size: companySize,
          interview_type: interviewType,
          level,
          num_questions: 5,
        }),
      });

      const data: StartResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '無法開始面試');
      }

      setSessionId(data.session_id);
      setQuestions(data.questions);
      setAnswers([]);
      setCurrentIndex(0);
      setCurrentAnswer('');
      setStep('interview');
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) {
      Alert.alert('錯誤', '請輸入回答');
      return;
    }

    const newAnswers = [...answers, { question_id: questions[currentIndex].id, answer: currentAnswer.trim() }];
    setAnswers(newAnswers);
    setCurrentAnswer('');

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await submitInterview(newAnswers);
    }
  };

  const submitInterview = async (finalAnswers: Answer[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('錯誤', '請先登入');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/interviews/submit/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: finalAnswers }),
      });

      const data: SubmitResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '無法提交答案');
      }

      setSubmitResult(data);
      setStep('results');
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToConfig = () => {
    setStep('config');
    setSessionId('');
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setCurrentAnswer('');
    setSubmitResult(null);
    setError(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#22c55e';
    if (score >= 5) return '#eab308';
    return '#ef4444';
  };

  const renderPicker = (
    label: string,
    options: string[],
    labels: Record<string, string>,
    selected: string,
    onSelect: (v: string) => void
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText type="smallBold" style={styles.label}>{label}</ThemedText>
      <View style={styles.pickerRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.pickerButton, selected === opt && styles.pickerButtonSelected]}
            onPress={() => onSelect(opt)}
          >
            <ThemedText
              type="small"
              style={[styles.pickerText, selected === opt && styles.pickerTextSelected]}
            >
              {labels[opt] || opt}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderConfig = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>模擬面試</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          選擇面試配置開始練習
        </ThemedText>
      </View>

      <View style={styles.form}>
        {renderPicker('崗位類型', JOB_TYPES, JOB_TYPE_LABELS, jobType, setJobType)}
        {renderPicker('公司規模', COMPANY_SIZES, {}, companySize, setCompanySize)}
        {renderPicker('面試類型', INTERVIEW_TYPES, {}, interviewType, setInterviewType)}
        {renderPicker('級別', LEVELS, {}, level, setLevel)}

        {error && (
          <View style={styles.errorContainer}>
            <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={startInterview}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="default" style={styles.buttonText}>開始面試</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderInterview = () => {
    const question = questions[currentIndex];
    const isLast = currentIndex === questions.length - 1;

    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.progressContainer}>
            <ThemedText type="small" style={styles.progressText}>
              問題 {currentIndex + 1} / {questions.length}
            </ThemedText>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentIndex + 1) / questions.length) * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.questionCard}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, styles.categoryBadge]}>
                <ThemedText type="small" style={styles.badgeText}>
                  {CATEGORY_LABELS[question.category] || question.category}
                </ThemedText>
              </View>
              <View style={[styles.badge, styles.difficultyBadge]}>
                <ThemedText type="small" style={styles.badgeText}>
                  {DIFFICULTY_LABELS[question.difficulty] || question.difficulty}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="default" style={styles.questionText}>
              {question.question}
            </ThemedText>

            <ThemedText type="small" style={styles.durationText}>
              預期回答時間：{question.expected_duration}
            </ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="smallBold" style={styles.label}>你的回答</ThemedText>
            <TextInput
              style={styles.textInput}
              placeholder="輸入你的回答..."
              placeholderTextColor="#999"
              value={currentAnswer}
              onChangeText={setCurrentAnswer}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={submitAnswer}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="default" style={styles.buttonText}>
                {isLast ? '提交答案' : '下一題'}
              </ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderResults = () => {
    if (!submitResult) return null;

    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.scoreCard}>
          <ThemedText type="small" style={styles.scoreLabel}>總分</ThemedText>
          <ThemedText
            type="largeTitle"
            style={[styles.scoreValue, { color: getScoreColor(submitResult.overall_score) }]}
          >
            {submitResult.overall_score.toFixed(1)}
          </ThemedText>
        </View>

        <ThemedText type="title" style={styles.sectionTitle}>各題反饋</ThemedText>

        {submitResult.per_question_feedback.map((fb, idx) => (
          <View key={fb.question_id} style={styles.feedbackCard}>
            <View style={styles.feedbackHeader}>
              <ThemedText type="smallBold">問題 {idx + 1}</ThemedText>
              <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(fb.score) }]}>
                <ThemedText type="small" style={styles.scoreBadgeText}>{fb.score}</ThemedText>
              </View>
            </View>
            <ThemedText type="small" style={styles.feedbackLabel}>優點</ThemedText>
            <ThemedText type="default" style={styles.feedbackText}>{fb.feedback}</ThemedText>
            <ThemedText type="small" style={styles.feedbackLabel}>改進</ThemedText>
            <ThemedText type="default" style={styles.feedbackText}>{fb.improvement}</ThemedText>
            <ThemedText type="small" style={styles.feedbackLabel}>建議</ThemedText>
            <ThemedText type="default" style={styles.feedbackText}>{fb.tip}</ThemedText>
          </View>
        ))}

        <View style={styles.summaryCard}>
          <ThemedText type="smallBold" style={styles.summaryTitle}>整體評價</ThemedText>
          <ThemedText type="default" style={styles.summaryText}>{submitResult.summary}</ThemedText>
        </View>

        <View style={styles.nextStepsCard}>
          <ThemedText type="smallBold" style={styles.nextStepsTitle}>下一步建議</ThemedText>
          {submitResult.recommended_next_steps.map((step, idx) => (
            <View key={idx} style={styles.nextStepItem}>
              <ThemedText type="default">• {step}</ThemedText>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={resetToConfig}>
          <ThemedText type="default" style={styles.secondaryButtonText}>再試一次</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {step === 'config' && renderConfig()}
      {step === 'interview' && renderInterview()}
      {step === 'results' && renderResults()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: Spacing.four },
  header: { marginBottom: Spacing.five },
  title: { marginBottom: Spacing.two },
  subtitle: { color: '#666' },
  form: { gap: Spacing.four },
  inputGroup: { gap: Spacing.one },
  label: { marginBottom: Spacing.half },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half },
  pickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  pickerButtonSelected: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  pickerText: { fontSize: 14 },
  pickerTextSelected: { color: '#fff' },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: { backgroundColor: '#a0cfff' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  secondaryButtonText: { color: '#007AFF', fontSize: 18, fontWeight: '600' },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  errorText: { color: '#dc2626', textAlign: 'center' },
  progressContainer: { marginBottom: Spacing.four },
  progressText: { marginBottom: Spacing.half, color: '#666' },
  progressBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#007AFF', borderRadius: 2 },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeRow: { flexDirection: 'row', gap: Spacing.half, marginBottom: Spacing.three },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  categoryBadge: { backgroundColor: '#dbeafe' },
  difficultyBadge: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 12 },
  questionText: { marginBottom: Spacing.three, lineHeight: 24 },
  durationText: { color: '#666' },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  scoreCard: { alignItems: 'center', padding: Spacing.four, marginBottom: Spacing.four },
  scoreLabel: { color: '#666', marginBottom: Spacing.half },
  scoreValue: { fontSize: 64, fontWeight: 'bold' },
  sectionTitle: { marginBottom: Spacing.three },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.three },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreBadgeText: { color: '#fff', fontWeight: 'bold' },
  feedbackLabel: { color: '#666', marginBottom: Spacing.half },
  feedbackText: { marginBottom: Spacing.two, lineHeight: 20 },
  summaryCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  summaryTitle: { marginBottom: Spacing.half },
  summaryText: { lineHeight: 22 },
  nextStepsCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  nextStepsTitle: { marginBottom: Spacing.half },
  nextStepItem: { marginBottom: Spacing.half },
});

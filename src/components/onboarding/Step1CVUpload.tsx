import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/hooks/useAuth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CVScoreBadge } from '@/components/cv-score-badge';
import { CVCategoryBars } from '@/components/cv-category-bars';
import { ConfettiBurst } from '@/components/confetti-burst';
import { Spacing } from '@/constants/theme';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

export interface CVUploadResult {
  cv_id: number;
  score: number;
  breakdown: {
    role_relevance: number;
    experience_years: number;
    education_quality: number;
    skills_clarity: number;
    quantified_achievements: number;
    overall_professionalism: number;
  };
  text_suggestions?: string[];
}

interface Step1CVUploadProps {
  onNext: (result: CVUploadResult) => void;
}

type UploadStatus = 'idle' | 'picking' | 'uploading' | 'scoring' | 'complete' | 'error';

interface SelectedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export function Step1CVUpload({ onNext }: Step1CVUploadProps) {
  const { token } = useAuth();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [scoreData, setScoreData] = useState<CVUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickFile = useCallback(async () => {
    setStatus('picking');
    setError(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setStatus('idle');
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        setError('No file selected');
        setStatus('error');
        return;
      }

      setSelectedFile({
        uri: asset.uri,
        name: asset.name || 'cv',
        mimeType: asset.mimeType || 'application/pdf',
      });
      setStatus('idle');
    } catch {
      setError('選擇文件失敗');
      setStatus('error');
    }
  }, []);

  const uploadAndScore = useCallback(async () => {
    if (!selectedFile || !token) return;

    setStatus('uploading');
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || 'application/pdf',
      } as unknown as string);

      const uploadResponse = await fetch(`${API_BASE_URL}/cvs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('上傳失敗');
      }

      const uploadResult = await uploadResponse.json();
      const cvId = uploadResult.file_id;

      setStatus('scoring');

      const scoreResponse = await fetch(`${API_BASE_URL}/cvs/score?cv_id=${cvId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!scoreResponse.ok) {
        throw new Error('評分失敗');
      }

      const scoreResult = await scoreResponse.json();

      const result: CVUploadResult = {
        cv_id: cvId,
        score: scoreResult.score,
        breakdown: {
          role_relevance: scoreResult.role_relevance,
          experience_years: scoreResult.experience_years,
          education_quality: scoreResult.education_quality,
          skills_clarity: scoreResult.skills_clarity,
          quantified_achievements: scoreResult.quantified_achievements,
          overall_professionalism: scoreResult.overall_professionalism,
        },
        text_suggestions: scoreResult.text_suggestions || [],
      };

      setScoreData(result);
      setStatus('complete');

      if (result.score >= 7) {
        setShowConfetti(true);
      }
    } catch (e: unknown) {
      setError((e as Error).message || '上傳失敗');
      setStatus('error');
    }
  }, [selectedFile, token]);

  const handleNext = useCallback(() => {
    if (scoreData) {
      onNext(scoreData);
    }
  }, [scoreData, onNext]);

  const isLoading = status === 'uploading' || status === 'scoring';

  return (
    <ThemedView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
        <ThemedText type="subtitle" style={styles.title}>
          上傳你的 CV
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          AI 即時評估你的競爭力
        </ThemedText>

        {!scoreData && (
          <>
            <AnimatedTouchableOpacity
              entering={FadeIn.delay(200)}
              style={styles.filePicker}
              onPress={pickFile}
              disabled={isLoading}
            >
              <ThemedText style={styles.filePickerIcon}>📄</ThemedText>
              <ThemedText themeColor="textSecondary">
                {selectedFile ? selectedFile.name : '點擊選擇 PDF 或 Word 文件'}
              </ThemedText>
            </AnimatedTouchableOpacity>

            {selectedFile && status === 'idle' && (
              <AnimatedTouchableOpacity
                entering={FadeIn.delay(400)}
                style={styles.analyzeButton}
                onPress={uploadAndScore}
              >
                <ThemedText style={styles.analyzeButtonText}>開始分析</ThemedText>
              </AnimatedTouchableOpacity>
            )}

            {isLoading && (
              <Animated.View entering={FadeIn.delay(300)} style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <ThemedText themeColor="textSecondary" style={styles.loadingText}>
                  {status === 'uploading' ? '上傳中...' : '分析中...'}
                </ThemedText>
                {status === 'uploading' && (
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${uploadProgress}%` },
                      ]}
                    />
                  </View>
                )}
              </Animated.View>
            )}
          </>
        )}

        {error && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </Animated.View>
        )}

        {scoreData && (
          <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.resultContainer}>
            <CVScoreBadge score={scoreData.score} size={120} animate={true} />

            <View style={styles.breakdownContainer}>
              <CVCategoryBars categories={scoreData.breakdown} animate={true} />
            </View>

            <View style={styles.ctaContainer}>
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <ThemedText style={styles.nextButtonText}>Next</ThemedText>
              </TouchableOpacity>

              <View style={styles.badgeContainer}>
                <ThemedText style={styles.badgeIcon}>🎁</ThemedText>
                <ThemedText type="small" style={styles.badgeText}>Free CV Analysis!</ThemedText>
              </View>
            </View>

            <ThemedText themeColor="textSecondary" style={styles.nextHint}>
              點擊 Next 繼續編輯你的求職偏好設定
            </ThemedText>
          </Animated.View>
        )}

        <ConfettiBurst trigger={showConfetti} />
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.one,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.five,
    textAlign: 'center',
  },
  filePicker: {
    width: '100%',
    padding: Spacing.four,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  filePickerIcon: {
    fontSize: 48,
  },
  analyzeButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  loadingText: {
    fontSize: 16,
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  errorContainer: {
    marginTop: Spacing.three,
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    width: '100%',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.four,
    width: '100%',
  },
  breakdownContainer: {
    width: '100%',
    marginTop: Spacing.three,
  },
  ctaContainer: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeText: {
    color: '#FFD700',
    fontWeight: '600',
  },
  nextHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
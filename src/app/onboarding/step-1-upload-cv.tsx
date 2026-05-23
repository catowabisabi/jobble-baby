import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { CVScoreBadge } from '@/components/cv-score-badge';
import { CVCategoryBars } from '@/components/cv-category-bars';
import { ConfettiBurst } from '@/components/confetti-burst';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

interface SelectedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

interface Step1UploadCVProps {
  onComplete: (cvId: number, score: number) => void;
}

interface CVScoreData {
  score: number;
  breakdown: {
    role_relevance: number;
    experience_years: number;
    education_quality: number;
    skills_clarity: number;
    quantified_achievements: number;
    overall_professionalism: number;
  };
}

export default function Step1UploadCV({ onComplete }: Step1UploadCVProps) {
  const { token } = useAuth();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [scoreData, setScoreData] = useState<CVScoreData | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (asset) {
        setSelectedFile(asset);
        setError(null);
      }
    } catch {
      setError('選擇文件失敗');
    }
  };

  const uploadCV = async () => {
    if (!selectedFile || !token) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name || 'cv',
        type: selectedFile.mimeType || 'application/pdf',
      } as unknown as string);

      const response = await fetch(`${API_BASE_URL}/cvs/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上傳失敗');
      }

      const uploadResult = await response.json();
      const cvId = uploadResult.file_id;

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
      const score = scoreResult.score;

      setScoreData({
        score,
        breakdown: {
          role_relevance: scoreResult.role_relevance,
          experience_years: scoreResult.experience_years,
          education_quality: scoreResult.education_quality,
          skills_clarity: scoreResult.skills_clarity,
          quantified_achievements: scoreResult.quantified_achievements,
          overall_professionalism: scoreResult.overall_professionalism,
        },
      });

      if (score >= 7) {
        setShowConfetti(true);
      }

      setTimeout(() => {
        onComplete(cvId, score);
      }, 2000);

    } catch (e: unknown) {
      setError((e as Error).message || '上傳失敗');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        上傳你的 CV
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        AI 即時評估你的競爭力
      </ThemedText>

      {!scoreData && (
        <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
          <Text style={styles.filePickerIcon}>📄</Text>
          <ThemedText>
            {selectedFile ? selectedFile.name || '已選擇文件' : '點擊選擇 PDF 或 Word 文件'}
          </ThemedText>
        </TouchableOpacity>
      )}

      {selectedFile && !scoreData && (
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
          onPress={uploadCV}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.uploadButtonText}>開始分析</ThemedText>
          )}
        </TouchableOpacity>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {scoreData && (
        <Animated.View entering={FadeIn.delay(300).duration(500)} style={styles.scoreContainer}>
          <CVScoreBadge score={scoreData.score} size={140} animate={true} />
          <View style={styles.breakdownContainer}>
            <CVCategoryBars categories={scoreData.breakdown} animate={true} />
          </View>
        </Animated.View>
      )}

      <ConfettiBurst trigger={showConfetti} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.four,
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
  filePicker: {
    width: '100%',
    padding: Spacing.four,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    gap: Spacing.two,
  },
  filePickerIcon: {
    fontSize: 48,
  },
  uploadButton: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: Spacing.three,
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
  },
  scoreContainer: {
    alignItems: 'center',
    gap: Spacing.four,
  },
  breakdownContainer: {
    width: '100%',
    marginTop: Spacing.three,
  },
});
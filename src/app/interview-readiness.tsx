import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

interface Session {
  session_id: string;
  date: string;
  job_type: string;
  interview_type: string;
  level: string;
  score: number | null;
  feedback_categories?: Record<string, number>;
}

interface ReadinessData {
  total_sessions: number;
  average_score: number | null;
  readiness_level: string;
  readiness_badge: string;
  recent_trend: number[];
  focus_areas: Array<{
    category: string;
    average_score: number;
    suggestion: string;
  }>;
  sessions: Session[];
}

const CATEGORY_LABELS: Record<string, string> = {
  hr: 'HR 環節',
  technical: '技術問題',
  situational: '情境題',
  final: '最終面試',
  general: '綜合能力',
};

const READINESS_COLORS: Record<string, string> = {
  building: '#eab308',
  ready: '#22c55e',
  expert: '#8b5cf6',
  no_data: '#6b7280',
};

export default function InterviewReadinessScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readinessData, setReadinessData] = useState<ReadinessData | null>(null);

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch {
      return null;
    }
  };

  const fetchReadinessData = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) {
        setError('請先登入');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/interviews/readiness`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('無法獲取數據');
      }

      const data: ReadinessData = await response.json();
      setReadinessData(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReadinessData();
  }, [fetchReadinessData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReadinessData();
    setRefreshing(false);
  }, [fetchReadinessData]);

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#22c55e';
    if (score >= 5) return '#eab308';
    return '#ef4444';
  };

  const renderBarChart = (scores: number[]) => {
    if (scores.length === 0) return null;
    const maxScore = 10;
    const chartHeight = 120;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBars}>
          {scores.map((score, index) => (
            <View key={index} style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    height: (score / maxScore) * chartHeight,
                    backgroundColor: getScoreColor(score),
                  },
                ]}
              />
              <ThemedText type="small" style={styles.barLabel}>
                {score.toFixed(1)}
              </ThemedText>
            </View>
          ))}
        </View>
        <View style={styles.chartXAxis}>
          <ThemedText type="small" themeColor="textSecondary">
            最近 {scores.length} 次練習
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderReadinessBadge = () => {
    if (!readinessData) return null;
    const color = READINESS_COLORS[readinessData.readiness_level] || READINESS_COLORS.no_data;

    return (
      <View style={[styles.badgeContainer, { backgroundColor: color + '20' }]}>
        <ThemedText type="title" style={[styles.badgeText, { color }]}>
          {readinessData.readiness_badge}
        </ThemedText>
        {readinessData.average_score !== null && (
          <ThemedText type="default" style={styles.avgScoreText}>
            平均分 {readinessData.average_score.toFixed(1)}
          </ThemedText>
        )}
      </View>
    );
  };

  const renderRecentSessions = () => {
    if (!readinessData?.sessions.length) {
      return (
        <View style={styles.emptyState}>
          <ThemedText type="subtitle" themeColor="textSecondary">
            還沒有練習記錄
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            開始第一次面試練習吧
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.sessionsList}>
        {readinessData.sessions.slice(0, 5).map((session, index) => (
          <View
            key={session.session_id}
            style={[styles.sessionCard, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={styles.sessionHeader}>
              <ThemedText type="smallBold">
                {session.date || '未知日期'}
              </ThemedText>
              {session.score !== null && (
                <View
                  style={[
                    styles.scoreBadge,
                    { backgroundColor: getScoreColor(session.score) },
                  ]}
                >
                  <ThemedText type="small" style={styles.scoreBadgeText}>
                    {session.score.toFixed(1)}
                  </ThemedText>
                </View>
              )}
            </View>
            <View style={styles.sessionDetails}>
              <ThemedText type="small" themeColor="textSecondary">
                {session.job_type} • {session.interview_type} • {session.level}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderFocusAreas = () => {
    if (!readinessData?.focus_areas.length) {
      return (
        <View style={styles.emptyState}>
          <ThemedText type="small" themeColor="textSecondary">
            完成更多練習後可以看到改進建議
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.focusAreasList}>
        {readinessData.focus_areas.map((area, index) => (
          <View
            key={index}
            style={[styles.focusCard, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={styles.focusHeader}>
              <ThemedText type="smallBold">
                {CATEGORY_LABELS[area.category] || area.category}
              </ThemedText>
              <ThemedText
                type="small"
                style={{ color: getScoreColor(area.average_score) }}
              >
                {area.average_score.toFixed(1)}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {area.suggestion}
            </ThemedText>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.text} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.loadingText}>
          載入中...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText type="largeTitle" style={styles.title}>
            面試準備度
          </ThemedText>
          <ThemedText type="subtitle" themeColor="textSecondary">
            追蹤你的練習進度
          </ThemedText>
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: '#fef2f2' }]}>
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          </View>
        )}

        {renderReadinessBadge()}

        {readinessData && readinessData.total_sessions > 0 && (
          <>
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                分數趨勢
              </ThemedText>
              {renderBarChart(readinessData.recent_trend)}
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                需要加強的環節
              </ThemedText>
              {renderFocusAreas()}
            </View>

            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                最近練習
              </ThemedText>
              {renderRecentSessions()}
            </View>
          </>
        )}

        {readinessData && readinessData.total_sessions === 0 && (
          <View style={styles.emptyDashboard}>
            <ThemedText type="title" style={styles.emptyTitle}>
              📊 開始追蹤你的面試進步
            </ThemedText>
            <ThemedText
              type="default"
              themeColor="textSecondary"
              style={styles.emptyDescription}
            >
              完成第一次模擬面試後，這裡就會顯示你的練習記錄和分數趨勢
            </ThemedText>
          </View>
        )}

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: theme.text }]}
          onPress={() => router.push('/interview')}
        >
          <ThemedText
            type="default"
            style={[styles.ctaButtonText, { color: theme.background }]}
          >
            開始練習
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
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
    gap: Spacing.two,
  },
  loadingText: {
    marginTop: Spacing.two,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  header: {
    marginBottom: Spacing.two,
  },
  title: {
    marginBottom: Spacing.half,
  },
  errorBanner: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  errorText: {
    color: '#dc2626',
  },
  badgeContainer: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  badgeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.half,
  },
  avgScoreText: {
    fontSize: 16,
  },
  section: {
    marginTop: Spacing.three,
  },
  sectionTitle: {
    marginBottom: Spacing.two,
  },
  chartContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: Spacing.two,
  },
  barWrapper: {
    alignItems: 'center',
    gap: Spacing.half,
  },
  bar: {
    width: 32,
    borderRadius: 4,
    minHeight: 20,
  },
  barLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  chartXAxis: {
    alignItems: 'center',
    paddingTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.half,
  },
  sessionsList: {
    gap: Spacing.two,
  },
  sessionCard: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.half,
  },
  scoreBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 12,
  },
  scoreBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sessionDetails: {
    flexDirection: 'row',
  },
  focusAreasList: {
    gap: Spacing.two,
  },
  focusCard: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.half,
  },
  emptyDashboard: {
    alignItems: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
  },
  ctaButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
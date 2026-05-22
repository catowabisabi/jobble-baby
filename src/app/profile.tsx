/**
 * 個人資料畫面
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useCVUpload } from '@/hooks/useCVUpload';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const { progress, status, result, error, cvs, isLoadingCVs, pickFile, fetchCVList } = useCVUpload(user?.id);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchAlertPreferences = async () => {
      try {
        const response = await fetch('/api/v1/users/alert-preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.notifications_enabled) {
            const matchResponse = await fetch('/api/v1/jobs/matches');
            if (matchResponse.ok) {
              const matchData = await matchResponse.json();
              setMatchCount(matchData.count ?? matchData.total ?? 0);
            }
          }
        }
      } catch (err) {
        // Silently fail - job alerts are optional
      }
    };

    if (isAuthenticated) {
      fetchAlertPreferences();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (status === 'success') {
      fetchCVList();
    }
  }, [status, fetchCVList]);

  const handleLogout = () => {
    Alert.alert(
      '登出',
      '確定要登出嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.notAuth}>
          <Text style={styles.title}>請先登入</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/login')}
            accessibilityLabel="Go to login button"
          >
            <Text style={styles.buttonText}>前往登入</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const getSubscriptionBadge = (tier: string) => {
    switch (tier) {
      case 'premium':
        return { text: '👑 Premium', color: '#FFD700' };
      case 'trial':
        return { text: '試用中', color: '#34C759' };
      default:
        return { text: 'Free', color: '#8E8E93' };
    }
  };

  const getScoreBadgeStyle = (score: number) => {
    if (score >= 8) return { backgroundColor: '#34C759' };
    if (score >= 6) return { backgroundColor: '#007AFF' };
    if (score >= 4) return { backgroundColor: '#FF9500' };
    return { backgroundColor: '#FF3B30' };
  };

  const badge = getSubscriptionBadge(user?.subscription_tier || 'free');

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || user?.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Text style={styles.badgeText}>{badge.text}</Text>
          </View>
        </View>

        <ThemedText type="title" style={styles.name}>
          {user?.name || '用戶'}
        </ThemedText>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>訂閱方案</Text>
            <Text style={styles.infoValue}>{badge.text}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>用戶 ID</Text>
            <Text style={styles.infoValue}>#{user?.id}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.jobAlertsButton}
          onPress={() => router.push('/job-alerts')}
          accessibilityLabel="Job Alerts button"
        >
          <Text style={styles.jobAlertsButtonText}>工作提示</Text>
        </TouchableOpacity>

        {matchCount !== null && (
          <Text style={styles.matchCountText}>{matchCount} 個工作適合你</Text>
        )}

        {user?.subscription_tier !== 'premium' && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/subscription')}
            accessibilityLabel="Upgrade to Premium button"
          >
            <Text style={styles.upgradeButtonText}>升級到 Premium</Text>
          </TouchableOpacity>
        )}

        <View style={styles.cvSection}>
          <TouchableOpacity
            style={[styles.uploadButton, status === 'uploading' && styles.uploadButtonDisabled]}
            onPress={pickFile}
            disabled={status === 'uploading'}
            accessibilityLabel="Upload CV button"
          >
            {status === 'uploading' ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>上傳 CV</Text>
            )}
          </TouchableOpacity>

          {status === 'uploading' && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress}%</Text>
            </View>
          )}

          {status === 'success' && result && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>上傳成功</Text>
              <Text style={styles.fileIdText}>File ID: {result.file_id}</Text>
            </View>
          )}

          {status === 'error' && error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </View>

        <View style={styles.cvListSection}>
          <Text style={styles.cvListTitle}>已上傳的 CV</Text>
          {isLoadingCVs ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : cvs.length === 0 ? (
            <Text style={styles.cvListEmpty}>尚無上傳的 CV</Text>
          ) : (
            <FlatList
              data={cvs}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              style={styles.cvList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.cvListItem}
                  onPress={() =>
                    router.push({
                      pathname: '/cv-detail',
                      params: { id: String(item.id), fileName: item.file_name },
                    })
                  }
                  activeOpacity={0.7}
                  accessibilityLabel={`View CV analysis for ${item.file_name}`}
                >
                  <View style={styles.cvListItemInfo}>
                    <Text style={styles.cvListFileName} numberOfLines={1}>
                      {item.file_name}
                    </Text>
                    <Text style={styles.cvListDate}>
                      {new Date(item.created_at).toLocaleDateString('zh-HK')}
                    </Text>
                  </View>
                  {item.score != null && (
                    <View style={[styles.cvScoreBadge, getScoreBadgeStyle(item.score)]}>
                      <Text style={styles.cvScoreText}>{item.score}/10</Text>
                    </View>
                  )}
                  <Text style={styles.cvListArrow}>›</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Logout button"
        >
          <Text style={styles.logoutText}>登出</Text>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notAuth: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.four,
    paddingTop: Spacing.five * 2,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  avatarText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  name: {
    marginBottom: Spacing.one,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: Spacing.five,
  },
  infoSection: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: Spacing.four,
    marginBottom: Spacing.five,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cvSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    minWidth: 150,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.three,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    marginTop: Spacing.one,
    fontSize: 14,
    color: '#666',
  },
  successContainer: {
    marginTop: Spacing.three,
    alignItems: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '600',
  },
  fileIdText: {
    fontSize: 12,
    color: '#666',
    marginTop: Spacing.one,
  },
  errorText: {
    marginTop: Spacing.three,
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  cvListSection: {
    width: '100%',
    marginBottom: Spacing.five,
  },
  cvListTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.two,
  },
  cvListEmpty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  cvList: {
    maxHeight: 200,
  },
  cvListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  cvListItemInfo: {
    flex: 1,
    marginRight: Spacing.two,
  },
  cvListFileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  cvListDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  cvScoreBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cvScoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cvListArrow: {
    fontSize: 20,
    color: '#ccc',
    marginLeft: Spacing.two,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five * 2,
    marginBottom: Spacing.five,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  jobAlertsButton: {
    backgroundColor: '#5856D6',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five * 2,
    marginBottom: Spacing.two,
    alignItems: 'center',
  },
  jobAlertsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  matchCountText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    marginBottom: Spacing.five,
  },
});
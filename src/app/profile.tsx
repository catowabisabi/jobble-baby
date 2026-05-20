/**
 * 個人資料畫面
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
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
  const { progress, status, result, error, pickFile } = useCVUpload(user?.id);

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
        return { text: 'Premium', color: '#FFD700' };
      case 'trial':
        return { text: '試用中', color: '#34C759' };
      default:
        return { text: 'Free', color: '#8E8E93' };
    }
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

        <View style={styles.cvSection}>
          <TouchableOpacity
            style={[styles.uploadButton, status === 'uploading' && styles.uploadButtonDisabled]}
            onPress={pickFile}
            disabled={status === 'uploading'}
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

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
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
});
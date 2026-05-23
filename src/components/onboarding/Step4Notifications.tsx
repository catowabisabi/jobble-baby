import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

interface Step4NotificationsProps {
  onBack?: () => void;
}

export function Step4Notifications({ onBack }: Step4NotificationsProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { completeOnboarding } = useOnboarding();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const radarScale1 = useSharedValue(0);
  const radarScale2 = useSharedValue(0);
  const radarScale3 = useSharedValue(0);
  const radarOpacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (isCompleted) {
      startRadarAnimation();
    } else {
      stopRadarAnimation();
    }
  }, [isCompleted]);

  const startRadarAnimation = () => {
    radarOpacity.value = withTiming(1, { duration: 200 });

    radarScale1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
        withDelay(400, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    radarScale2.value = withRepeat(
      withSequence(
        withDelay(267, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) })),
        withDelay(133, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    radarScale3.value = withRepeat(
      withSequence(
        withDelay(533, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) })),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );

    checkScale.value = withDelay(
      600,
      withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 150 })
      )
    );
  };

  const stopRadarAnimation = () => {
    cancelAnimation(radarScale1);
    cancelAnimation(radarScale2);
    cancelAnimation(radarScale3);
    radarOpacity.value = withTiming(0, { duration: 200 });
    checkScale.value = 0;
  };

  const radarAnimatedStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: radarScale1.value }],
    opacity: radarScale1.value > 0 ? 1 - radarScale1.value * 0.5 : 0,
  }));

  const radarAnimatedStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: radarScale2.value }],
    opacity: radarScale2.value > 0 ? 1 - radarScale2.value * 0.5 : 0,
  }));

  const radarAnimatedStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: radarScale3.value }],
    opacity: radarScale3.value > 0 ? 1 - radarScale3.value * 0.5 : 0,
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value > 0 ? 1 : 0,
  }));

  const handleNotificationToggle = async (value: boolean) => {
    setNotificationsEnabled(value);

    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/users/alert-preferences`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifications_enabled: value,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to update preferences');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save notification preference');
      setNotificationsEnabled(!value);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/onboarding/complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notifications_enabled: notificationsEnabled,
          }),
        });
      }

      await completeOnboarding();

      setIsCompleted(true);

      setTimeout(() => {
        router.replace('/');
      }, 2000);
    } catch (e: any) {
      setError(e.message || 'Failed to complete setup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {!isCompleted ? (
          <>
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                接收通知
              </ThemedText>
              <ThemedText type="subtitle" style={styles.subtitle}>
                當有新職位符合您的偏好時通知您
              </ThemedText>
            </View>

            <View style={styles.toggleContainer}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelContainer}>
                  <ThemedText type="default" style={styles.toggleLabel}>
                    推送通知
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.toggleDescription}>
                    接收最新職位推薦和更新
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={() => !isLoading && handleNotificationToggle(!notificationsEnabled)}
                  disabled={isLoading}
                  style={styles.switchContainer}
                  accessibilityLabel="通知開關"
                  accessibilityRole="switch"
                  accessibilityState={{ checked: notificationsEnabled }}
                >
                  <View
                    style={[
                      styles.switch,
                      notificationsEnabled ? styles.switchOn : styles.switchOff,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        notificationsEnabled ? styles.switchThumbOn : styles.switchThumbOff,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {isLoading && (
                <ActivityIndicator size="small" style={styles.loader} />
              )}
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              </View>
            )}

            <View style={styles.noteContainer}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.noteText}>
                提示：您可以在設定中隨時調整通知偏好
              </ThemedText>
            </View>
          </>
        ) : (
          <View style={styles.completionContainer}>
            <View style={styles.radarContainer}>
              <Animated.View style={[styles.radarCircle, styles.radarCircle1, radarAnimatedStyle1]} />
              <Animated.View style={[styles.radarCircle, styles.radarCircle2, radarAnimatedStyle2]} />
              <Animated.View style={[styles.radarCircle, styles.radarCircle3, radarAnimatedStyle3]} />

              <View style={styles.radarCenter} />

              <Animated.View style={[styles.checkContainer, checkAnimatedStyle]}>
                <View style={styles.checkCircle}>
                  <ThemedText style={styles.checkMark}>✓</ThemedText>
                </View>
              </Animated.View>
            </View>

            <ThemedText type="title" style={styles.completionTitle}>
              您已準備就緒！
            </ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.completionSubtitle}>
              讓我們開始求職之旅吧
            </ThemedText>
          </View>
        )}
      </View>

      {!isCompleted && (
        <View style={styles.buttonContainer}>
          {onBack && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              disabled={isLoading}
              accessibilityLabel="返回上一步"
            >
              <ThemedText type="default" style={styles.backButtonText}>
                返回
              </ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.completeButton, isLoading && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={isLoading}
            accessibilityLabel="完成設定"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="default" style={styles.completeButtonText}>
                完成設定
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.four,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  title: {
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
  },
  toggleContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: Spacing.four,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabelContainer: {
    flex: 1,
    marginRight: Spacing.three,
  },
  toggleLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.half,
  },
  toggleDescription: {
    fontSize: 14,
  },
  switchContainer: {
    padding: Spacing.one,
  },
  switch: {
    width: 51,
    height: 31,
    borderRadius: 16,
    justifyContent: 'center',
    padding: 2,
  },
  switchOff: {
    backgroundColor: '#e0e0e0',
  },
  switchOn: {
    backgroundColor: '#81c784',
  },
  switchThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
  },
  switchThumbOff: {
    backgroundColor: '#f4f4f4',
  },
  switchThumbOn: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-end',
  },
  loader: {
    marginTop: Spacing.two,
    alignSelf: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  noteContainer: {
    marginTop: Spacing.four,
    padding: Spacing.three,
    backgroundColor: '#f0f0f3',
    borderRadius: 12,
  },
  noteText: {
    textAlign: 'center',
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: Spacing.four,
    gap: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  completeButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a0cfff',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  completionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  radarCircle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
  },
  radarCircle1: {
    width: 160,
    height: 160,
    borderColor: '#007AFF',
  },
  radarCircle2: {
    width: 120,
    height: 120,
    borderColor: '#007AFF',
  },
  radarCircle3: {
    width: 80,
    height: 80,
    borderColor: '#007AFF',
  },
  radarCenter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    position: 'absolute',
  },
  checkContainer: {
    position: 'absolute',
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  completionTitle: {
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  completionSubtitle: {
    textAlign: 'center',
  },
});
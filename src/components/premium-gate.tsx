import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useSubscription } from '@/hooks/useSubscription';

interface PremiumGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export default function PremiumGate({ children, featureName = '此功能' }: PremiumGateProps) {
  const router = useRouter();
  const { is_premium, isLoading } = useSubscription();

  if (isLoading) return null;
  if (is_premium) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.lockedContent}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <ThemedText type="subtitle" style={styles.title}>
          Premium 功能
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {featureName}需要 Premium 訂閱才能使用
        </ThemedText>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => router.push('/subscription')}
        >
          <ThemedText style={styles.upgradeButtonText}>升級 Premium</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  lockedContent: {
    alignItems: 'center',
    gap: Spacing.three,
    maxWidth: 300,
  },
  lockEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  upgradeButton: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    marginTop: Spacing.two,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
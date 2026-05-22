/**
 * Jobble Baby - Home Screen
 * Entry point showing quick actions and feature highlights
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const QUICK_ACTIONS = [
  {
    id: 'cv',
    title: '上傳 CV',
    subtitle: 'AI 分析你的競爭力',
    icon: '📄',
    route: '/cv-detail',
    color: '#6366f1',
  },
  {
    id: 'salary',
    title: '查薪酬',
    subtitle: '市場行情一手掌握',
    icon: '💰',
    route: '/salary-query',
    color: '#10b981',
  },
  {
    id: 'interview',
    title: '模擬面試',
    subtitle: 'AI 面試官幫你備戰',
    icon: '🎯',
    route: '/interview',
    color: '#f59e0b',
  },
  {
    id: 'jobs',
    title: '搵工',
    subtitle: '獵頭雷達配對職位',
    icon: '🔍',
    route: '/explore',
    color: '#3b82f6',
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    title: 'CV 評分',
    description: '上傳履歷，AI 立即評估你值幾錢',
    emoji: '📊',
  },
  {
    title: '薪酬查詢',
    description: '匿名市場數據，知道自己站在邊',
    emoji: '📈',
  },
  {
    title: '模擬面試',
    description: 'HR / Technical / Final 三種模式',
    emoji: '🎤',
  },
  {
    title: '獵頭雷達',
    description: 'AI 主動配對，適合你的工作不漏接',
    emoji: '📡',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();

  const handleActionPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <Text style={styles.heroEmoji}>🍼</Text>
            <ThemedText type="title" style={styles.heroTitle}>
              Jobble Baby
            </ThemedText>
            <ThemedText
              themeColor="textSecondary"
              style={styles.heroSubtitle}
            >
              AI 搵工助手，幫你搵到Dream Job
            </ThemedText>
            {!isAuthenticated && (
              <View style={styles.authHint}>
                <TouchableOpacity
                  style={styles.loginHint}
                  onPress={() => router.push('/login')}
                >
                  <ThemedText type="link">登入/註冊</ThemedText>
                </TouchableOpacity>
                <ThemedText
                  themeColor="textSecondary"
                  type="small"
                  style={styles.authHintText}
                >
                  {' '}以存取全部功能
                </ThemedText>
              </View>
            )}
            {isAuthenticated && user && (
              <ThemedText themeColor="textSecondary" style={styles.welcomeText}>
                歡迎，{user.email || user.name || '用戶'} 👋
              </ThemedText>
            )}
          </View>

          {/* Quick Actions Grid */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              快捷功能
            </ThemedText>
            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionCard}
                  onPress={() => handleActionPress(action.route)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}
                  >
                    <Text style={styles.actionEmoji}>{action.icon}</Text>
                  </View>
                  <ThemedText type="strong" style={styles.actionTitle}>
                    {action.title}
                  </ThemedText>
                  <ThemedText
                    themeColor="textSecondary"
                    type="small"
                    style={styles.actionSubtitle}
                  >
                    {action.subtitle}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Feature Highlights */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              全部功能
            </ThemedText>
            <View style={styles.featuresList}>
              {FEATURE_HIGHLIGHTS.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                  <View style={styles.featureText}>
                    <ThemedText type="strong">{feature.title}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {feature.description}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Subscription CTA */}
          <TouchableOpacity
            style={styles.premiumCta}
            onPress={() => router.push('/subscription')}
            activeOpacity={0.8}
          >
            <View style={styles.premiumContent}>
              <Text style={styles.premiumEmoji}>👑</Text>
              <View style={styles.premiumText}>
                <ThemedText type="strong" style={styles.premiumTitle}>
                  升級 Premium
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  解鎖 AI 面試、履歷優化、獵頭雷達
                </ThemedText>
              </View>
              <Text style={styles.premiumArrow}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText themeColor="textSecondary" type="small">
              v1.0 · Made with ❤️ for job seekers
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  heroEmoji: {
    fontSize: 64,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    textAlign: 'center',
    fontSize: 16,
  },
  authHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  loginHint: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  authHintText: {
    fontSize: 14,
  },
  welcomeText: {
    marginTop: Spacing.two,
    fontSize: 15,
  },
  section: {
    marginTop: Spacing.four,
  },
  sectionTitle: {
    marginBottom: Spacing.three,
    fontSize: 18,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionCard: {
    width: '47%',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionSubtitle: {
    fontSize: 12,
  },
  featuresList: {
    gap: Spacing.two,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  featureEmoji: {
    fontSize: 28,
  },
  featureText: {
    flex: 1,
    gap: Spacing.half,
  },
  premiumCta: {
    marginTop: Spacing.five,
    backgroundColor: '#fbbf24',
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  premiumEmoji: {
    fontSize: 32,
  },
  premiumText: {
    flex: 1,
    gap: Spacing.half,
  },
  premiumTitle: {
    fontSize: 16,
    color: '#000',
  },
  premiumArrow: {
    fontSize: 24,
    color: '#000',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
});

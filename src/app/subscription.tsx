/**
 * 訂閱方案畫面
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PlanFeature[];
  recommended?: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'HK$0',
    period: '永久免費',
    description: '基本功能',
    features: [
      { text: 'CV 上傳', included: true },
      { text: '基本薪資查詢', included: true },
      { text: 'AI 面試練習', included: false },
      { text: 'CV 優化建議', included: false },
      { text: '職缺提醒', included: false },
      { text: '優先客服支援', included: false },
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 'HK$199',
    period: '/月',
    description: '完整功能',
    features: [
      { text: 'CV 上傳', included: true },
      { text: '基本薪資查詢', included: true },
      { text: 'AI 面試練習', included: true },
      { text: 'CV 優化建議', included: true },
      { text: '職缺提醒', included: true },
      { text: '優先客服支援', included: false },
    ],
    recommended: true,
    badge: '推薦',
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 'HK$99',
    period: '/月',
    description: '節省 50%',
    features: [
      { text: 'CV 上傳', included: true },
      { text: '基本薪資查詢', included: true },
      { text: 'AI 面試練習', included: true },
      { text: 'CV 優化建議', included: true },
      { text: '職缺提醒', included: true },
      { text: '優先客服支援', included: false },
    ],
    recommended: true,
    badge: '最抵',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 'HK$299',
    period: '/月',
    description: '尊貴體驗',
    features: [
      { text: 'CV 上傳', included: true },
      { text: '基本薪資查詢', included: true },
      { text: 'AI 面試練習', included: true },
      { text: 'CV 優化建議', included: true },
      { text: '職缺提醒', included: true },
      { text: '優先客服支援', included: true },
    ],
    recommended: true,
    badge: '尊貴',
  },
];

const FAQ_DATA = [
  {
    question: '如何升級到付費方案？',
    answer: '點擊「升級」按鈕，選擇您想要的方案並完成付款即可。',
  },
  {
    question: '可以隨時取消訂閱嗎？',
    answer: '是的，您可以隨時在設定中取消訂閱，取消後將於本期結束時生效。',
  },
  {
    question: '年繳方案如何計費？',
    answer: '年繳方案為一次性扣除 12 個月的費用，比月繳方案節省 50%。',
  },
  {
    question: '付費後可以退款嗎？',
    answer: '在訂閱後 7 天內，如對服務不滿意，可申請全額退款。',
  },
];

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPremiumUser = user?.subscription_tier === 'premium';

  const getAuthToken = async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch {
      return null;
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (isPremiumUser) {
      Alert.alert('提示', '您已是 Premium 用戶');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('錯誤', '請先登入');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/users/subscription`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: 'premium' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || '升級失敗');
      }

      Alert.alert('成功', '恭喜您已升級為 Premium 用戶！');
    } catch (e: any) {
      setError(e.message || '網絡錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlanCard = (plan: Plan, index: number) => {
    const isCurrentPlan = plan.id === 'free' && !isPremiumUser;

    return (
      <View
        key={plan.id}
        style={[
          styles.planCard,
          plan.recommended && styles.planCardRecommended,
          index === PLANS.length - 1 && styles.planCardLast,
        ]}
      >
        {plan.badge && (
          <View style={[styles.planBadge, plan.recommended && styles.planBadgeRecommended]}>
            <Text style={styles.planBadgeText}>{plan.badge}</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <ThemedText type="title" style={styles.planName}>{plan.name}</ThemedText>
          <View style={styles.planPriceRow}>
            <ThemedText type="largeTitle" style={styles.planPrice}>{plan.price}</ThemedText>
            <ThemedText type="small" style={styles.planPeriod}>{plan.period}</ThemedText>
          </View>
          <ThemedText type="small" style={styles.planDescription}>{plan.description}</ThemedText>
        </View>

        <View style={styles.planFeatures}>
          {plan.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.included ? '✓' : '✗'}</Text>
              <ThemedText
                type="small"
                style={[
                  styles.featureText,
                  !feature.included && styles.featureTextDisabled,
                ]}
              >
                {feature.text}
              </ThemedText>
            </View>
          ))}
        </View>

        {isCurrentPlan || isPremiumUser ? (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>
              {isPremiumUser ? '目前方案' : '目前使用'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.upgradeButton, isLoading && styles.upgradeButtonDisabled]}
            onPress={() => handleUpgrade(plan.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.upgradeButtonText}>升級</Text>
            )}
          </TouchableOpacity>
        )}

        {error && plan.id === 'monthly' && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  };

  const renderFaqItem = (item: { question: string; answer: string }, index: number) => {
    const isExpanded = expandedFaq === index;

    return (
      <View key={index} style={styles.faqItem}>
        <TouchableOpacity
          style={styles.faqQuestion}
          onPress={() => setExpandedFaq(isExpanded ? null : index)}
          activeOpacity={0.7}
        >
          <ThemedText type="smallBold" style={styles.faqQuestionText}>{item.question}</ThemedText>
          <Text style={styles.faqArrow}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.faqAnswer}>
            <ThemedText type="small" style={styles.faqAnswerText}>{item.answer}</ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>訂閱方案</ThemedText>
          <ThemedText type="subtitle" style={styles.subtitle}>
            選擇適合您的方案，解鎖更多功能
          </ThemedText>
        </View>

        <View style={styles.plansContainer}>
          {PLANS.map((plan, index) => renderPlanCard(plan, index))}
        </View>

        <View style={styles.faqSection}>
          <ThemedText type="title" style={styles.faqTitle}>常見問題</ThemedText>
          {FAQ_DATA.map((item, index) => renderFaqItem(item, index))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.four,
  },
  header: {
    marginBottom: Spacing.five,
    alignItems: 'center',
  },
  title: {
    marginBottom: Spacing.two,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
  },
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  planCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: Spacing.three,
  },
  planCardRecommended: {
    borderColor: '#007AFF',
    backgroundColor: '#f8faff',
  },
  planCardLast: {
    width: '100%',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: Spacing.three,
    backgroundColor: '#8E8E93',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeRecommended: {
    backgroundColor: '#007AFF',
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    marginBottom: Spacing.three,
  },
  planName: {
    marginBottom: Spacing.half,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.half,
  },
  planPrice: {
    color: '#007AFF',
  },
  planPeriod: {
    color: '#666',
    marginLeft: Spacing.half,
  },
  planDescription: {
    color: '#999',
  },
  planFeatures: {
    marginBottom: Spacing.three,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.half,
  },
  featureIcon: {
    fontSize: 14,
    marginRight: Spacing.half,
    color: '#34C759',
  },
  featureText: {
    flex: 1,
  },
  featureTextDisabled: {
    color: '#ccc',
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
  },
  upgradeButtonDisabled: {
    backgroundColor: '#a0cfff',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentPlanBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
  },
  currentPlanText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    textAlign: 'center',
    marginTop: Spacing.half,
  },
  faqSection: {
    marginTop: Spacing.five,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  faqTitle: {
    marginBottom: Spacing.three,
  },
  faqItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
  },
  faqQuestionText: {
    flex: 1,
    marginRight: Spacing.two,
  },
  faqArrow: {
    fontSize: 12,
    color: '#666',
  },
  faqAnswer: {
    padding: Spacing.three,
    paddingTop: 0,
    backgroundColor: '#f5f5f5',
  },
  faqAnswerText: {
    color: '#666',
    lineHeight: 20,
  },
});
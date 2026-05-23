import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Step1CVUpload } from '@/components/onboarding/Step1CVUpload';
import Step2JobPreferences from '@/components/onboarding/Step2JobPreferences';
import Step3Interview from '@/components/onboarding/Step3Interview';
import { Step4Notifications } from '@/components/onboarding/Step4Notifications';

const TOTAL_STEPS = 4;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://localhost:8000/api/v1';

export default function OnboardingScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { completeOnboarding } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(1);
  const [progressAnim] = useState(new Animated.Value(0));
  const [step2Data, setStep2Data] = useState<{
    job_types: string[];
    locations: string[];
    salary_min: number;
  } | null>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentStep > 1) {
        goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [currentStep]);

  const updateProgress = (step: number) => {
    Animated.timing(progressAnim, {
      toValue: (step - 1) / (TOTAL_STEPS - 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateProgress(nextStep);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      updateProgress(prevStep);
    }
  };

  const skip = () => {
    setCurrentStep(TOTAL_STEPS);
    progressAnim.setValue(1);
  };

  const callOnboardingAPI = async (step: number) => {
    if (!token) return;

    try {
      const body: any = { step };
      if (step === 2 && step2Data) {
        body.preferences = step2Data;
      }
      if (step === 4) {
        body.preferences = { notifications_enabled: true };
      }

      const response = await fetch(`${API_BASE_URL}/onboarding/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error('Onboarding API call failed');
      }
    } catch (e) {
      console.error('Onboarding API error:', e);
    }
  };

  const handleStep1Complete = (result: { cv_id: number; score: number }) => {
    callOnboardingAPI(1);
    goNext();
  };

  const handleStep2Complete = () => {
    callOnboardingAPI(2);
    goNext();
  };

  const handleStep3Complete = () => {
    callOnboardingAPI(3);
    goNext();
  };

  const handleStep4Complete = async (_notificationsEnabled: boolean) => {
    try {
      await callOnboardingAPI(4);
      await completeOnboarding();
      router.replace('/');
    } catch (e) {
      console.error('Failed to complete onboarding:', e);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1CVUpload onNext={handleStep1Complete} />;
      case 2:
        return <Step2JobPreferences onBack={goBack} onNext={handleStep2Complete} />;
      case 3:
        return <Step3Interview onBack={goBack} onNext={handleStep3Complete} />;
      case 4:
        return <Step4Notifications onBack={goBack} />;
      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.header}>
          <ThemedText themeColor="textSecondary" type="small">
            步驟 {currentStep}/{TOTAL_STEPS}
          </ThemedText>
          <TouchableOpacity onPress={skip}>
            <ThemedText themeColor="textSecondary" type="small">跳過</ThemedText>
          </TouchableOpacity>
        </View>


        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>


        <View style={styles.content}>
          {renderStepContent()}
        </View>


        <View style={styles.navButtons}>
          {currentStep > 1 && currentStep < TOTAL_STEPS && (
            <TouchableOpacity
              style={styles.navButtonBack}
              onPress={goBack}
            >
              <ThemedText style={styles.navButtonBackText}>上一步</ThemedText>
            </TouchableOpacity>
          )}
          {currentStep === TOTAL_STEPS && (
            <TouchableOpacity
              style={styles.navButtonBack}
              onPress={goBack}
            >
              <ThemedText style={styles.navButtonBackText}>上一步</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  progressContainer: {
    height: 4,
    backgroundColor: Colors.light.backgroundElement,
    marginHorizontal: Spacing.four,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  navButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  navButtonPrimary: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  navButtonPrimaryText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  navButtonBack: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  navButtonBackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  navButtonSecondary: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
});
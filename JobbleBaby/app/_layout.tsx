import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { safeGetItem, safeSetItem, safeRemoveItem } from './utils/SafeStorage';
import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Linking from 'expo-linking';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import * as Notifications from 'expo-notifications';
import OnboardingScreen from './screens/OnboardingScreen';
import DaycareViewScreen from './screens/DaycareViewScreen';
import FeedingTimerScreen from './screens/FeedingTimerScreen';
import * as Sentry from '@sentry/react-native';

function SentryFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0F' }}>
      <Text style={{ color: '#FF4444' }}>Something went wrong</Text>
    </View>
  );
}

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enableAutoPerformanceTracing: true,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
});

const PROFILE_KEY = '@jobble_baby_profile';

export default function RootLayout() {
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    checkProfile();
    checkDeepLink();
  }, []);

  const checkProfile = async () => {
    try {
      const profile = await safeGetItem(PROFILE_KEY);
      if (!profile) {
        setShowOnboarding(true);
      }
      setHasProfile(!!profile);
    } catch {
      setHasProfile(false);
    }
  };

  const checkDeepLink = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && initialUrl.includes('daycare')) {
        setInitialRoute('daycare');
      }
    } catch { /* silent */ }
  };

  if (hasProfile === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0D0F' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (initialRoute === 'daycare' || showOnboarding) {
    if (!hasProfile && initialRoute !== 'daycare') {
      return (
<Sentry.ErrorBoundary fallback={SentryFallback}>
          <ThemeProvider>
            <LanguageProvider>
              <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
            </LanguageProvider>
          </ThemeProvider>
        </Sentry.ErrorBoundary>
      );
    }
    return (
      <Sentry.ErrorBoundary fallback={SentryFallback}>
        <ThemeProvider>
          <LanguageProvider>
            <DaycareViewScreen />
          </LanguageProvider>
        </ThemeProvider>
      </Sentry.ErrorBoundary>
    );
  }

  return (
    <Sentry.ErrorBoundary fallback={SentryFallback}>
      <ThemeProvider>
        <LanguageProvider>
          <TabNavigator />
        </LanguageProvider>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  );
}

function TabNavigator() {
  const { t } = useLanguage();
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="home" color={color} /> }}
      />
      <Tabs.Screen
        name="tracking"
        options={{ title: t('tabs.tracking'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="edit" color={color} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: t('tabs.schedule'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="schedule" color={color} /> }}
      />
      <Tabs.Screen
        name="allergens"
        options={{ title: t('tabs.allergens'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="no-food" color={color} /> }}
      />
      <Tabs.Screen
        name="milestones"
        options={{ title: t('tabs.milestones'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="emoji-events" color={color} /> }}
      />
      <Tabs.Screen
        name="sleep-training"
        options={{ title: t('tabs.sleepTraining'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="nightlight" color={color} /> }}
      />
      <Tabs.Screen
        name="teething"
        options={{ title: t('tabs.teething'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="sentiment-satisfied" color={color} /> }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: t('tabs.products'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="shopping-bag" color={color} /> }}
      />
      <Tabs.Screen
        name="growth"
        options={{ title: t('tabs.growth'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="show-chart" color={color} /> }}
      />
      <Tabs.Screen
        name="constellation"
        options={{ title: t('tabs.constellation'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="stars" color={color} /> }}
      />
      <Tabs.Screen
        name="reflex-visual-motor"
        options={{ title: t('tabs.reflexVisualMotor'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="psychology" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="person" color={color} /> }}
      />
      <Tabs.Screen
        name="allergens"
        options={{ title: t('tabs.allergens'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="no-food" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="appstore-checklist"
        options={{ title: t('tabs.appstoreChecklist'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="apple" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="asymmetric-growth"
        options={{ title: t('tabs.asymmetricGrowth'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="show-chart" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="bilateral-coordination"
        options={{ title: t('tabs.bilateral'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="accessibility" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="bonding-journal"
        options={{ title: t('tabs.bondingJournal'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="favorite" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="bottle-feeding"
        options={{ title: t('tabs.bottleFeeding'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="water-drop" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="bottle-refusal"
        options={{ title: t('tabs.bottleRefusal'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="cancel" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="caregiver-fatigue"
        options={{ title: t('tabs.caregiverFatigue'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="favorite-border" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="circadian"
        options={{ title: t('tabs.circadian'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="brightness-low" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="clinician-portal"
        options={{ title: t('tabs.clinicianPortal'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="local-hospital" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="colic-relief"
        options={{ title: t('tabs.colicRelief'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="healing" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="critical-periods"
        options={{ title: t('tabs.criticalPeriods'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="timeline" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="cry-analyzer"
        options={{ title: t('tabs.cryAnalyzer'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="mic" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="cup-feeding"
        options={{ title: t('tabs.cupFeedingTransition'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="local-drink" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="doctor-visit"
        options={{ title: t('tabs.doctorVisit'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="local-hospital" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="feeding-readiness"
        options={{ title: t('tabs.feedingReadiness'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="restaurant" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="fontanelle-hydration"
        options={{ title: t('tabs.fontanelleHydration'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="water-drop" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="fontanelle"
        options={{ title: t('tabs.fontanelle'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="face" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="galant-latch-navigator"
        options={{ title: t('tabs.galantLatch'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="child-care" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="gear-check"
        options={{ title: t('tabs.gearCheck'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="backpack" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="gravity-feeding"
        options={{ title: t('tabs.gravityFeeding'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="airline-seat-recline-normal" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="growth-montage"
        options={{ title: t('tabs.growthMontage'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="movie" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="gut-brain-axis"
        options={{ title: t('tabs.gutBrainAxis'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="scatter-plot" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="habit-reset"
        options={{ title: t('tabs.habitReset'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="autorenew" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="hip-click"
        options={{ title: t('tabs.hipClick'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="accessibility" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="home-safety"
        options={{ title: t('tabs.homeSafety'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="home" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="interoceptive"
        options={{ title: t('tabs.interoceptive'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="psychology" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="iot-security"
        options={{ title: t('tabs.iotSecurity'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="security" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="jaundice"
        options={{ title: t('tabs.jaundice'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="wb-sunny" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="jet-lag"
        options={{ title: t('tabs.jetLag'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="schedule" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="launch-checklist"
        options={{ title: t('tabs.launchChecklist'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="checklist" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="medicine-dose"
        options={{ title: t('tabs.medicineDose'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="medical-services" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="milk-prep"
        options={{ title: t('tabs.milkPrep'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="opacity" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="milk-transfer"
        options={{ title: t('tabs.milkTransfer'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="swap-horiz" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="monitor-correlation"
        options={{ title: t('tabs.monitorCorrelation'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="monitor" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="moro-reflex"
        options={{ title: t('tabs.moroReflex'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="warning" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="oral-motor"
        options={{ title: t('tabs.oralMotor'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="accessibility" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="pediatric-report"
        options={{ title: t('tabs.pediatricReport'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="description" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="phototherapy-comfort"
        options={{ title: t('tabs.phototherapyComfort'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="lightbulb" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="procedure-recovery"
        options={{ title: t('tabs.procedureRecovery'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="healing" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="projection"
        options={{ title: t('tabs.projection'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="trending-up" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="reflex-integration"
        options={{ title: t('tabs.reflexIntegration'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="accessibility" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="reflex-tracker"
        options={{ title: t('tabs.reflexTracker'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="accessible" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="regression-navigator"
        options={{ title: t('tabs.regressionNavigator'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="explore" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="regulatory-fitness"
        options={{ title: t('tabs.regulatoryFitness'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="favorite" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="safety-audit"
        options={{ title: t('tabs.safetyAudit'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="verified-user" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="sensory-integration"
        options={{ title: t('tabs.sensoryIntegration'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="visibility" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="shift-handoff"
        options={{ title: t('tabs.shiftHandoff'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="swap-horiz" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="sleep-architecture"
        options={{ title: t('tabs.sleepArchitecture'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="hotel" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="sleep-association"
        options={{ title: t('tabs.sleepAssociation'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="link" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="sleep-debt"
        options={{ title: t('tabs.sleepDebt'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="do-not-disturb" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="solid-food"
        options={{ title: t('tabs.solidFood'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="restaurant" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="stranger-danger"
        options={{ title: t('tabs.strangerDanger'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="person-add" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="stress-cascade"
        options={{ title: t('tabs.stressCascade'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="waves" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="thermal-metabolic"
        options={{ title: t('tabs.thermalRegulation'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="thermostat" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="thermal-regulation"
        options={{ title: t('tabs.thermalRegulation'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="thermostat" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="tongue-tie"
        options={{ title: t('tabs.tongueTie'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="settings-voice" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="tummy-time"
        options={{ title: t('tabs.tummyTime'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="child-care" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="vestibular-assessment"
        options={{ title: t('tabs.vestibularAssessment'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="3d-rotation" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="weaning-rash"
        options={{ title: t('tabs.weaningRash'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="medical-services" color={color} />, headerShown: false }}
      />
      <Tabs.Screen
        name="window-of-tolerance"
        options={{ title: t('tabs.windowOfTolerance'), tabBarIcon: ({ color }) => <MaterialIcons size={28} name="psychology" color={color} />, headerShown: false }}
      />
    </Tabs>
  );
}
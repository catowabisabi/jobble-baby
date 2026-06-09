import { Tabs } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import GearCheckScreen from './gear-check';

export default function TabsLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#E5E7EB' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="allergens"
        options={{ title: t('tabs.allergens'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="food-apple" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="tracking"
        options={{ title: t('tabs.tracking'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-list" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{ title: t('tabs.schedule'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="growth"
        options={{ title: t('tabs.growth'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="products"
        options={{ title: t('tabs.products'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="shopping" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="milestones"
        options={{ title: t('tabs.milestones'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="trophy-variant" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="critical-periods"
        options={{
          title: t('tabs.criticalPeriods'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vestibular-assessment"
        options={{
          title: t('tabs.vestibularAssessment'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="human-handsup" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="sleep-training"
        options={{ title: t('tabs.sleepTraining'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="weather-night" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="sleep-association"
        options={{
          title: t('tabs.sleepAssociation'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cloud-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="teething"
        options={{ title: t('tabs.teething'), tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="tooth" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="monitor-correlation"
        options={{
          title: t('tabs.monitorCorrelation') || 'Monitor',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="baby-face-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="milk-prep"
        options={{
          title: t('tabs.milkPrep'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="snowflake" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="shift-handoff"
        options={{
          title: t('tabs.shiftHandoff') || 'Shift',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-switch" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="stress-cascade"
        options={{
          title: t('tabs.stressCascade'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="heart-pulse" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="doctor-visit"
        options={{
          title: t('tabs.doctorVisit'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="medical-bag" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="sleep-debt"
        options={{
          title: t('tabs.sleepDebt'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="sleep" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="tummy-time"
        options={{
          title: t('tabs.tummyTime'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="human-handsup" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="bottle-refusal"
        options={{
          title: t('tabs.bottleRefusal'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="baby-bottle" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="gear-check"
        options={{
          title: t('tabs.gearCheck'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="medical-bag" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="safety-audit"
        options={{
          title: t('tabs.safetyAudit'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="shield-check" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="reflex-tracker"
        options={{
          title: t('tabs.reflexTracker'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="hip-click"
        options={{
          title: t('tabs.hipClick'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="human-male-female-child" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="weaning-rash"
        options={{
          title: t('tabs.weaningRash'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="food-drumstick" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="oral-motor"
        options={{
          title: t('tabs.oralMotor'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="baby-carriage" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="moro-reflex"
        options={{
          title: t('tabs.moroReflex'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="alert-octagon" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="tongue-tie"
        options={{
          title: t('tabs.tongueTie'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="link-variant" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="jet-lag"
        options={{
          title: t('tabs.jetLag'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="airplane" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="fontanelle"
        options={{
          title: t('tabs.fontanelle'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="head-dots-horizontal" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="medicine-dose"
        options={{
          title: t('tabs.medicineDose'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="medical-bag" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="milk-transfer"
        options={{
          title: t('tabs.milkTransfer'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="water-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="pediatric-report"
        options={{
          title: t('tabs.pediatricReport'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="cry-analyzer"
        options={{
          title: t('tabs.cryAnalyzer'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="heart-pulse" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="gut-brain-axis"
        options={{
          title: t('tabs.gutBrainAxis'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="flower-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="circadian"
        options={{
          title: t('tabs.circadian'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="weather-night" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="reflex-integration"
        options={{
          title: t('tabs.reflexIntegration'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="projection"
        options={{
          title: t('tabs.projection'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="clinician-portal"
        options={{
          title: t('tabs.clinicianPortal'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="doctor" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="jaundice"
        options={{
          title: t('tabs.jaundice'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="lightbulb-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="iot-security"
        options={{
          title: t('tabs.iotSecurity'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="shield-lock" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="bonding-journal"
        options={{
          title: t('tabs.bondingJournal'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="hand-heart" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="habit-reset"
        options={{
          title: t('tabs.habitReset'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="refresh" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="caregiver-fatigue"
        options={{
          title: t('tabs.caregiverFatigue'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="heart-pulse" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="colic-relief"
        options={{
          title: t('tabs.colicRelief') || 'Colic',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="emoticon-cry" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="feeding-readiness"
        options={{
          title: t('tabs.feedingReadiness'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="food-drumstick" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="phototherapy-comfort"
        options={{
          title: t('tabs.phototherapyComfort'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="lightbulb-on" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="eight-month-storm"
        options={{
          title: t('tabs.eightMonthStorm'),
          tabBarIcon: ({ color, size }) => <Ionicons name="cloud-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="procedure-recovery"
        options={{
          title: t('tabs.procedureRecovery'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="medical-bag" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="thermal-regulation"
        options={{
          title: t('tabs.thermalRegulation'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="thermometer" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="constellation"
        options={{
          title: t('tabs.constellation'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map-marker-star" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="launch-checklist"
        options={{
          title: t('tabs.launchChecklist'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="rocket-launch" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="growth-montage"
        options={{
          title: t('tabs.growthMontage'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="movie" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="regression-navigator"
        options={{
          title: t('tabs.regressionNavigator'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="sleep" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="fontanelle-hydration"
        options={{
          title: t('tabs.fontanelleHydration'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="water" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="bilateral-coordination"
        options={{
          title: t('tabs.bilateral'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="human-handsup" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="sleep-architecture"
        options={{
          title: t('tabs.sleepArchitecture'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="moon-waning-crescent" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="appstore-checklist"
        options={{
          title: t('tabs.appstoreChecklist'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="store" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="vestibular-assessment"
        options={{
          title: t('tabs.vestibularAssessment'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="human-handsup" size={size} color={color} />
        }}
      />
    </Tabs>
  );
}
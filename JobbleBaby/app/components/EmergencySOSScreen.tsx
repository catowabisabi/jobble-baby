import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem } from '@/app/utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import {
  EMERGENCY_CONTACTS,
  EMERGENCY_GUIDES,
  getDoseInfo,
  BabyInfoCard,
} from '../data/emergencyData';

const { width: SCREEN_W } = Dimensions.get('window');
const SOS_ACCENT = '#e74c3c';
const SOS_BG = '#1a1a1a';
const SOS_TEXT = '#ffffff';
const SOS_CARD = '#2a2a2a';
const SOS_MUTED = '#888888';
const SOS_WARNING = '#f1c40f';

type Tab = 'contacts' | 'guides' | 'baby';

interface BabyProfile {
  name: string;
  birthDate: string;
  weight?: number;
  pediatricianPhone?: string;
  emergencyContacts?: {
    pediatrician?: string;
    parent1?: string;
    parent2?: string;
  };
}

interface CloseGesture {
  pressCount: number;
  lastPressTime: number;
  swipeX: number;
  isSwiping: boolean;
}

export default function EmergencySOSScreen() {
  const { t, effectiveLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('contacts');
  const [babyInfo, setBabyInfo] = useState<BabyInfoCard | null>(null);
  const [contacts, setContacts] = useState(EMERGENCY_CONTACTS);
  const [doseInfo, setDoseInfo] = useState<{ paracetamol: string; ibuprofen: string } | null>(null);

  const closeGesture = useRef<CloseGesture>({
    pressCount: 0,
    lastPressTime: 0,
    swipeX: 0,
    isSwiping: false,
  });
  const swipeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadBabyData();
  }, []);

  const loadBabyData = async () => {
    try {
      const stored = await safeGetItem('@jobble_baby_profile');
      if (stored !== null) {
        const profile: BabyProfile = JSON.parse(stored);
        const birth = new Date(profile.birthDate);
        const now = new Date();
        const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        const weightKg = profile.weight || null;
        const weightLbs = weightKg ? Math.round(weightKg * 2.20462 * 10) / 10 : null;
        const ageText =
          months < 12
            ? `${months} months`
            : `${Math.floor(months / 12)}y ${months % 12}m`;
        setBabyInfo({
          name: profile.name,
          ageMonths: months,
          ageText,
          weightKg,
          weightLbs,
        });
        setDoseInfo(getDoseInfo(months, weightKg));
        const updatedContacts = [...EMERGENCY_CONTACTS];
        if (profile.pediatricianPhone) {
          const pedIndex = updatedContacts.findIndex((c) => c.id === 'pediatrician');
          if (pedIndex >= 0) updatedContacts[pedIndex] = { ...updatedContacts[pedIndex], phone: profile.pediatricianPhone };
        }
        setContacts(updatedContacts);
      }
    } catch {}
  };

  const handleCall = (phone: string, label: string) => {
    const url = `tel:${phone}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) Linking.openURL(url);
        else Alert.alert('Cannot make calls', `Phone: ${phone}`);
      })
      .catch(() => Alert.alert('Error', 'Failed to open phone'));
  };

  const handleTripleClose = () => {
    const now = Date.now();
    const g = closeGesture.current;
    if (now - g.lastPressTime < 800) {
      g.pressCount += 1;
    } else {
      g.pressCount = 1;
    }
    g.lastPressTime = now;
    if (g.pressCount >= 3) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  };

  const handleSwipeClose = (dx: number) => {
    if (dx > 120) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.spring(swipeAnim, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    }
  };

  const styles = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: SOS_BG,
    },
    header: {
      backgroundColor: SOS_ACCENT,
      paddingTop: 60,
      paddingBottom: 20,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: SOS_TEXT,
      letterSpacing: 1,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: 22,
      color: SOS_TEXT,
      fontWeight: '600',
    },
    tabRow: {
      flexDirection: 'row',
      backgroundColor: SOS_CARD,
      padding: 4,
      marginHorizontal: 20,
      marginTop: 16,
      borderRadius: 12,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: SOS_ACCENT,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: SOS_MUTED,
    },
    tabTextActive: {
      color: SOS_TEXT,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: SOS_MUTED,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginTop: 24,
      marginBottom: 12,
    },
    contactCard: {
      backgroundColor: SOS_CARD,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: SOS_ACCENT,
    },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    contactIcon: {
      fontSize: 36,
      marginRight: 16,
    },
    contactInfo: {
      flex: 1,
    },
    contactLabel: {
      fontSize: 18,
      fontWeight: '700',
      color: SOS_TEXT,
      marginBottom: 2,
    },
    contactDesc: {
      fontSize: 13,
      color: SOS_MUTED,
    },
    callBtn: {
      backgroundColor: SOS_ACCENT,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 28,
      alignItems: 'center',
      marginTop: 8,
    },
    callBtnText: {
      fontSize: 20,
      fontWeight: '800',
      color: SOS_TEXT,
      letterSpacing: 1,
    },
    guideCard: {
      backgroundColor: SOS_CARD,
      borderRadius: 16,
      marginBottom: 16,
      overflow: 'hidden',
    },
    guideHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#333',
    },
    guideIcon: {
      fontSize: 28,
      marginRight: 12,
    },
    guideTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: SOS_TEXT,
      flex: 1,
    },
    guideContent: {
      padding: 16,
    },
    guideSectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: SOS_WARNING,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    guideText: {
      fontSize: 15,
      color: SOS_TEXT,
      lineHeight: 22,
    },
    urgentBadge: {
      backgroundColor: SOS_ACCENT,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginLeft: 10,
    },
    urgentBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      color: SOS_TEXT,
      textTransform: 'uppercase',
    },
    babyCard: {
      backgroundColor: SOS_CARD,
      borderRadius: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: '#3B82F6',
    },
    babyName: {
      fontSize: 24,
      fontWeight: '800',
      color: SOS_TEXT,
      marginBottom: 16,
    },
    babyRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    babyLabel: {
      fontSize: 14,
      color: SOS_MUTED,
      width: 80,
    },
    babyValue: {
      fontSize: 16,
      fontWeight: '600',
      color: SOS_TEXT,
      flex: 1,
    },
    doseCard: {
      backgroundColor: '#2a2a2a',
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
      borderLeftWidth: 4,
      borderLeftColor: SOS_WARNING,
    },
    doseTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: SOS_WARNING,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    doseRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    doseLabel: {
      fontSize: 14,
      color: SOS_TEXT,
    },
    doseValue: {
      fontSize: 14,
      fontWeight: '700',
      color: SOS_ACCENT,
    },
    swipeHint: {
      fontSize: 12,
      color: SOS_MUTED,
      textAlign: 'center',
      marginTop: 20,
    },
    closeArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 60,
    },
  });

  const renderContacts = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{t('emergency.emergencyContacts')}</Text>
      {contacts.map((contact) => (
        <View key={contact.id} style={styles.contactCard}>
          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>{contact.icon}</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{t(contact.labelKey)}</Text>
              <Text style={styles.contactDesc}>{t(contact.descriptionKey)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            activeOpacity={0.7}
            onPress={() => handleCall(contact.phone, contact.labelKey)}
          >
            <Text style={styles.callBtnText}>📞 {contact.phone}</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.swipeHint}>{t('emergency.swipeHint')}</Text>
    </ScrollView>
  );

  const renderGuides = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{t('emergency.crisisGuides')}</Text>
      {EMERGENCY_GUIDES.map((guide) => (
        <View key={guide.id} style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <Text style={styles.guideIcon}>{guide.icon}</Text>
            <Text style={styles.guideTitle}>{t(guide.titleKey)}</Text>
            {guide.sections.some((s) => s.urgent) && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentBadgeText}>{t('emergency.urgent')}</Text>
              </View>
            )}
          </View>
          <View style={styles.guideContent}>
            {guide.sections.map((section, si) => (
              <View key={si} style={{ marginBottom: si < guide.sections.length - 1 ? 16 : 0 }}>
                <Text style={styles.guideSectionTitle}>{t(section.titleKey)}</Text>
                <Text style={styles.guideText}>{section.content}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <Text style={styles.swipeHint}>{t('emergency.swipeHint')}</Text>
    </ScrollView>
  );

  const renderBabyCard = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>{t('emergency.babyInfo')}</Text>
      <View style={styles.babyCard}>
        <Text style={styles.babyName}>
          {babyInfo ? `👶 ${babyInfo.name}` : t('emergency.noBabyData')}
        </Text>
        {babyInfo && (
          <>
            <View style={styles.babyRow}>
              <Text style={styles.babyLabel}>{t('emergency.age')}</Text>
              <Text style={styles.babyValue}>{babyInfo.ageText}</Text>
            </View>
            <View style={styles.babyRow}>
              <Text style={styles.babyLabel}>{t('emergency.weight')}</Text>
              <Text style={styles.babyValue}>
                {babyInfo.weightKg ? `${babyInfo.weightKg} kg / ${babyInfo.weightLbs} lbs` : t('emergency.noWeight')}
              </Text>
            </View>
            <View style={styles.babyRow}>
              <Text style={styles.babyLabel}>{t('emergency.doseNote')}</Text>
              <Text style={[styles.babyValue, { color: SOS_WARNING }]}>{t('emergency.consultDoctor')}</Text>
            </View>
          </>
        )}
      </View>
      {doseInfo && babyInfo && (
        <View style={styles.doseCard}>
          <Text style={styles.doseTitle}>{t('emergency.dosageGuide')}</Text>
          <View style={styles.doseRow}>
            <Text style={styles.doseLabel}>💊 Paracetamol ({t('emergency.paracetamol')})</Text>
            <Text style={styles.doseValue}>{doseInfo.paracetamol}</Text>
          </View>
          <View style={styles.doseRow}>
            <Text style={styles.doseLabel}>💊 Ibuprofen ({t('emergency.ibuprofen')})</Text>
            <Text style={styles.doseValue}>{doseInfo.ibuprofen}</Text>
          </View>
        </View>
      )}
      <Text style={styles.swipeHint}>{t('emergency.swipeHint')}</Text>
    </ScrollView>
  );

  return (
    <Animated.View style={[styles.screen, { opacity: fadeAnim }]}>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Pressable
          onPress={handleTripleClose}
          onLongPress={() => {}}
          delayLongPress={300}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🆘 {t('emergency.sos')}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.7}
              onPress={handleTripleClose}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Pressable>

        <View style={styles.tabRow}>
          {(['contacts', 'guides', 'baby'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'contacts' && '📞 '}{tab === 'guides' && '📋 '}{tab === 'baby' && '👶 '}
                {t(`emergency.tab.${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Animated.ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'contacts' && renderContacts()}
          {activeTab === 'guides' && renderGuides()}
          {activeTab === 'baby' && renderBabyCard()}
        </Animated.ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

// ─── Mock Data ────────────────────────────────────────────────────────────────

interface SupportType {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
}

const SUPPORT_TYPES: SupportType[] = [
  {
    id: 'feeding',
    icon: '🍽️',
    titleKey: 'villageNetwork.supportCircle.feedingPeers.title',
    descKey: 'villageNetwork.supportCircle.feedingPeers.desc',
  },
  {
    id: 'sleep',
    icon: '🌙',
    titleKey: 'villageNetwork.supportCircle.sleepPartners.title',
    descKey: 'villageNetwork.supportCircle.sleepPartners.desc',
  },
  {
    id: 'growth',
    icon: '📈',
    titleKey: 'villageNetwork.supportCircle.growthBuddies.title',
    descKey: 'villageNetwork.supportCircle.growthBuddies.desc',
  },
];

interface PeerProfile {
  id: string;
  name: string;
  babyAge: string;
  location: string;
  interests: string;
  emoji: string;
}

const MOCK_PEERS: PeerProfile[] = [
  { id: '1', name: 'Sarah', babyAge: '8mo', location: 'Hong Kong', interests: 'Sleep training, BLW', emoji: '👩‍🍼' },
  { id: '2', name: 'Mei-Lin', babyAge: '6mo', location: 'Taiwan', interests: 'Allergen introduction, reflux', emoji: '👩‍👧' },
  { id: '3', name: 'Priya', babyAge: '9mo', location: 'Singapore', interests: 'Tummy time, milestones', emoji: '👩‍👦' },
  { id: '4', name: 'Ah-Ming', babyAge: '7mo', location: 'Hong Kong', interests: 'Feeding prep, teething', emoji: '👩‍🍼' },
  { id: '5', name: 'Jia', babyAge: '11mo', location: 'Taiwan', interests: 'Sleep regression, growth chart', emoji: '👩‍👧‍👦' },
];

interface ResourceLink {
  id: string;
  icon: string;
  titleKey: string;
  url: string;
}

const RESOURCE_LINKS: ResourceLink[] = [
  { id: '1', icon: '📍', titleKey: 'villageNetwork.resourceHub.localGroups', url: '' },
  { id: '2', icon: '📞', titleKey: 'villageNetwork.resourceHub.hotlines', url: '' },
  { id: '3', icon: '🤱', titleKey: 'villageNetwork.resourceHub.laLeche', url: '' },
  { id: '4', icon: '💊', titleKey: 'villageNetwork.resourceHub.postpartum', url: '' },
];

interface EmergencyNumber {
  id: string;
  label: string;
  number: string;
  flag: string;
}

const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { id: 'hk', label: 'HK Emergency', number: '999', flag: '🇭🇰' },
  { id: 'tw', label: 'Taiwan', number: '119', flag: '🇹🇼' },
  { id: 'sg', label: 'Singapore', number: '995', flag: '🇸🇬' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function VillageNetworkScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 6 },

    // Section
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 14 },

    // Support Circle cards
    supportCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    supportIcon: { fontSize: 32, marginRight: 14 },
    supportInfo: { flex: 1 },
    supportTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 4 },
    supportDesc: { fontSize: 13, color: C.muted, lineHeight: 18 },
    connectBtn: {
      backgroundColor: C.accent,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    connectBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },

    // Peer cards
    peerCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginRight: 14,
      width: 180,
      borderWidth: 1,
      borderColor: C.border,
    },
    peerEmoji: { fontSize: 36, marginBottom: 8 },
    peerName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
    peerMeta: { fontSize: 12, color: C.muted, marginBottom: 2 },
    peerInterests: { fontSize: 12, color: C.accent, marginTop: 4 },
    peerScroll: { marginBottom: 8 },

    // Resource links
    resourceCard: {
      backgroundColor: C.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    resourceIcon: { fontSize: 22, marginRight: 12 },
    resourceTitle: { fontSize: 14, fontWeight: '600', color: C.text, flex: 1 },
    resourceArrow: { fontSize: 16, color: C.muted },

    // Emergency banner
    emergencyBanner: {
      backgroundColor: '#2c1a1a',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#e74c3c',
      marginTop: 8,
    },
    emergencyTitle: { fontSize: 16, fontWeight: '700', color: '#e74c3c', marginBottom: 12 },
    emergencyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    emergencyItem: { flex: 1, alignItems: 'center', marginHorizontal: 4 },
    emergencyFlag: { fontSize: 24, marginBottom: 4 },
    emergencyNumber: { fontSize: 18, fontWeight: '700', color: '#fff' },
    emergencyLabel: { fontSize: 11, color: '#e74c3c', marginTop: 2 },
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('villageNetwork.greeting')}</Text>
          <Text style={styles.title}>{t('villageNetwork.title')}</Text>
          <Text style={styles.subtitle}>{t('villageNetwork.subtitle')}</Text>
        </View>

        {/* SECTION A — Support Circle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('villageNetwork.supportCircle.title')}</Text>
          {SUPPORT_TYPES.map(support => (
            <View key={support.id} style={styles.supportCard}>
              <Text style={styles.supportIcon}>{support.icon}</Text>
              <View style={styles.supportInfo}>
                <Text style={styles.supportTitle}>{t(support.titleKey)}</Text>
                <Text style={styles.supportDesc}>{t(support.descKey)}</Text>
              </View>
              <TouchableOpacity style={styles.connectBtn} accessibilityLabel={t('villageNetwork.connect') || 'Connect'}>
                <Text style={styles.connectBtnText}>{t('villageNetwork.connect')}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* SECTION B — Community Matching */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('villageNetwork.community.title')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.peerScroll}>
            {MOCK_PEERS.map(peer => (
              <View key={peer.id} style={styles.peerCard}>
                <Text style={styles.peerEmoji}>{peer.emoji}</Text>
                <Text style={styles.peerName}>{peer.name}</Text>
                <Text style={styles.peerMeta}>{t('villageNetwork.profile.babyAge')}: {peer.babyAge}</Text>
                <Text style={styles.peerMeta}>{t('villageNetwork.profile.location')}: {peer.location}</Text>
                <Text style={styles.peerInterests}>{peer.interests}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* SECTION C — Resource Hub */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('villageNetwork.resourceHub.title')}</Text>
          {RESOURCE_LINKS.map(resource => (
            <TouchableOpacity
              key={resource.id}
              style={styles.resourceCard}
              onPress={() => resource.url && Linking.openURL(resource.url).catch(() => {})}
              accessibilityLabel={t(resource.titleKey)}
            >
              <Text style={styles.resourceIcon}>{resource.icon}</Text>
              <Text style={styles.resourceTitle}>{t(resource.titleKey)}</Text>
              <Text style={styles.resourceArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SECTION D — Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('villageNetwork.emergency.title')}</Text>
          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyTitle}>{t('villageNetwork.emergency.bannerTitle')}</Text>
            <View style={styles.emergencyRow}>
              {EMERGENCY_NUMBERS.map(item => (
                <View key={item.id} style={styles.emergencyItem}>
                  <Text style={styles.emergencyFlag}>{item.flag}</Text>
                  <Text style={styles.emergencyNumber}>{item.number}</Text>
                  <Text style={styles.emergencyLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

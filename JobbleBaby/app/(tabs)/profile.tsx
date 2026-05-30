import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BadgeGallery from '../components/BadgeGallery';
import { getBadgeCounts } from '../utils/badgeService';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';

interface BabyProfile {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
}

interface SettingRowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  isExport?: boolean;
  isLoading?: boolean;
  rowStyles: ReturnType<typeof StyleSheet.create>;
}

interface ThemeToggleRowProps {
  rowStyles: ReturnType<typeof StyleSheet.create>;
}

const STORAGE_KEYS = [
  '@jobble/tracking_entries',
  '@jobble/growth_entries',
  '@jobble/badges',
  '@jobble/schedule_entries',
];

function SettingRow({ icon, label, onPress, isLoading, rowStyles }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={rowStyles.container}
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={rowStyles.left}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#3B82F6" style={{ marginRight: 12 }} />
        ) : (
          <Text style={rowStyles.icon}>{icon}</Text>
        )}
        <Text style={rowStyles.label}>{label}</Text>
      </View>
      {onPress && <Text style={rowStyles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

function ThemeToggleRow({ rowStyles }: ThemeToggleRowProps) {
  const { toggleTheme, theme } = useTheme();
  const label = theme === 'system' ? 'Auto' : theme.charAt(0).toUpperCase() + theme.slice(1);
  return (
    <TouchableOpacity style={rowStyles.container} onPress={toggleTheme} activeOpacity={0.7}>
      <View style={rowStyles.left}>
        <Text style={rowStyles.icon}>🎨</Text>
        <Text style={rowStyles.label}>Theme</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[rowStyles.chevron, { textTransform: 'capitalize' }]}>{label}</Text>
        <Text style={rowStyles.chevron}> ⟳</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const [showBadges, setShowBadges] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({ earned: 0, total: 0 });
  const [isExportLoading, setIsExportLoading] = useState(false);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const rowStyles = StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 },
    left: { flexDirection: 'row', alignItems: 'center' },
    icon: { fontSize: 20, marginRight: 12 },
    label: { fontSize: 16, color: C.text, fontWeight: '500' },
    chevron: { fontSize: 20, color: C.muted },
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem('@jobble_baby_profile');
        if (stored) {
          setBabyProfile(JSON.parse(stored));
        }
      } catch {
        // ignore parse errors
      }
    };
    loadProfile();
  }, []);

  const getBabyAgeText = (): string => {
    if (!babyProfile?.birthDate) return '';
    try {
      const birth = new Date(babyProfile.birthDate);
      const now = new Date();
      const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      if (months < 24) return `${months} months old`;
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years} years ${remainingMonths} months old` : `${years} years old`;
    } catch {
      return '';
    }
  };

  const getGenderLabel = (): string => {
    if (!babyProfile?.gender) return '';
    switch (babyProfile.gender) {
      case 'boy': return 'Boy';
      case 'girl': return 'Girl';
      case 'prefer_not_to_say': return '';
      default: return '';
    }
  };

  const babyAge = getBabyAgeText();
  const genderLabel = getGenderLabel();
  const babyMeta = [babyAge, genderLabel].filter(Boolean).join(' · ');

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    header: { marginBottom: 20 },
    sectionTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    avatarCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: C.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    avatarInitials: { fontSize: 22, fontWeight: '800', color: C.background },
    parentInfo: { flex: 1 },
    parentName: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
    parentEmail: { fontSize: 14, color: C.muted },
    babyCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    babyHeader: { flexDirection: 'row', alignItems: 'center' },
    babyEmoji: { fontSize: 32, marginRight: 14 },
    babyName: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
    babyMeta: { fontSize: 14, color: C.muted },
    badgeButton: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    badgeButtonLeft: { flexDirection: 'row', alignItems: 'center' },
    badgeButtonIcon: { fontSize: 28, marginRight: 14 },
    badgeButtonTitle: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 2 },
    badgeButtonSubtitle: { fontSize: 12, color: C.accent },
    badgeButtonChevron: { fontSize: 18, color: C.muted },
    badgeGalleryWrap: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    settingsSection: { marginTop: 8, marginBottom: 24 },
    settingsLabel: { fontSize: 13, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    version: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 8 },
  });

  useEffect(() => {
    loadBadgeCounts();
  }, []);

  const loadBadgeCounts = async () => {
    const counts = await getBadgeCounts();
    setBadgeCounts(counts);
  };

  const handleExportData = async () => {
    setIsExportLoading(true);
    try {
      const exportData: Record<string, unknown> = {};
      for (const key of STORAGE_KEYS) {
        const raw = await AsyncStorage.getItem(key);
        exportData[key] = raw ? JSON.parse(raw) : null;
      }
      exportData['_exportedAt'] = new Date().toISOString();
      exportData['_appVersion'] = '1.0.0';

      const jsonStr = JSON.stringify(exportData, null, 2);
      await Share.share({
        message: jsonStr,
        title: 'Jobble Baby Data Export',
      });
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export data. Please try again.');
    } finally {
      setIsExportLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Parent Profile</Text>
        </View>

        {/* Avatar + Info */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>{babyProfile?.name ? babyProfile.name.charAt(0).toUpperCase() : 'B'}</Text>
          </View>
          <View style={styles.parentInfo}>
            <Text style={styles.parentName}>Jamie & Sam</Text>
            <Text style={styles.parentEmail}>jamie@jobble.app</Text>
          </View>
        </View>

        {/* Baby Profile Card */}
        <View style={styles.babyCard}>
          <View style={styles.babyHeader}>
            <Text style={styles.babyEmoji}>👶</Text>
            <View>
              <Text style={styles.babyName}>{babyProfile?.name || 'Baby'}</Text>
              <Text style={styles.babyMeta}>{babyMeta || 'Baby profile'}</Text>
            </View>
          </View>
        </View>

        {/* Badge Gallery Button */}
        <TouchableOpacity
          style={styles.badgeButton}
          activeOpacity={0.7}
          onPress={() => setShowBadges(!showBadges)}
        >
          <View style={styles.badgeButtonLeft}>
            <Text style={styles.badgeButtonIcon}>🏅</Text>
            <View>
              <Text style={styles.badgeButtonTitle}>Badge Collection</Text>
              <Text style={styles.badgeButtonSubtitle}>
                {badgeCounts.earned} of {badgeCounts.total} badges earned
              </Text>
            </View>
          </View>
          <Text style={styles.badgeButtonChevron}>{showBadges ? '↑' : '↓'}</Text>
        </TouchableOpacity>

        {/* Expandable Badge Gallery */}
        {showBadges && (
          <View style={styles.badgeGalleryWrap}>
            <BadgeGallery />
          </View>
        )}

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsLabel}>Settings</Text>
          <SettingRow icon="🔔" label="Notifications" rowStyles={rowStyles} />
          <SettingRow icon="📤" label="Data Export" onPress={handleExportData} isLoading={isExportLoading} rowStyles={rowStyles} />
          <ThemeToggleRow rowStyles={rowStyles} />
          <SettingRow icon="🔒" label="Privacy" rowStyles={rowStyles} />
          <SettingRow icon="ℹ️" label="About" rowStyles={rowStyles} />
          <SettingRow
            icon="🔄"
            label="Reset Profile"
            rowStyles={rowStyles}
            onPress={async () => {
              Alert.alert('Reset Profile', 'This will clear your baby profile and return to onboarding.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: async () => {
                    await AsyncStorage.removeItem('@jobble_baby_profile');
                  },
                },
              ]);
            }}
          />
        </View>

        {/* App version */}
        <Text style={styles.version}>Jobble Baby v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
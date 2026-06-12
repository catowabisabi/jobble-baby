import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Share, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDocumentAsync } from 'expo-document-picker';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { encodeDaycareToken, storeDaycareToken, getDaycareToken, getTokenDaysRemaining, isTokenExpired, DAYCARE_TOKEN_KEY } from '../utils/daycareToken';
import { useRouter } from 'expo-router';
import BadgeGallery from '../components/BadgeGallery';
import { getBadgeCounts } from '../utils/badgeService';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { useMonitorLink, MonitorApp } from '../hooks/useMonitorLink';

interface BabyProfile {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
  photoUri?: string;
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
  '@jobble_baby_profile',
  '@jobble/allergen_entries',
  '@jobble/milestones',
];

function SettingRow({ icon, label, onPress, isLoading, rowStyles }: SettingRowProps) {
  return (
    <TouchableOpacity
                    accessibilityLabel={label}
                    accessibilityHint={onPress ? `Opens ${label} settings` : undefined}
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
  const { t } = useLanguage();
  const label = theme === 'system' ? t('profile.auto') : t('profile.' + theme);
  return (
    <TouchableOpacity style={rowStyles.container} onPress={toggleTheme} activeOpacity={0.7} accessibilityLabel="Theme toggle" accessibilityHint="Changes app appearance theme">
      <View style={rowStyles.left}>
        <Text style={rowStyles.icon}>🎨</Text>
        <Text style={rowStyles.label}>{t('profile.theme')}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[rowStyles.chevron, { textTransform: 'capitalize' }]}>{label}</Text>
        <Text style={rowStyles.chevron}> ⟳</Text>
      </View>
    </TouchableOpacity>
  );
}

function LanguageToggleRow({ rowStyles }: { rowStyles: ReturnType<typeof StyleSheet.create> }) {
  const { t, language, toggleLanguage } = useLanguage();
  const label = language === 'en' ? 'English' : '繁體中文';
  return (
    <TouchableOpacity style={rowStyles.container} onPress={toggleLanguage} activeOpacity={0.7} accessibilityLabel="Language toggle" accessibilityHint="Changes app language">
      <View style={rowStyles.left}>
        <Text style={rowStyles.icon}>🌐</Text>
        <Text style={rowStyles.label}>{t('profile.language')}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[rowStyles.chevron, { textTransform: 'none' }]}>{label}</Text>
        <Text style={rowStyles.chevron}> ⟳</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const [showBadges, setShowBadges] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({ earned: 0, total: 0 });
  const [isExportLoading, setIsExportLoading] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [daycareLog, setDaycareLog] = useState<{ lastShared: string | null; expiresAt: number | null }>({ lastShared: null, expiresAt: null });
  const [preferredMonitorApp, setPreferredMonitorApp] = useState<MonitorApp | null>(null);
  const { getPreferredApp, setPreferredApp } = useMonitorLink();
  const { effectiveTheme } = useTheme();
  const { t, language, toggleLanguage } = useLanguage();
  const router = useRouter();
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
          const profile = JSON.parse(stored);
          setBabyProfile(profile);
          setPhotoUri(profile.photoUri || null);
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
    avatarPhoto: { width: 64, height: 64, borderRadius: 32 },
    changePhotoBtn: { position: 'absolute', bottom: -2, right: -2, width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }, // 44x44px touch target per WCAG 2.1 AA
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

  useEffect(() => {
    loadDaycareToken();
  }, []);

  useEffect(() => {
    const load = async () => {
      const app = await getPreferredApp();
      setPreferredMonitorApp(app);
    };
    load();
  }, [getPreferredApp]);

  const loadDaycareToken = async () => {
    try {
      const stored = await getDaycareToken();
      if (stored) {
        setDaycareLog({ lastShared: new Date(stored.createdAt).toLocaleDateString(), expiresAt: stored.expiresAt });
      }
    } catch { }
  };

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

  const handleImportData = async () => {
    setIsImportLoading(true);
    try {
      const result = await getDocumentAsync({ type: ['public.json'], copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        setIsImportLoading(false);
        return;
      }
      const file = result.assets[0];
      const content = await fetch(file.uri).then(r => r.text());
      if (!content.trim()) {
        Alert.alert(t('profile.importFailed') || 'Import Failed', 'Empty file.');
        setIsImportLoading(false);
        return;
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(content);
      } catch {
        Alert.alert(t('profile.importFailed') || 'Import Failed', 'Invalid backup file.');
        setIsImportLoading(false);
        return;
      }
      if (!parsed._exportedAt || !parsed._appVersion) {
        Alert.alert(t('profile.importFailed') || 'Import Failed', 'Missing metadata.');
        setIsImportLoading(false);
        return;
      }
      let count = 0;
      for (const key of Object.keys(parsed)) {
        if (key.startsWith('_')) continue;
        if (parsed[key] != null) {
          await AsyncStorage.setItem(key, JSON.stringify(parsed[key]));
          count++;
        }
      }
      Alert.alert(t('profile.importSuccess') || 'Import Successful', `Imported ${count} entries — restart app to see changes.`);
    } catch (e) {
      Alert.alert(t('profile.importFailed') || 'Import Failed', 'Could not import data. Please try again.');
    } finally {
      setIsImportLoading(false);
    }
  };

  const handleShareWithDaycare = async () => {
    try {
      const profileStr = await AsyncStorage.getItem('@jobble_baby_profile');
      if (!profileStr) return;
      const profile = JSON.parse(profileStr);
      const token = encodeDaycareToken(profile);
      await storeDaycareToken(token);
      const url = Linking.createURL('daycare/' + token);
      await Share.share({
        message: t('daycare.shareMessage', { url }),
        title: t('daycare.shareTitle'),
      });
      const stored = await getDaycareToken();
      if (stored) {
        setDaycareLog({ lastShared: new Date(stored.createdAt).toLocaleDateString(), expiresAt: stored.expiresAt });
      }
    } catch { }
  };

  const handleMonitorAppPress = async () => {
    const current = await getPreferredApp();
    Alert.alert(
      t('settings.monitorApp') || 'Monitor App',
      'Select your baby monitor app',
      [
        { text: 'Baby Monitor 3G', onPress: async () => { await setPreferredApp('baby-monitor-3g'); setPreferredMonitorApp('baby-monitor-3g'); } },
        { text: 'Cloud Baby Camera', onPress: async () => { await setPreferredApp('cloudbaby'); setPreferredMonitorApp('cloudbaby'); } },
        { text: 'Nanit', onPress: async () => { await setPreferredApp('nanit'); setPreferredMonitorApp('nanit'); } },
        { text: 'Other', onPress: async () => { await setPreferredApp('other'); setPreferredMonitorApp('other'); } },
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleChangePhoto = async () => {
    Alert.alert(
      t('profile.changePhoto'),
      '',
      [
        {
          text: t('profile.takePhoto'),
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Camera access is required to take photos.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
            if (result.canceled || !result.assets?.[0]) return;
            const uri = result.assets[0].uri;
            const updatedProfile: BabyProfile = { ...(babyProfile || { name: '', birthDate: '', gender: 'prefer_not_to_say' }), photoUri: uri };
            await AsyncStorage.setItem('@jobble_baby_profile', JSON.stringify(updatedProfile));
            setBabyProfile(updatedProfile);
            setPhotoUri(uri);
          },
        },
        {
          text: t('profile.chooseLibrary'),
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Photo library access is required to select photos.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
            if (result.canceled || !result.assets?.[0]) return;
            const uri = result.assets[0].uri;
            const updatedProfile: BabyProfile = { ...(babyProfile || { name: '', birthDate: '', gender: 'prefer_not_to_say' }), photoUri: uri };
            await AsyncStorage.setItem('@jobble_baby_profile', JSON.stringify(updatedProfile));
            setBabyProfile(updatedProfile);
            setPhotoUri(uri);
          },
        },
        {
          text: t('profile.removePhoto'),
          style: 'destructive',
          onPress: async () => {
            if (!babyProfile) return;
            const { photoUri: _, ...rest } = babyProfile;
            const updatedProfile: BabyProfile = rest as BabyProfile;
            await AsyncStorage.setItem('@jobble_baby_profile', JSON.stringify(updatedProfile));
            setBabyProfile(updatedProfile);
            setPhotoUri(null);
          },
        },
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>{t('profile.parentProfile')}</Text>
        </View>

        {/* Avatar + Info */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarPhoto} />
            ) : (
              <Text style={styles.avatarInitials}>{babyProfile?.name ? babyProfile.name.charAt(0).toUpperCase() : 'B'}</Text>
            )}
<TouchableOpacity style={styles.changePhotoBtn} onPress={handleChangePhoto} activeOpacity={0.7} accessibilityLabel="Change baby photo" accessibilityHint="Opens options to take or select a new baby photo">
              <MaterialCommunityIcons name="camera" size={12} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.parentInfo}>
            <Text style={styles.parentName}>{t('profile.parentName')}</Text>
            <Text style={styles.parentEmail}>{t('profile.parentEmail')}</Text>
          </View>
        </View>

        {/* Baby Profile Card */}
        <View style={styles.babyCard}>
          <View style={styles.babyHeader}>
            <Text style={styles.babyEmoji}>👶</Text>
            <View>
              <Text style={styles.babyName}>{babyProfile?.name || t('profile.babyName')}</Text>
              <Text style={styles.babyMeta}>{babyMeta || t('profile.babyProfile')}</Text>
            </View>
          </View>
        </View>

        {/* Badge Gallery Button */}
        <TouchableOpacity
                        accessibilityLabel="Badge collection"
                        accessibilityHint="Opens or closes the badge collection gallery"
          style={styles.badgeButton}
          activeOpacity={0.7}
          onPress={() => setShowBadges(!showBadges)}
        >
          <View style={styles.badgeButtonLeft}>
            <Text style={styles.badgeButtonIcon}>🏅</Text>
            <View>
              <Text style={styles.badgeButtonTitle}>{t('profile.badgeCollection')}</Text>
              <Text style={styles.badgeButtonSubtitle}>
                {t('profile.earnedOf', { earned: badgeCounts.earned, total: badgeCounts.total })}
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
          <Text style={styles.settingsLabel}>{t('profile.settings')}</Text>
          <SettingRow icon="🔔" label={t('profile.notifications')} rowStyles={rowStyles} />
          <SettingRow
            icon="📹"
            label={t('settings.monitorApp') || 'Monitor App'}
            onPress={handleMonitorAppPress}
            rowStyles={rowStyles}
          />
          <SettingRow
            icon="🔗"
            label={t('settings.monitorIntegration') || 'Monitor Integration'}
            rowStyles={rowStyles}
          />
          <SettingRow icon="📤" label={t('profile.exportData')} onPress={handleExportData} isLoading={isExportLoading} rowStyles={rowStyles} />
          <SettingRow icon="📥" label={t('profile.importData')} onPress={handleImportData} isLoading={isImportLoading} rowStyles={rowStyles} />
          <SettingRow icon="🔗" label={t('daycare.shareButton')} onPress={handleShareWithDaycare} rowStyles={rowStyles} />
          <ThemeToggleRow rowStyles={rowStyles} />
          <LanguageToggleRow rowStyles={rowStyles} />
          <SettingRow icon="🏥" label={t('profile.doctorVisit')} onPress={() => router.push('/doctor-visit')} rowStyles={rowStyles} />
          <SettingRow icon="🔒" label={t('profile.privacy')} onPress={() => Linking.openURL('https://jobblebaby.com/privacy')} rowStyles={rowStyles} />
          <SettingRow icon="ℹ️" label={t('profile.about')} rowStyles={rowStyles} />
          <SettingRow
            icon="🔄"
            label={t('profile.resetProfile')}
            rowStyles={rowStyles}
            onPress={async () => {
              Alert.alert(t('profile.resetConfirmTitle'), t('profile.resetConfirmMessage'), [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('profile.reset'),
                  style: 'destructive',
                  onPress: async () => {
                    await AsyncStorage.removeItem('@jobble_baby_profile');
                  },
                },
              ]);
            }}
          />
        </View>

        {/* Daycare Access Log */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>{t('daycare.accessLog')}</Text>
          <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: daycareLog.expiresAt && !isTokenExpired(daycareLog.expiresAt) ? '#22C55E' : '#9CA3AF', marginRight: 8 }} />
              <Text style={{ color: C.text, fontSize: 14 }}>
                {daycareLog.expiresAt && !isTokenExpired(daycareLog.expiresAt) 
                  ? t('daycare.active') 
                  : t('daycare.inactive')}
              </Text>
            </View>
            <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{t('daycare.lastShared')}</Text>
            <Text style={{ color: C.text, fontSize: 14, marginBottom: 8 }}>{daycareLog.lastShared || t('daycare.neverShared')}</Text>
            {daycareLog.expiresAt && !isTokenExpired(daycareLog.expiresAt) && (
              <>
                <Text style={{ color: C.muted, fontSize: 12, marginBottom: 4 }}>{t('daycare.status')}</Text>
                <Text style={{ color: C.accent, fontSize: 14 }}>
                  {t('daycare.expiresIn', { days: getTokenDaysRemaining(daycareLog.expiresAt) })}
                </Text>
              </>
            )}
            {daycareLog.expiresAt && isTokenExpired(daycareLog.expiresAt) && (
              <Text style={{ color: '#EF4444', fontSize: 14 }}>{t('daycare.expired')}</Text>
            )}
          </View>
        </View>

        {/* App version */}
        <Text style={styles.version}>{t('profile.version', { version: '1.0.0' })}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

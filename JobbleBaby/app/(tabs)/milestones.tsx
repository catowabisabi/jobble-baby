import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Image, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/app/utils/SafeStorage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { onNewGrowthEntry, awardBadge } from '../utils/badgeService';
import { STORAGE_KEYS } from '../../store/storage-keys';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_COLS = 2;
const GRID_GAP = 12;
const PHOTO_SIZE = (SCREEN_W - 40 - GRID_GAP) / GRID_COLS;

const MILESTONE_TYPES = [
  { id: 'first_smile', labelKey: 'firstSmile', icon: 'emoticon-happy' },
  { id: 'first_steps', labelKey: 'firstSteps', icon: 'human-child' },
  { id: 'first_word', labelKey: 'firstWord', icon: 'comment-text' },
  { id: 'first_food', labelKey: 'firstFood', icon: 'food-apple' },
  { id: 'custom', labelKey: 'custom', icon: 'star' },
];

const STORAGE_KEY = STORAGE_KEYS.MILESTONE_PHOTOS;
const BRAIN_BUILDER_KEY = STORAGE_KEYS.BRAIN_BUILDER_WEEK;

interface BabyProfile {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'prefer_not_to_say';
}

interface MilestonePhoto {
  id: string;
  type: string;
  photo_uri: string;
  baby_age: string;
  date: string;
  height?: number;
  weight?: number;
  percentile?: number;
}

// WHO/AAP Developmental Windows
const DEV_WINDOWS = [
  { key: '0-2', minMonths: 0, maxMonths: 2, name: '0-2 months' },
  { key: '2-4', minMonths: 2, maxMonths: 4, name: '2-4 months' },
  { key: '4-6', minMonths: 4, maxMonths: 6, name: '4-6 months' },
  { key: '6-9', minMonths: 6, maxMonths: 9, name: '6-9 months' },
  { key: '9-12', minMonths: 9, maxMonths: 12, name: '9-12 months' },
  { key: '12-18', minMonths: 12, maxMonths: 18, name: '12-18 months' },
];

function getBabyAgeInMonths(birthDateStr: string): string {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const months = Math.floor(totalDays / 30.44);
    const days = totalDays % 30;
    if (months === 0) return `${days} days`;
    if (days === 0) return `${months} months`;
    return `${months}m ${days}d`;
  } catch {
    return '?';
  }
}

function getDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getBabyAgeMonths(birthDateStr: string): number {
  try {
    const birth = new Date(birthDateStr);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    return Math.floor(totalDays / 30.44);
  } catch {
    return 0;
  }
}

function getDevWindow(months: number): typeof DEV_WINDOWS[0] | null {
  for (const win of DEV_WINDOWS) {
    if (months >= win.minMonths && months < win.maxMonths) return win;
  }
  if (months >= 18) return DEV_WINDOWS[DEV_WINDOWS.length - 1];
  return null;
}

function getDaysUntilWindowClose(months: number): number | null {
  for (const win of DEV_WINDOWS) {
    if (months >= win.minMonths && months < win.maxMonths) {
      const windowEndDays = win.maxMonths * 30.44;
      const currentDays = months * 30.44;
      return Math.floor(windowEndDays - currentDays);
    }
  }
  return null;
}

export default function MilestonesScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [photos, setPhotos] = useState<MilestonePhoto[]>([]);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [selectedType, setSelectedType] = useState(MILESTONE_TYPES[0]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [brainBuilderDone, setBrainBuilderDone] = useState<Set<string>>(new Set());
  const [babyMonths, setBabyMonths] = useState<number>(0);
  const [badgeEarned, setBadgeEarned] = useState(false);

  useEffect(() => {
    loadPhotos();
    loadProfile();
    loadBrainBuilder();
    checkMilestoneReminder();
  }, []);

  const loadBrainBuilder = async () => {
    try {
      const stored = await AsyncStorage.getItem('@jobble_baby_profile');
      if (stored) {
        const profile: BabyProfile = JSON.parse(stored);
        if (profile.birthDate) {
          const months = getBabyAgeMonths(profile.birthDate);
          setBabyMonths(months);
        }
      }
      const raw = await AsyncStorage.getItem(BRAIN_BUILDER_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const today = getDateStr();
        if (data.weekStart === today.split('T')[0].substring(0, 7)) {
          setBrainBuilderDone(new Set(data.doneDays || []));
          setBadgeEarned(data.badgeEarned || false);
        }
      }
    } catch { /* ignore */ }
  };

  const checkMilestoneReminder = async () => {
    try {
      const profileRaw = await AsyncStorage.getItem('@jobble_baby_profile');
      if (!profileRaw) return;
      const profile: BabyProfile = JSON.parse(profileRaw);
      if (!profile.birthDate) return;
      const birth = new Date(profile.birthDate);
      const now = new Date();
      const totalDays = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      const months = totalDays / 30.44;
      // Show first smile reminder at 4-6 weeks (28-42 days)
      if (totalDays >= 28 && totalDays <= 56) {
        const milestonesRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const existing: MilestonePhoto[] = milestonesRaw ? JSON.parse(milestonesRaw) : [];
        const hasSmile = existing.some(p => p.type === 'first_smile');
        if (!hasSmile) setShowReminder(true);
      }
      // Show first food reminder at 5-7 months (150-210 days)
      if (months >= 5 && months <= 7) {
        const milestonesRaw = await AsyncStorage.getItem(STORAGE_KEY);
        const existing: MilestonePhoto[] = milestonesRaw ? JSON.parse(milestonesRaw) : [];
        const hasFood = existing.some(p => p.type === 'first_food');
        if (!hasFood && totalDays > 150) setShowReminder(true);
      }
    } catch { /* ignore */ }
  };

  const loadPhotos = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setPhotos(JSON.parse(raw));
    } catch { /* ignore */ }
  };

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem('@jobble_baby_profile');
      if (stored) setBabyProfile(JSON.parse(stored));
    } catch { /* ignore */ }
  };

  const markBrainBuilderDone = async () => {
    const today = getDateStr();
    const newDone = new Set(brainBuilderDone);
    newDone.add(today);
    setBrainBuilderDone(newDone);

    const count = newDone.size;
    let earned = badgeEarned;
    if (count >= 5 && !earned) {
      earned = true;
      setBadgeEarned(true);
      await awardBadge('brain_builder');
    }

    try {
      await AsyncStorage.setItem(BRAIN_BUILDER_KEY, JSON.stringify({
        weekStart: today.substring(0, 7),
        doneDays: Array.from(newDone),
        badgeEarned: earned,
      }));
    } catch { /* ignore */ }
  };

  const captureMilestone = async () => {
    setIsCapturing(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('milestones.permissionNeeded'), t('milestones.cameraAccessRequired'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const photoUri = result.assets[0].uri;
      const babyAge = babyProfile?.birthDate
        ? getBabyAgeInMonths(babyProfile.birthDate)
        : '?';
      const dateStr = getDateStr();

      // Load latest growth data for percentile if available
      let height: number | undefined;
      let weight: number | undefined;
      try {
        const growthRaw = await AsyncStorage.getItem(STORAGE_KEYS.GROWTH_ENTRIES);
        if (growthRaw) {
          const entries = JSON.parse(growthRaw);
          if (entries.length > 0) {
            height = entries[0].height;
            weight = entries[0].weight;
          }
        }
      } catch { /* ignore */ }

      const newPhoto: MilestonePhoto = {
        id: Date.now().toString(),
        type: selectedType.id,
        photo_uri: photoUri,
        baby_age: babyAge,
        date: dateStr,
        height,
        weight,
      };

      const updated = [newPhoto, ...photos];
      setPhotos(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Trigger badge check
      await onNewGrowthEntry();
    } catch (e) {
      Alert.alert(t('milestones.captureError'), t('milestones.captureErrorMessage'));
    } finally {
      setIsCapturing(false);
    }
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    typeSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    },
    typeChipActive: { backgroundColor: C.accent, borderColor: C.accent },
    typeChipText: { fontSize: 13, color: C.muted },
    typeChipTextActive: { color: C.text, fontWeight: '600' },
    captureBtn: {
      backgroundColor: C.accent,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginBottom: 24,
    },
    captureBtnDisabled: { opacity: 0.6 },
    captureBtnText: { fontSize: 16, fontWeight: '600', color: C.text },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12 },
    galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
    photoCard: {
      width: PHOTO_SIZE,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
    },
    photo: { width: PHOTO_SIZE, height: PHOTO_SIZE * 1.2, backgroundColor: C.border },
    photoOverlay: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 6,
    },
    photoTypeIcon: {
      position: 'absolute', top: 8, right: 8,
      backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: 4,
    },
    reminderBanner: {
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 12,
    },
    reminderTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
    reminderBody: { fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
    reminderBtn: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    },
    reminderBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
    photoAge: { fontSize: 12, fontWeight: '600', color: '#fff' },
    photoDate: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
    emptyCard: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE * 1.2,
      borderRadius: 12,
      borderWidth: 2, borderStyle: 'dashed', borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyText: { fontSize: 12, color: C.muted, marginTop: 8, textAlign: 'center' },
    emptyIcon: { color: C.muted },
    // Brain Builder styles
    brainBuilderSection: {
      backgroundColor: '#6D28D9',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    brainBuilderHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
    },
    brainBuilderIcon: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 12,
      padding: 8,
    },
    brainBuilderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    brainBuilderSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    windowTag: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: 'flex-start',
      marginBottom: 12,
    },
    windowTagText: { fontSize: 11, color: '#fff', fontWeight: '600' },
    weeklyFocusCard: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    weeklyFocusLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
    weeklyFocusTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
    weeklyFocusText: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
    dailyPromptCard: {
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    dailyPromptLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
    dailyPromptText: { fontSize: 14, fontWeight: '600', color: '#fff', lineHeight: 20 },
    completeBtn: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    completeBtnText: { fontSize: 15, fontWeight: '700', color: '#6D28D9' },
    completedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    progressText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
    criticalBanner: {
      backgroundColor: '#EF4444',
      borderRadius: 8,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    criticalText: { fontSize: 12, fontWeight: '600', color: '#fff', flex: 1 },
    badgeCard: {
      backgroundColor: '#F59E0B',
      borderRadius: 10,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badgeCardText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  });

  const typeIcon = (typeId: string) =>
    MILESTONE_TYPES.find(t => t.id === typeId)?.icon || 'star';

  // Brain Builder logic
  const devWindow = getDevWindow(babyMonths);
  const daysLeft = getDaysUntilWindowClose(babyMonths);
  const today = getDateStr();
  const isDoneToday = brainBuilderDone.has(today);
  const isCritical = daysLeft !== null && daysLeft <= 14 && daysLeft > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('milestones.greeting')}</Text>
          <Text style={styles.title}>🏆 {t('milestones.title')}</Text>
        </View>

        {/* Brain Builder Section */}
        {devWindow && (
          <View style={styles.brainBuilderSection}>
            <View style={styles.brainBuilderHeader}>
              <View style={styles.brainBuilderIcon}>
                <MaterialCommunityIcons name="brain" size={24} color="#fff" />
              </View>
              <View>
                <Text style={styles.brainBuilderTitle}>{t('brainBuilder.title')}</Text>
                <Text style={styles.brainBuilderSubtitle}>{t('brainBuilder.subtitle')}</Text>
              </View>
            </View>

            <View style={styles.windowTag}>
              <Text style={styles.windowTagText}>{devWindow.name}</Text>
            </View>

            {/* Critical period alert */}
            {isCritical && (
              <View style={styles.criticalBanner}>
                <MaterialCommunityIcons name="alert" size={16} color="#fff" />
                <Text style={styles.criticalText}>{t('brainBuilder.windowCloses', { days: daysLeft })}</Text>
              </View>
            )}

            {/* Weekly Focus */}
            <View style={styles.weeklyFocusCard}>
              <Text style={styles.weeklyFocusLabel}>{t('brainBuilder.weeklyFocus')}</Text>
              <Text style={styles.weeklyFocusTitle}>
                {t(`brainBuilder.windows.${devWindow.key}.title`)}
              </Text>
              <Text style={styles.weeklyFocusText}>
                {t(`brainBuilder.windows.${devWindow.key}.focus`)}
              </Text>
            </View>

            {/* Daily Prompt */}
            <View style={styles.dailyPromptCard}>
              <Text style={styles.dailyPromptLabel}>{t('brainBuilder.dailyPrompt')}</Text>
              <Text style={styles.dailyPromptText}>
                {t(`brainBuilder.windows.${devWindow.key}.prompt`)}
              </Text>
            </View>

            {/* Complete button */}
            <TouchableOpacity
              accessibilityLabel={isDoneToday ? "Brain builder activity completed today" : "Complete brain builder activity for today"}
              accessibilityHint={isDoneToday ? "You've already completed today's activity" : "Mark today's brain building activity as complete"}
              style={[styles.completeBtn, { minHeight: 44, minWidth: 44 }]}
              onPress={markBrainBuilderDone}
              activeOpacity={0.8}
            >
              <View style={styles.completedRow}>
                <MaterialCommunityIcons
                  name={isDoneToday ? "check-circle" : "circle-outline"}
                  size={20}
                  color={isDoneToday ? "#6D28D9" : "#6D28D9"}
                />
                <Text style={styles.completeBtnText}>
                  {isDoneToday ? t('brainBuilder.completed') : t('brainBuilder.completeBtn')}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.progressText}>
              {t('brainBuilder.progress', { count: brainBuilderDone.size })}
            </Text>

            {/* Badge earned */}
            {badgeEarned && (
              <View style={[styles.badgeCard, { marginTop: 12 }]}>
                <MaterialCommunityIcons name="trophy" size={18} color="#fff" />
                <Text style={styles.badgeCardText}>{t('brainBuilder.badgeEarned')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Milestone Type Selector */}
        <Text style={styles.sectionTitle}>{t('milestones.milestoneType')}</Text>
        <View style={styles.typeSelector}>
          {MILESTONE_TYPES.map((type) => (
            <TouchableOpacity
              accessibilityLabel={`Select ${t(`milestones.${type.labelKey}`)} milestone type`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedType.id === type.id }}
              key={type.id}
              style={[
                styles.typeChip,
                selectedType.id === type.id && styles.typeChipActive,
                { minHeight: 44, minWidth: 44 },
              ]}
              onPress={() => setSelectedType(type)}
            >
              <MaterialCommunityIcons
                name={type.icon as any}
                size={14}
                color={selectedType.id === type.id ? C.text : C.muted}
              />
              <Text
                style={[
                  styles.typeChipText,
                  selectedType.id === type.id && styles.typeChipTextActive,
                ]}
              >
                {t(`milestones.${type.labelKey}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Milestone Reminder Banner */}
        {showReminder && (
          <View style={[styles.reminderBanner, { backgroundColor: '#3B82F6' }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>{t('milestoneReminder.title')}</Text>
              <Text style={styles.reminderBody}>{t('milestoneReminder.firstSmileBody')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowReminder(false)}
                style={[styles.reminderBtn, { minHeight: 44, minWidth: 44 }]}
                accessibilityLabel="Dismiss reminder"
              >
                <Text style={styles.reminderBtnText}>{t('milestoneReminder.dismiss')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowReminder(false); captureMilestone(); }}
                style={[styles.reminderBtn, { backgroundColor: '#fff', minHeight: 44, minWidth: 44 }]}
                accessibilityLabel="Capture milestone photo now"
              >
                <Text style={[styles.reminderBtnText, { color: '#3B82F6' }]}>{t('milestoneReminder.capture')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Capture Button */}
        <TouchableOpacity
          accessibilityLabel={`Capture ${t(`milestones.${selectedType.labelKey}`)} milestone photo`}
          accessibilityHint="Opens the camera to take a photo for this milestone"
          style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled, { minHeight: 44 }]}
          onPress={captureMilestone}
          disabled={isCapturing}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="camera" size={24} color={C.text} />
          <Text style={styles.captureBtnText}>
            {isCapturing ? t('common.loading') : t('milestones.captureWithName', { name: t(`milestones.${selectedType.labelKey}`) })}
          </Text>
        </TouchableOpacity>

        {/* Gallery */}
        <Text style={styles.sectionTitle}>
          {photos.length > 0 ? t('milestones.milestoneCount', { count: photos.length, plural: photos.length > 1 ? 's' : '' }) : t('milestones.gallery')}
        </Text>
        <View style={styles.galleryGrid}>
          {photos.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="image-plus" size={40} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>{t('milestones.noMilestones')}{'\n'}{t('milestones.captureFirst')}</Text>
            </View>
          ) : (
            photos.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image source={{ uri: photo.photo_uri }} style={styles.photo} />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoAge}>{photo.baby_age}</Text>
                  <Text style={styles.photoDate}>{photo.date}</Text>
                </View>
                <View style={styles.photoTypeIcon}>
                  <MaterialCommunityIcons
                    name={typeIcon(photo.type) as any}
                    size={14}
                    color="#fff"
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

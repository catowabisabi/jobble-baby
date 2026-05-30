import { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Image, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { onNewGrowthEntry } from '../utils/badgeService';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_COLS = 2;
const GRID_GAP = 12;
const PHOTO_SIZE = (SCREEN_W - 40 - GRID_GAP) / GRID_COLS;

const MILESTONE_TYPES = [
  { id: 'first_smile', label: 'First Smile', icon: 'emoticon-happy' },
  { id: 'first_steps', label: 'First Steps', icon: 'human-child' },
  { id: 'first_word', label: 'First Word', icon: 'comment-text' },
  { id: 'first_food', label: 'First Food', icon: 'food-apple' },
  { id: 'custom', label: 'Custom', icon: 'star' },
];

const STORAGE_KEY = '@jobble/milestone_photos';

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

export default function MilestonesScreen() {
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [photos, setPhotos] = useState<MilestonePhoto[]>([]);
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [selectedType, setSelectedType] = useState(MILESTONE_TYPES[0]);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    loadPhotos();
    loadProfile();
  }, []);

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

  const captureMilestone = async () => {
    setIsCapturing(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to capture milestones.');
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
        const growthRaw = await AsyncStorage.getItem('@jobble/growth_entries');
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
      Alert.alert('Error', 'Failed to capture milestone photo.');
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
    photoAge: { fontSize: 12, fontWeight: '600', color: '#fff' },
    photoDate: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
    photoTypeIcon: {
      position: 'absolute', top: 6, right: 6,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 12, padding: 4,
    },
    emptyCard: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE * 1.2,
      borderRadius: 12,
      borderWidth: 2, borderStyle: 'dashed', borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    emptyText: { fontSize: 12, color: C.muted, marginTop: 8, textAlign: 'center' },
    emptyIcon: { color: C.muted },
  });

  const typeIcon = (typeId: string) =>
    MILESTONE_TYPES.find(t => t.id === typeId)?.icon || 'star';

  const typeLabel = (typeId: string) =>
    MILESTONE_TYPES.find(t => t.id === typeId)?.label || 'Custom';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Memory</Text>
          <Text style={styles.title}>🏆 Milestones</Text>
        </View>

        {/* Milestone Type Selector */}
        <Text style={styles.sectionTitle}>Milestone Type</Text>
        <View style={styles.typeSelector}>
          {MILESTONE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeChip,
                selectedType.id === type.id && styles.typeChipActive,
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
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Capture Button */}
        <TouchableOpacity
          style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
          onPress={captureMilestone}
          disabled={isCapturing}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="camera" size={24} color={C.text} />
          <Text style={styles.captureBtnText}>
            {isCapturing ? 'Opening Camera...' : `Capture ${selectedType.label}`}
          </Text>
        </TouchableOpacity>

        {/* Gallery */}
        <Text style={styles.sectionTitle}>
          {photos.length > 0 ? `${photos.length} Milestone${photos.length > 1 ? 's' : ''}` : 'Gallery'}
        </Text>
        <View style={styles.galleryGrid}>
          {photos.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="image-plus" size={40} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No milestones yet{'\n'}Capture your first moment!</Text>
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

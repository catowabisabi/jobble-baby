import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';

const STORAGE_KEY = '@jobble/montage_projects';
const SETTINGS_KEY = '@jobble/montage_settings';

interface MontageProject {
  id: string;
  createdAt: string;
  photoUris: string[];
  milestoneOverlayEnabled: boolean;
  outputUri?: string;
  status: 'draft' | 'generating' | 'done';
}

interface MontageSettings {
  defaultDurationSec: number;
  milestoneBadgeStyle: 'minimal' | 'colorful' | 'classic';
}

const DEFAULT_SETTINGS: MontageSettings = {
  defaultDurationSec: 30,
  milestoneBadgeStyle: 'colorful',
};

export default function GrowthMontageScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme] || COLORS.light;

  const [projects, setProjects] = useState<MontageProject[]>([]);
  const [settings, setSettings] = useState<MontageSettings>(DEFAULT_SETTINGS);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [badge, setBadge] = useState<string | null>(null);

  const screenW = Dimensions.get('window').width;
  const photoSize = (screenW - 48) / 3;

  useEffect(() => {
    loadData();
    checkBadge();
  }, []);

  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setProjects(JSON.parse(stored));
      const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (storedSettings) setSettings(JSON.parse(storedSettings));
    } catch (e) { /* silently fail */ }
  };

  const saveProjects = async (newProjects: MontageProject[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
      setProjects(newProjects);
    } catch (e) { /* silently fail */ }
  };

  const checkBadge = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const projects: MontageProject[] = JSON.parse(stored);
        const sharedCount = projects.filter(p => p.outputUri).length;
        if (sharedCount >= 3) setBadge('Memory Keeper');
      }
    } catch (e) {}
  };

  const startNewMontage = () => {
    Alert.alert(
      t('growthMontage.newMontage') || 'New Growth Montage',
      t('growthMontage.photoSelectInfo') || 'Photo selection would open the device gallery. For now, add sample photo URIs to test the flow.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('growthMontage.addSample') || 'Add Sample Photos',
          onPress: () => addSamplePhotos(),
        },
      ]
    );
  };

  const addSamplePhotos = async () => {
    const sampleUris = [
      'file:///sample/baby_1.jpg',
      'file:///sample/baby_2.jpg',
      'file:///sample/baby_3.jpg',
      'file:///sample/baby_4.jpg',
      'file:///sample/baby_5.jpg',
    ];
    const newProject: MontageProject = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      photoUris: sampleUris,
      milestoneOverlayEnabled: true,
      status: 'draft',
    };
    const newProjects = [newProject, ...projects];
    await saveProjects(newProjects);
    setSelectedPhotos(sampleUris);
  };

  const generateMontage = async (projectId: string) => {
    setIsGenerating(true);
    try {
      // Simulate video generation (real implementation would use ffmpeg/expo-video)
      await new Promise(resolve => setTimeout(resolve, 2000));
      const updated = projects.map(p =>
        p.id === projectId ? { ...p, status: 'done' as const, outputUri: 'file:///generated/montage.mp4' } : p
      );
      await saveProjects(updated);
      checkBadge();
      Alert.alert(t('growthMontage.generated') || 'Montage Generated', t('growthMontage.generatedDesc') || 'Your growth montage has been created and saved to your photo library.');
    } catch (e) {
      Alert.alert('Error', 'Failed to generate montage');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    Alert.alert(
      t('growthMontage.deleteConfirm') || 'Delete Montage?',
      t('growthMontage.deleteConfirmDesc') || 'This cannot be undone.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('common.confirm') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = projects.filter(p => p.id !== projectId);
            await saveProjects(updated);
          },
        },
      ]
    );
  };

  const sharedCount = projects.filter(p => p.outputUri).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.text }]}>{t('tabs.growthMontage') || 'Growth Montage'}</Text>
          <Text style={[styles.subtitle, { color: C.muted }]}>
            {t('growthMontage.subtitle') || 'Create time-lapse videos from baby photos'}
          </Text>
        </View>

        {/* Badge */}
        {badge && (
          <View style={[styles.badgeCard, { backgroundColor: C.accent + '20', borderColor: C.accent }]}>
            <Text style={styles.badgeEmoji}>🎬</Text>
            <Text style={[styles.badgeTitle, { color: C.accent }]}>{badge}</Text>
            <Text style={[styles.badgeDesc, { color: C.muted }]}>
              {t('growthMontage.badgeDesc') || 'Created and shared 3 montages'}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={[styles.statsCard, { backgroundColor: C.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: C.accent }]}>{projects.length}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>{t('growthMontage.totalMontages') || 'Total Montages'}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: C.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: C.accent }]}>{sharedCount}</Text>
            <Text style={[styles.statLabel, { color: C.muted }]}>{t('growthMontage.shared') || 'Shared'}</Text>
          </View>
        </View>

        {/* New Montage Button */}
        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: C.accent }]}
          onPress={startNewMontage}
          accessibilityLabel={t('growthMontage.newMontage') || 'Create new growth montage'}
        >
          <Text style={styles.newButtonIcon}>+</Text>
          <Text style={styles.newButtonText}>{t('growthMontage.newMontage') || 'Create New Montage'}</Text>
        </TouchableOpacity>

        {/* Projects List */}
        <View style={[styles.projectsCard, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            {t('growthMontage.recentProjects') || 'Recent Projects'}
          </Text>
          {projects.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>
              {t('growthMontage.noProjects') || 'No montages yet. Create your first one!'}
            </Text>
          ) : (
            projects.map(project => (
              <View key={project.id} style={[styles.projectItem, { borderBottomColor: C.border }]}>
                {/* Photo strip */}
                <View style={styles.photoStrip}>
                  {project.photoUris.slice(0, 5).map((uri, i) => (
                    <View key={i} style={[styles.photoThumb, { backgroundColor: C.border }]}>
                      <Text style={[styles.photoThumbText, { color: C.muted }]}>{i + 1}</Text>
                    </View>
                  ))}
                  {project.photoUris.length > 5 && (
                    <Text style={[styles.morePhotos, { color: C.muted }]}>+{project.photoUris.length - 5}</Text>
                  )}
                </View>
                <View style={styles.projectInfo}>
                  <Text style={[styles.projectDate, { color: C.text }]}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.projectStatus, { color: project.status === 'done' ? '#2ecc71' : C.muted }]}>
                    {project.status === 'done' ? (t('growthMontage.done') || '✓ Generated') : project.status === 'generating' ? (t('growthMontage.generating') || '⋯ Generating') : (t('growthMontage.draft') || 'Draft')}
                  </Text>
                </View>
                <View style={styles.projectActions}>
                  {project.status === 'draft' && (
                    <TouchableOpacity
                      style={[styles.generateButton, { backgroundColor: C.accent }]}
                      onPress={() => generateMontage(project.id)}
                      disabled={isGenerating}
                      accessibilityLabel={t('growthMontage.generate') || 'Generate montage'}
                    >
                      <Text style={styles.generateButtonText}>
                        {isGenerating ? (t('growthMontage.generating') || '⋯') : (t('growthMontage.generate') || 'Generate')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: '#e74c3c' }]}
                    onPress={() => deleteProject(project.id)}
                    accessibilityLabel={t('growthMontage.delete') || 'Delete'}
                  >
                    <Text style={[styles.deleteButtonText, { color: '#e74c3c' }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: C.accent + '15', borderColor: C.accent + '40' }]}>
          <Text style={[styles.infoTitle, { color: C.text }]}>💡 {t('growthMontage.howItWorks') || 'How It Works'}</Text>
          <Text style={[styles.infoText, { color: C.muted }]}>
            {t('growthMontage.howItWorksDesc') || '1. Select baby photos from your gallery{0}2. Add milestone badges{0}3. Generate time-lapse video{0}4. Share with family & friends{0}{0}All processing happens on your device — no uploads.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// SafeAreaView fallback for Android
function SafeAreaView({ children, style }: { children: React.ReactNode; style?: any }) {
  const { Platform } = require('react-native');
  if (Platform.OS === 'ios') {
    const { SafeAreaView: RNSAV } = require('react-native');
    return <RNSAV style={style}>{children}</RNSAV>;
  }
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  badgeCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, alignItems: 'center' },
  badgeEmoji: { fontSize: 32, marginBottom: 8 },
  badgeTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  badgeDesc: { fontSize: 14 },
  statsCard: { borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  newButton: { borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  newButtonIcon: { fontSize: 24, marginRight: 8, color: '#fff' },
  newButtonText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  projectsCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  projectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  photoStrip: { flexDirection: 'row', marginRight: 12 },
  photoThumb: { width: 36, height: 36, borderRadius: 6, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  photoThumbText: { fontSize: 12, fontWeight: '600' },
  morePhotos: { fontSize: 12, alignSelf: 'center', marginLeft: 4 },
  projectInfo: { flex: 1 },
  projectDate: { fontSize: 14, fontWeight: '500' },
  projectStatus: { fontSize: 12, marginTop: 2 },
  projectActions: { flexDirection: 'row', alignItems: 'center' },
  generateButton: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  generateButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteButton: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  deleteButtonText: { fontSize: 12, fontWeight: '600' },
  infoCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  infoTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  infoText: { fontSize: 13, lineHeight: 20 },
});
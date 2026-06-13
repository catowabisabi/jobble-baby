import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

type SafetyStatus = 'safe' | 'unsafe' | 'na';

const STORAGE_KEY = STORAGE_KEYS.HOME_SAFETY_AUDIT;

const HAZARD_SEVERITY: { [key: string]: number } = {
  poison: 1,
  drowning: 2,
  strangulation: 3,
  burn: 4,
  fall: 5,
  choking: 6,
};

const ROOMS = [
  {
    id: 'kitchen',
    titleKey: 'homeSafety.rooms.kitchen',
    icon: 'silverware-fork-knife',
    items: [
      { id: 'stove_protection', labelKey: 'homeSafety.items.stoveKnobCover', hazard: 'burn' },
      { id: 'cabinet_locks', labelKey: 'homeSafety.items.cabinetChildLock', hazard: 'poison' },
      { id: 'outlet_covers', labelKey: 'homeSafety.items.outletCovers', hazard: 'strangulation' },
      { id: 'sharp_objects', labelKey: 'homeSafety.items.knifeStorage', hazard: 'choking' },
    ],
  },
  {
    id: 'bathroom',
    titleKey: 'homeSafety.rooms.bathroom',
    icon: 'shower',
    items: [
      { id: 'water_temp', labelKey: 'homeSafety.items.waterTemp', hazard: 'burn' },
      { id: 'toilet_lock', labelKey: 'homeSafety.items.toiletLock', hazard: 'drowning' },
      { id: 'slip_mat', labelKey: 'homeSafety.items.slipMat', hazard: 'fall' },
      { id: 'medicine_cabinet', labelKey: 'homeSafety.items.medicineCabinet', hazard: 'poison' },
    ],
  },
  {
    id: 'nursery',
    titleKey: 'homeSafety.rooms.nursery',
    icon: 'bed',
    items: [
      { id: 'crib_safety', labelKey: 'homeSafety.items.cribSafety', hazard: 'strangulation' },
      { id: 'furniture_anchors', labelKey: 'homeSafety.items.furnitureAnchors', hazard: 'fall' },
      { id: 'window_cords', labelKey: 'homeSafety.items.windowCords', hazard: 'strangulation' },
      { id: 'smoke_detector', labelKey: 'homeSafety.items.smokeDetector', hazard: 'burn' },
    ],
  },
  {
    id: 'living_room',
    titleKey: 'homeSafety.rooms.livingRoom',
    icon: 'sofa',
    items: [
      { id: 'tv_secure', labelKey: 'homeSafety.items.tvSecure', hazard: 'fall' },
      { id: 'corner_covers', labelKey: 'homeSafety.items.cornerCovers', hazard: 'fall' },
      { id: 'small_objects', labelKey: 'homeSafety.items.smallObjects', hazard: 'choking' },
      { id: 'plant_safe', labelKey: 'homeSafety.items.plantSafe', hazard: 'poison' },
    ],
  },
  {
    id: 'stairs',
    titleKey: 'homeSafety.rooms.stairs',
    icon: 'staircase',
    items: [
      { id: 'stair_gates_top', labelKey: 'homeSafety.items.stairGatesTop', hazard: 'fall' },
      { id: 'stair_gates_bottom', labelKey: 'homeSafety.items.stairGatesBottom', hazard: 'fall' },
      { id: 'step_visibility', labelKey: 'homeSafety.items.stepVisibility', hazard: 'fall' },
      { id: 'handrail', labelKey: 'homeSafety.items.handrail', hazard: 'fall' },
    ],
  },
  {
    id: 'outdoors',
    titleKey: 'homeSafety.rooms.outdoors',
    icon: 'tree',
    items: [
      { id: 'pool_fence', labelKey: 'homeSafety.items.poolFence', hazard: 'drowning' },
      { id: 'fence_height', labelKey: 'homeSafety.items.fenceHeight', hazard: 'fall' },
      { id: 'outdoor_chemicals', labelKey: 'homeSafety.items.outdoorChemicals', hazard: 'poison' },
      { id: 'shade_water', labelKey: 'homeSafety.items.shadeWater', hazard: 'burn' },
    ],
  },
];

const TIPS: { [key: string]: string } = {
  stove_protection: 'homeSafety.tips.stoveKnobCover',
  cabinet_locks: 'homeSafety.tips.cabinetChildLock',
  outlet_covers: 'homeSafety.tips.outletCovers',
  sharp_objects: 'homeSafety.tips.knifeStorage',
  water_temp: 'homeSafety.tips.waterTemp',
  toilet_lock: 'homeSafety.tips.toiletLock',
  slip_mat: 'homeSafety.tips.slipMat',
  medicine_cabinet: 'homeSafety.tips.medicineCabinet',
  crib_safety: 'homeSafety.tips.cribSafety',
  furniture_anchors: 'homeSafety.tips.furnitureAnchors',
  window_cords: 'homeSafety.tips.windowCords',
  smoke_detector: 'homeSafety.tips.smokeDetector',
  tv_secure: 'homeSafety.tips.tvSecure',
  corner_covers: 'homeSafety.tips.cornerCovers',
  small_objects: 'homeSafety.tips.smallObjects',
  plant_safe: 'homeSafety.tips.plantSafe',
  stair_gates_top: 'homeSafety.tips.stairGatesTop',
  stair_gates_bottom: 'homeSafety.tips.stairGatesBottom',
  step_visibility: 'homeSafety.tips.stepVisibility',
  handrail: 'homeSafety.tips.handrail',
  pool_fence: 'homeSafety.tips.poolFence',
  fence_height: 'homeSafety.tips.fenceHeight',
  outdoor_chemicals: 'homeSafety.tips.outdoorChemicals',
  shade_water: 'homeSafety.tips.shadeWater',
};

interface StoredData {
  answers: { [room: string]: { [item: string]: SafetyStatus } };
  lastAuditDate: string;
  roomsCompleted: string[];
}

export default function HomeSafetyScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [answers, setAnswers] = useState<{ [room: string]: { [item: string]: SafetyStatus } }>({});
  const [lastAuditDate, setLastAuditDate] = useState<string | null>(null);
  const [roomsCompleted, setRoomsCompleted] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'audit' | 'alerts' | 'tips'>('audit');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredData = JSON.parse(stored);
        setAnswers(data.answers || {});
        setLastAuditDate(data.lastAuditDate || null);
        setRoomsCompleted(data.roomsCompleted || []);
      }
    } catch (e) { /* ignore */ }
  }

  async function saveData() {
    try {
      const data: StoredData = {
        answers,
        lastAuditDate: lastAuditDate || new Date().toISOString(),
        roomsCompleted,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  function toggleStatus(roomId: string, itemId: string) {
    setAnswers(prev => {
      const current = prev[roomId]?.[itemId] || 'safe';
      const next: SafetyStatus = current === 'safe' ? 'unsafe' : current === 'unsafe' ? 'na' : 'safe';
      const newAnswers = { ...prev, [roomId]: { ...prev[roomId], [itemId]: next } };

      const roomItems = ROOMS.find(r => r.id === roomId)?.items || [];
      const allAnswered = roomItems.every(item => newAnswers[roomId]?.[item.id] !== undefined);
      const newRoomsCompleted = allAnswered && !roomsCompleted.includes(roomId)
        ? [...roomsCompleted, roomId]
        : roomsCompleted;

      setRoomsCompleted(newRoomsCompleted);
      setLastAuditDate(new Date().toISOString());

      return newAnswers;
    });
    saveData();
  }

  function calculateScore(): number {
    let safe = 0, total = 0;
    for (const room of ROOMS) {
      for (const item of room.items) {
        const status = answers[room.id]?.[item.id];
        if (status !== undefined && status !== 'na') {
          total++;
          if (status === 'safe') safe++;
        }
      }
    }
    return total > 0 ? Math.round((safe / total) * 100) : 0;
  }

  function getScoreColor(score: number): string {
    if (score < 50) return '#ef4444';
    if (score < 80) return '#f59e0b';
    return '#22c55e';
  }

  function getUnsafeItems(): Array<{ room: string; item: typeof ROOMS[0]['items'][0]; severity: number }> {
    const unsafeItems: Array<{ room: string; item: typeof ROOMS[0]['items'][0]; severity: number }> = [];
    for (const room of ROOMS) {
      for (const item of room.items) {
        if (answers[room.id]?.[item.id] === 'unsafe') {
          unsafeItems.push({
            room: room.titleKey,
            item,
            severity: HAZARD_SEVERITY[item.hazard] || 99,
          });
        }
      }
    }
    return unsafeItems.sort((a, b) => a.severity - b.severity);
  }

  function getRoomIcon(iconName: string): string {
    const iconMap: { [key: string]: string } = {
      'silverware-fork-knife': '🍴',
      'shower': '🚿',
      'bed': '🛏️',
      'sofa': '🛋️',
      'staircase': '🪜',
      'tree': '🌳',
    };
    return iconMap[iconName] || '📍';
  }

  const score = calculateScore();
  const unsafeItems = getUnsafeItems();
  const totalRooms = ROOMS.length;
  const completedRooms = roomsCompleted.length;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { padding: 16, paddingTop: 60 },
    title: { fontSize: 24, fontWeight: 'bold', color: C.text },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
    scoreCard: {
      margin: 16,
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
    },
    scoreLabel: { fontSize: 14, color: C.muted, marginBottom: 8 },
    scoreValue: { fontSize: 48, fontWeight: 'bold', color: getScoreColor(score) },
    scoreUnit: { fontSize: 18, color: getScoreColor(score) },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 12 },
    progressLabel: { fontSize: 12, color: C.muted },
    progressValue: { fontSize: 12, color: C.text, fontWeight: '600' },
    tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 8 },
    tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: C.card },
    tabBtnActive: { backgroundColor: C.accent },
    tabBtnText: { fontSize: 13, color: C.muted, fontWeight: '500' },
    tabBtnTextActive: { color: '#fff', fontWeight: '600' },
    roomCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    roomHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    roomIcon: { fontSize: 24, marginRight: 10 },
    roomName: { fontSize: 16, fontWeight: '600', color: C.text, flex: 1 },
    roomProgress: { fontSize: 12, color: C.muted },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
    itemLabel: { fontSize: 14, color: C.text, flex: 1, marginRight: 8 },
    toggleGroup: { flexDirection: 'row', gap: 6 },
    statusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
    statusBtnActive: { borderColor: 'transparent' },
    statusText: { fontSize: 11, fontWeight: '600' },
    alertCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
    alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    alertBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
    alertBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    alertTitle: { fontSize: 14, fontWeight: '600', color: '#991b1b' },
    alertTip: { fontSize: 13, color: '#7f1d1d', marginTop: 4 },
    tipCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    tipTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 4 },
    tipText: { fontSize: 13, color: C.muted },
    noAlerts: { textAlign: 'center', padding: 24, color: '#22c55e', fontSize: 14 },
    linkRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 8, marginBottom: 16 },
    linkBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
    linkText: { fontSize: 12, color: C.accent, fontWeight: '500' },
    reminderCard: { marginHorizontal: 16, marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: C.accent + '18', borderWidth: 1, borderColor: C.accent + '44' },
    reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reminderLabel: { fontSize: 12, color: C.muted },
    reminderValue: { fontSize: 12, color: C.text, fontWeight: '600' },
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('homeSafety.title')}</Text>
        <Text style={styles.subtitle}>{t('homeSafety.subtitle')}</Text>
      </View>

      <View style={[styles.scoreCard, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={styles.scoreLabel}>{t('homeSafety.score')}</Text>
        <Text style={[styles.scoreValue, { color: getScoreColor(score) }]}>{score}</Text>
        <Text style={[styles.scoreUnit, { color: getScoreColor(score) }]}>%</Text>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{t('homeSafety.roomsCompleted')}</Text>
          <Text style={styles.progressValue}>{completedRooms}/{totalRooms}</Text>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>{t('homeSafety.lastAudit')}</Text>
          <Text style={styles.progressValue}>
            {lastAuditDate ? new Date(lastAuditDate).toLocaleDateString() : '-'}
          </Text>
        </View>
      </View>

      {lastAuditDate && (
        <View style={styles.reminderCard}>
          <View style={styles.reminderRow}>
            <Text style={styles.reminderLabel}>{t('homeSafety.nextReminder')}</Text>
            <Text style={styles.reminderValue}>30 / 60 / 90 days</Text>
          </View>
        </View>
)}

      {activeTab === 'audit' && (
        <>
          {ROOMS.map(room => {
            const roomAnswers = answers[room.id] || {};
            const roomAnsweredCount = room.items.filter(i => roomAnswers[i.id] !== undefined).length;
            return (
              <View key={room.id} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <Text style={styles.roomIcon}>{getRoomIcon(room.icon)}</Text>
                  <Text style={styles.roomName}>{t(room.titleKey)}</Text>
                  <Text style={styles.roomProgress}>{roomAnsweredCount}/{room.items.length}</Text>
                </View>
                {room.items.map(item => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemLabel}>{t(item.labelKey)}</Text>
                    <View style={styles.toggleGroup}>
                      {(['safe', 'unsafe', 'na'] as SafetyStatus[]).map(status => (
                        <TouchableOpacity
                          key={status}
                          accessibilityLabel={t(`homeSafety.status.${status}`)}
                          accessibilityRole="button"
                          style={[
                            styles.statusBtn,
                            roomAnswers[item.id] === status && styles.statusBtnActive,
                            roomAnswers[item.id] === status && {
                              backgroundColor: status === 'safe' ? '#22c55e' : status === 'unsafe' ? '#ef4444' : '#9ca3af',
                            },
                          ]}
                          onPress={() => toggleStatus(room.id, item.id)}
                        >
                          <Text style={[styles.statusText, { color: roomAnswers[item.id] === status ? '#fff' : C.muted }]}>
                            {t(`homeSafety.status.${status}`)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </>
      )}

      {activeTab === 'alerts' && (
        <>
          {unsafeItems.length === 0 ? (
            <Text style={styles.noAlerts}>{t('homeSafety.noUnsafeItems')}</Text>
          ) : (
            unsafeItems.map(({ room, item }) => (
              <View key={`${room}-${item.id}`} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertBadge}>
                    <Text style={styles.alertBadgeText}>{item.hazard.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.alertTitle}>{t(item.labelKey)}</Text>
                </View>
                <Text style={styles.alertTip}>{t(TIPS[item.id])}</Text>
              </View>
            ))
          )}
        </>
      )}

      {activeTab === 'tips' && (
        <>
          {unsafeItems.length === 0 ? (
            <Text style={styles.noAlerts}>{t('homeSafety.noUnsafeItems')}</Text>
          ) : (
            unsafeItems.map(({ item }) => (
              <View key={`tip-${item.id}`} style={styles.tipCard}>
                <Text style={styles.tipTitle}>{t(item.labelKey)}</Text>
                <Text style={styles.tipText}>{t(TIPS[item.id])}</Text>
              </View>
            ))
          )}
        </>
      )}

      <View style={styles.linkRow}>
        <Link href="/teething" asChild>
          <TouchableOpacity style={styles.linkBtn} accessibilityLabel="Teething">
            <Text style={styles.linkText}>🦷 {t('tabs.teething')}</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/sleep-training" asChild>
          <TouchableOpacity style={styles.linkBtn} accessibilityLabel="Sleep Training">
            <Text style={styles.linkText}>🌙 {t('tabs.sleepTraining')}</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/growth" asChild>
          <TouchableOpacity style={styles.linkBtn} accessibilityLabel="Growth">
            <Text style={styles.linkText}>📈 {t('tabs.growth')}</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
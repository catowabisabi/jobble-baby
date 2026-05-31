import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS, STATUS_COLORS } from '../theme';
import { saveStash, loadStash, saveTimer, loadTimer, clearTimer } from '../utils/milkPrepStorage';

interface MilkBag {
  id: string;
  volumeMl: number;
  freezeDate: string;
  expiryDate: string;
}

interface MilkTimer {
  startedAt: number;
  durationMs: number;
  location: 'room' | 'fridge';
}

type ThawMethod = 'fridge' | 'warmWater' | 'runningWater';
type ThawVerdict = 'safe' | 'caution' | 'unsafe';

const THAW_LIMITS: Record<ThawMethod, { safe: number; caution: number }> = {
  fridge: { safe: 12 * 60, caution: 24 * 60 },
  warmWater: { safe: 60, caution: 120 },
  runningWater: { safe: 30, caution: 120 },
};

const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getDaysUntilExpiry = (expiryDate: string): number => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getExpiryBadgeColor = (days: number): string => {
  if (days < 0) return '#9e9e9e';
  if (days < 7) return STATUS_COLORS.error;
  if (days <= 30) return STATUS_COLORS.warning;
  return STATUS_COLORS.good;
};

export default function MilkPrepScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [thawMethod, setThawMethod] = useState<ThawMethod>('fridge');
  const [elapsedMinutes, setElapsedMinutes] = useState<string>('');

  const [milkBags, setMilkBags] = useState<MilkBag[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBagVolume, setNewBagVolume] = useState<string>('');
  const [newBagFreezeDate, setNewBagFreezeDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [prepDay, setPrepDay] = useState<string>(new Date().toISOString().split('T')[0]);
  const [portions, setPortions] = useState<string>('');
  const [batchSchedule, setBatchSchedule] = useState<{ date: string; bag: MilkBag }[]>([]);

  const [timer, setTimer] = useState<MilkTimer | null>(null);
  const [timerDisplay, setTimerDisplay] = useState<string>('--:--');
  const [timerExpired, setTimerExpired] = useState(false);

  const [expandedTips, setExpandedTips] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initStash = async () => {
      const bags = await loadStash();
      setMilkBags(bags);
    };
    initStash();
  }, []);

  useEffect(() => {
    const initTimer = async () => {
      const savedTimer = await loadTimer();
      if (savedTimer) {
        const elapsed = Date.now() - savedTimer.startedAt;
        if (elapsed < savedTimer.durationMs) {
          setTimer(savedTimer);
          setTimerExpired(false);
        } else {
          setTimerExpired(true);
        }
      }
    };
    initTimer();
  }, []);

  useEffect(() => {
    if (!timer) {
      setTimerDisplay('--:--');
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - timer.startedAt;
      const remaining = timer.durationMs - elapsed;
      if (remaining <= 0) {
        setTimerDisplay('00:00');
        setTimerExpired(true);
        setTimer(null);
      } else {
        setTimerDisplay(formatCountdown(remaining));
        setTimerExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const getThawVerdict = useCallback((): ThawVerdict | null => {
    if (!elapsedMinutes) return null;
    const mins = parseInt(elapsedMinutes, 10);
    if (isNaN(mins)) return null;
    const limits = THAW_LIMITS[thawMethod];
    if (mins < limits.safe) return 'safe';
    if (mins < limits.caution) return 'caution';
    return 'unsafe';
  }, [thawMethod, elapsedMinutes]);

  const getThawExplanation = useCallback((): string => {
    const verdict = getThawVerdict();
    if (!verdict) return '';
    if (verdict === 'safe') return t('milkPrep.safeExplain');
    if (verdict === 'caution') return t('milkPrep.cautionExplain');
    return t('milkPrep.unsafeExplain');
  }, [getThawVerdict, t]);

  const handleSaveStash = async (bags: MilkBag[]) => {
    setMilkBags(bags);
    await saveStash(bags);
  };

  const addMilkBag = async () => {
    const volume = parseInt(newBagVolume, 10);
    if (isNaN(volume) || volume <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid volume');
      return;
    }
    const freezeDateObj = new Date(newBagFreezeDate);
    const expiryDateObj = new Date(freezeDateObj);
    expiryDateObj.setMonth(expiryDateObj.getMonth() + 6);
    const newBag: MilkBag = {
      id: Date.now().toString(),
      volumeMl: volume,
      freezeDate: newBagFreezeDate,
      expiryDate: expiryDateObj.toISOString().split('T')[0],
    };
    const updated = [...milkBags, newBag];
    await handleSaveStash(updated);
    setShowAddModal(false);
    setNewBagVolume('');
    setNewBagFreezeDate(new Date().toISOString().split('T')[0]);
  };

  const deleteMilkBag = async (id: string) => {
    const updated = milkBags.filter((bag) => bag.id !== id);
    await handleSaveStash(updated);
  };

  const generateBatchSchedule = () => {
    if (milkBags.length === 0) {
      setBatchSchedule([]);
      return;
    }
    const numPortions = parseInt(portions, 10);
    if (isNaN(numPortions) || numPortions <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid number of portions');
      return;
    }
    const sorted = [...milkBags].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    const schedule: { date: string; bag: MilkBag }[] = [];
    const prepDate = new Date(prepDay);
    for (let i = 0; i < Math.min(numPortions, 14); i++) {
      const dayDate = new Date(prepDate);
      dayDate.setDate(dayDate.getDate() + i);
      const bagIndex = i % sorted.length;
      schedule.push({
        date: dayDate.toISOString().split('T')[0],
        bag: sorted[bagIndex],
      });
    }
    setBatchSchedule(schedule);
  };

  const startTimer = async (location: 'room' | 'fridge') => {
    const durationMs = location === 'room' ? 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
    const newTimer: MilkTimer = {
      startedAt: Date.now(),
      durationMs,
      location,
    };
    setTimer(newTimer);
    setTimerExpired(false);
    await saveTimer(newTimer);
  };

  const stopTimer = async () => {
    setTimer(null);
    setTimerDisplay('--:--');
    setTimerExpired(false);
    await clearTimer();
  };

  const toggleTip = (key: string) => {
    setExpandedTips((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    sectionTitle: {
      fontSize: 12, color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
      marginBottom: 12, marginTop: 24,
    },
    card: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 16,
    },
    methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    methodButton: {
      flex: 1, borderRadius: 12, padding: 12, alignItems: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    methodButtonActive: { backgroundColor: C.accent, borderColor: C.accent },
    methodButtonText: { fontSize: 12, fontWeight: '600', color: C.text },
    methodButtonTextActive: { color: '#fff' },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    input: {
      flex: 1, backgroundColor: C.background, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 16,
    },
    inputLabel: { fontSize: 14, color: C.muted },
    verdictBadge: {
      borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16,
      alignSelf: 'flex-start', marginTop: 12,
    },
    verdictText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    verdictExplain: { fontSize: 13, color: C.muted, marginTop: 8 },
    addBagButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderRadius: 12, paddingVertical: 14, gap: 8,
    },
    addBagButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    bagCard: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    bagHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bagVolume: { fontSize: 16, fontWeight: '600', color: C.text },
    bagBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
    bagBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
    bagDates: { flexDirection: 'row', gap: 16, marginTop: 8 },
    bagDateText: { fontSize: 12, color: C.muted },
    deleteButton: { padding: 4 },
    emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: {
      backgroundColor: C.card, borderRadius: 16, padding: 20,
      borderWidth: 1, borderColor: C.border,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 16 },
    modalLabel: { fontSize: 14, color: C.muted, marginBottom: 8 },
    modalInput: {
      backgroundColor: C.background, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 16, marginBottom: 16,
    },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalButton: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
    modalButtonCancel: { backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
    modalButtonSave: { backgroundColor: C.accent },
    modalButtonText: { fontSize: 14, fontWeight: '600', color: C.text },
    modalButtonTextSave: { color: '#fff' },
    batchInputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    batchInput: {
      flex: 1, backgroundColor: C.background, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: C.border, color: C.text, fontSize: 16,
    },
    generateButton: {
      borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    },
    generateButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    scheduleItem: {
      backgroundColor: C.background, borderRadius: 8, padding: 12, marginBottom: 8,
      borderWidth: 1, borderColor: C.border,
    },
    scheduleDate: { fontSize: 13, color: C.muted },
    scheduleBag: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: 4 },
    timerRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    timerButton: {
      flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    },
    timerButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    timerDisplay: { fontSize: 48, fontWeight: '700', color: C.text, textAlign: 'center', marginVertical: 16 },
    timerStatus: { fontSize: 14, color: C.muted, textAlign: 'center' },
    expiredBanner: {
      backgroundColor: STATUS_COLORS.error, borderRadius: 12, padding: 16, marginBottom: 16,
    },
    expiredText: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center' },
    stopButton: {
      borderRadius: 12, paddingVertical: 12, alignItems: 'center',
      borderWidth: 1, borderColor: STATUS_COLORS.error,
    },
    stopButtonText: { fontSize: 14, fontWeight: '600', color: STATUS_COLORS.error },
    tipItem: {
      backgroundColor: C.card, borderRadius: 12, marginBottom: 8,
      borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    },
    tipHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    tipTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
    tipChevron: { fontSize: 16, color: C.muted },
    tipBody: { padding: 16, paddingTop: 0, fontSize: 13, color: C.muted, lineHeight: 20 },
  });

  const verdict = getThawVerdict();
  const sortedBags = [...milkBags].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{t('milkPrep.greeting')}</Text>
          <Text style={styles.title}>{t('milkPrep.title')}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('milkPrep.thawTitle')}</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>{t('milkPrep.thawMethod')}</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.methodButton, thawMethod === 'fridge' && styles.methodButtonActive]}
              onPress={() => setThawMethod('fridge')}
            >
              <Text style={[styles.methodButtonText, thawMethod === 'fridge' && styles.methodButtonTextActive]}>
                {t('milkPrep.thawFridge')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, thawMethod === 'warmWater' && styles.methodButtonActive]}
              onPress={() => setThawMethod('warmWater')}
            >
              <Text style={[styles.methodButtonText, thawMethod === 'warmWater' && styles.methodButtonTextActive]}>
                {t('milkPrep.thawWarmWater')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodButton, thawMethod === 'runningWater' && styles.methodButtonActive]}
              onPress={() => setThawMethod('runningWater')}
            >
              <Text style={[styles.methodButtonText, thawMethod === 'runningWater' && styles.methodButtonTextActive]}>
                {t('milkPrep.thawRunningWater')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>{t('milkPrep.elapsedMinutes')}</Text>
          <TextInput
            style={styles.input}
            value={elapsedMinutes}
            onChangeText={setElapsedMinutes}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.muted}
          />
          {verdict && (
            <View style={[styles.verdictBadge, { backgroundColor: STATUS_COLORS[verdict === 'safe' ? 'good' : verdict === 'caution' ? 'warning' : 'error'] }]}>
              <Text style={styles.verdictText}>{t(`milkPrep.${verdict}`)}</Text>
            </View>
          )}
          {verdict && <Text style={styles.verdictExplain}>{getThawExplanation()}</Text>}
        </View>

        <Text style={styles.sectionTitle}>{t('milkPrep.stashTitle')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.addBagButton, { backgroundColor: C.accent }]}
            onPress={() => setShowAddModal(true)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.addBagButtonText}>{t('milkPrep.addBag')}</Text>
          </TouchableOpacity>
          {sortedBags.length === 0 ? (
            <Text style={styles.emptyText}>{t('milkPrep.noBags')}</Text>
          ) : (
            sortedBags.map((bag) => {
              const daysLeft = getDaysUntilExpiry(bag.expiryDate);
              const badgeColor = getExpiryBadgeColor(daysLeft);
              return (
                <View key={bag.id} style={styles.bagCard}>
                  <View style={styles.bagHeader}>
                    <Text style={styles.bagVolume}>{t('milkPrep.volumeMl', { vol: bag.volumeMl })}</Text>
                    <View style={[styles.bagBadge, { backgroundColor: badgeColor }]}>
                      <Text style={styles.bagBadgeText}>
                        {daysLeft < 0 ? t('milkPrep.expired') : t('milkPrep.expiresIn', { days: daysLeft })}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteMilkBag(bag.id)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={STATUS_COLORS.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bagDates}>
                    <Text style={styles.bagDateText}>{t('milkPrep.frozenOn')}: {formatDate(bag.freezeDate)}</Text>
                    <Text style={styles.bagDateText}>{t('milkPrep.expiresOn')}: {formatDate(bag.expiryDate)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('milkPrep.batchTitle')}</Text>
        <View style={styles.card}>
          <View style={styles.batchInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('milkPrep.prepDay')}</Text>
              <TextInput
                style={styles.batchInput}
                value={prepDay}
                onChangeText={setPrepDay}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('milkPrep.portions')}</Text>
              <TextInput
                style={styles.batchInput}
                value={portions}
                onChangeText={setPortions}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.muted}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: C.accent }]}
            onPress={generateBatchSchedule}
          >
            <Text style={styles.generateButtonText}>{t('milkPrep.generateSchedule')}</Text>
          </TouchableOpacity>
          {milkBags.length === 0 && (
            <Text style={styles.emptyText}>{t('milkPrep.noBagsAvailable')}</Text>
          )}
          {batchSchedule.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={styles.inputLabel}>{t('milkPrep.scheduleFor')}</Text>
              {batchSchedule.map((item, index) => (
                <View key={index} style={styles.scheduleItem}>
                  <Text style={styles.scheduleDate}>{formatDate(item.date)}</Text>
                  <Text style={styles.scheduleBag}>{t('milkPrep.useBagOn', { date: formatDate(item.date) })} — {t('milkPrep.volumeMl', { vol: item.bag.volumeMl })}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('milkPrep.timerTitle')}</Text>
        <View style={styles.card}>
          {!timer && !timerExpired && (
            <View style={styles.timerRow}>
              <TouchableOpacity
                style={[styles.timerButton, { backgroundColor: C.accent }]}
                onPress={() => startTimer('room')}
              >
                <Text style={styles.timerButtonText}>{t('milkPrep.startRoomTemp')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timerButton, { backgroundColor: C.accent }]}
                onPress={() => startTimer('fridge')}
              >
                <Text style={styles.timerButtonText}>{t('milkPrep.startFridge')}</Text>
              </TouchableOpacity>
            </View>
          )}
          {timer && (
            <>
              <Text style={styles.timerDisplay}>{timerDisplay}</Text>
              <Text style={styles.timerStatus}>{t('milkPrep.timerRunning')}</Text>
              <TouchableOpacity style={[styles.stopButton, { marginTop: 16 }]} onPress={stopTimer}>
                <Text style={styles.stopButtonText}>{t('milkPrep.stopTimer')}</Text>
              </TouchableOpacity>
            </>
          )}
          {timerExpired && (
            <>
              <View style={styles.expiredBanner}>
                <Text style={styles.expiredText}>{t('milkPrep.timerExpired')}</Text>
              </View>
              <TouchableOpacity style={styles.stopButton} onPress={stopTimer}>
                <Text style={styles.stopButtonText}>{t('milkPrep.stopTimer')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>{t('milkPrep.tipsTitle')}</Text>
        <View style={styles.card}>
          {[
            { key: 'refreeze', title: t('milkPrep.tipRefreezeTitle'), body: t('milkPrep.tipRefreezeBody') },
            { key: 'transport', title: t('milkPrep.tipTransportTitle'), body: t('milkPrep.tipTransportBody') },
            { key: 'addFresh', title: t('milkPrep.tipAddFreshTitle'), body: t('milkPrep.tipAddFreshBody') },
          ].map((tip) => (
            <View key={tip.key} style={styles.tipItem}>
              <TouchableOpacity style={styles.tipHeader} onPress={() => toggleTip(tip.key)}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <MaterialCommunityIcons
                  name={expandedTips[tip.key] ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={C.muted}
                />
              </TouchableOpacity>
              {expandedTips[tip.key] && <Text style={styles.tipBody}>{tip.body}</Text>}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('milkPrep.addBag')}</Text>
            <Text style={styles.modalLabel}>{t('milkPrep.volume')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newBagVolume}
              onChangeText={setNewBagVolume}
              keyboardType="numeric"
              placeholder="120"
              placeholderTextColor={C.muted}
            />
            <Text style={styles.modalLabel}>{t('milkPrep.frozenOn')}</Text>
            <TextInput
              style={styles.modalInput}
              value={newBagFreezeDate}
              onChangeText={setNewBagFreezeDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.muted}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={addMilkBag}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

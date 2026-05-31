import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

interface CareLogEntry {
  id: string;
  type: 'feeding' | 'sleep' | 'diaper' | 'medicine' | 'note';
  caregiver: string;
  timestamp: string;
  details: {
    subType?: string;
    note?: string;
    medicineName?: string;
    dosage?: string;
  };
}

interface HandoverNote {
  id: string;
  fromCaregiver: string;
  toCaregiver: string;
  timestamp: string;
  note: string;
  wasRead: boolean;
}

interface ShiftState {
  activeCaregiver: 'PA' | 'PB';
  lastSwitchTimestamp: string;
}

const SHIFT_LOG_KEY = '@jobble/shift_log';
const SHIFT_STATE_KEY = '@jobble/shift_state';
const HANDOVER_NOTES_KEY = '@jobble/handover_notes';

export default function ShiftHandoff() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [shiftState, setShiftState] = useState<ShiftState>({ activeCaregiver: 'PA', lastSwitchTimestamp: new Date().toISOString() });
  const [careLog, setCareLog] = useState<CareLogEntry[]>([]);
  const [handoverNotes, setHandoverNotes] = useState<HandoverNote[]>([]);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverNoteText, setHandoverNoteText] = useState('');
  const [pendingSwitch, setPendingSwitch] = useState<'PA' | 'PB' | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState<CareLogEntry['type']>('note');
  const [entrySubType, setEntrySubType] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [entryMedicineName, setEntryMedicineName] = useState('');
  const [entryDosage, setEntryDosage] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [shiftRaw, logRaw, notesRaw] = await Promise.all([
          AsyncStorage.getItem(SHIFT_STATE_KEY),
          AsyncStorage.getItem(SHIFT_LOG_KEY),
          AsyncStorage.getItem(HANDOVER_NOTES_KEY),
        ]);
        if (shiftRaw) setShiftState(JSON.parse(shiftRaw));
        if (logRaw) setCareLog(JSON.parse(logRaw));
        if (notesRaw) setHandoverNotes(JSON.parse(notesRaw));
      } catch {
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const markAsRead = async () => {
      try {
        const currentCaregiver = shiftState.activeCaregiver;
        const updatedNotes = handoverNotes.map((note) => {
          if (note.toCaregiver === currentCaregiver && !note.wasRead) {
            return { ...note, wasRead: true };
          }
          return note;
        });
        if (JSON.stringify(updatedNotes) !== JSON.stringify(handoverNotes)) {
          setHandoverNotes(updatedNotes);
          await AsyncStorage.setItem(HANDOVER_NOTES_KEY, JSON.stringify(updatedNotes));
        }
      } catch {
      }
    };
    if (handoverNotes.length > 0) {
      markAsRead();
    }
  }, [shiftState.activeCaregiver]);

  const saveShiftState = async (state: ShiftState) => {
    setShiftState(state);
    try {
      await AsyncStorage.setItem(SHIFT_STATE_KEY, JSON.stringify(state));
    } catch {
    }
  };

  const saveCareLog = async (log: CareLogEntry[]) => {
    setCareLog(log);
    try {
      await AsyncStorage.setItem(SHIFT_LOG_KEY, JSON.stringify(log));
    } catch {
    }
  };

  const saveHandoverNotes = async (notes: HandoverNote[]) => {
    setHandoverNotes(notes);
    try {
      await AsyncStorage.setItem(HANDOVER_NOTES_KEY, JSON.stringify(notes));
    } catch {
    }
  };

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleShiftSwitch = (newCaregiver: 'PA' | 'PB') => {
    if (newCaregiver === shiftState.activeCaregiver) return;
    setPendingSwitch(newCaregiver);
    setShowHandoverModal(true);
  };

  const confirmShiftSwitch = () => {
    if (!pendingSwitch) return;
    const now = new Date().toISOString();
    const newState: ShiftState = {
      activeCaregiver: pendingSwitch,
      lastSwitchTimestamp: now,
    };
    saveShiftState(newState);

    if (handoverNoteText.trim()) {
      const otherCaregiver = pendingSwitch === 'PA' ? 'PB' : 'PA';
      const newNote: HandoverNote = {
        id: generateId(),
        fromCaregiver: otherCaregiver,
        toCaregiver: pendingSwitch,
        timestamp: now,
        note: handoverNoteText.trim(),
        wasRead: false,
      };
      saveHandoverNotes([...handoverNotes, newNote]);
    }

    setShowHandoverModal(false);
    setHandoverNoteText('');
    setPendingSwitch(null);
  };

  const cancelShiftSwitch = () => {
    setShowHandoverModal(false);
    setHandoverNoteText('');
    setPendingSwitch(null);
  };

  const openEntryModal = (type: CareLogEntry['type']) => {
    setEntryType(type);
    setEntrySubType('');
    setEntryNote('');
    setEntryMedicineName('');
    setEntryDosage('');
    setShowEntryModal(true);
  };

  const saveEntry = () => {
    const now = new Date().toISOString();
    const newEntry: CareLogEntry = {
      id: generateId(),
      type: entryType,
      caregiver: shiftState.activeCaregiver,
      timestamp: now,
      details: {
        subType: entrySubType || undefined,
        note: entryNote || undefined,
        medicineName: entryMedicineName || undefined,
        dosage: entryDosage || undefined,
      },
    };
    saveCareLog([...careLog, newEntry]);
    setShowEntryModal(false);
  };

  const getRecentEntries = () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    return careLog.filter((entry) => entry.timestamp >= sixHoursAgo);
  };

  const getCareSummary = () => {
    const recent = getRecentEntries();
    const summary: Record<string, { timestamps: string[]; subTypes: string[] }> = {
      feeding: { timestamps: [], subTypes: [] },
      sleep: { timestamps: [], subTypes: [] },
      diaper: { timestamps: [], subTypes: [] },
      medicine: { timestamps: [], subTypes: [] },
      note: { timestamps: [], subTypes: [] },
    };
    for (const entry of recent) {
      summary[entry.type].timestamps.push(entry.timestamp);
      if (entry.details.subType) {
        summary[entry.type].subTypes.push(entry.details.subType);
      }
    }
    return summary;
  };

  const hasUnreadNote = () => {
    return handoverNotes.some(
      (note) => note.toCaregiver === shiftState.activeCaregiver && !note.wasRead
    );
  };

  const getLatestHandoverNote = () => {
    const myNotes = handoverNotes.filter(
      (note) => note.toCaregiver === shiftState.activeCaregiver
    );
    if (myNotes.length === 0) return null;
    return myNotes.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  };

  const recentNote = getLatestHandoverNote();
  const summary = getCareSummary();

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: C.text, marginBottom: 4 },
    subtitle: { fontSize: 14, color: C.muted },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    trustLabel: { fontSize: 12, color: C.muted },
    unreadBadge: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#9CA3AF',
    },
    readBadge: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#2ecc71',
    },
    shiftSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    shiftButtons: { flexDirection: 'row', gap: 12 },
    shiftButton: {
      flex: 1,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 2,
    },
    shiftButtonActive: { borderColor: C.accent, backgroundColor: C.card },
    shiftButtonInactive: { borderColor: C.border, backgroundColor: 'transparent' },
    shiftButtonLabel: { fontSize: 18, fontWeight: '600', color: C.text },
    shiftButtonTime: { fontSize: 11, color: C.muted, marginTop: 4 },
    handoverNoteCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    handoverNoteLabel: { fontSize: 12, color: C.muted, marginBottom: 8 },
    handoverNoteText: { fontSize: 14, color: C.text, lineHeight: 20 },
    handoverNoteTime: { fontSize: 11, color: C.muted, marginTop: 8 },
    summarySection: { marginBottom: 24 },
    summaryCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    summaryIcon: { fontSize: 14 },
    summaryLabel: { fontSize: 13, color: C.text, fontWeight: '500' },
    summaryTimes: { fontSize: 12, color: C.muted },
    noSummary: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
    careLogSection: { marginBottom: 24 },
    quickEntryRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    quickEntryButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      minWidth: 80,
    },
    quickEntryIcon: { fontSize: 20, marginBottom: 4 },
    quickEntryLabel: { fontSize: 12, fontWeight: '600', color: '#1a1a2e' },
    careLogList: { marginTop: 16 },
    careLogItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      gap: 12,
    },
    careLogIcon: { fontSize: 18, width: 28, textAlign: 'center' },
    careLogContent: { flex: 1 },
    careLogType: { fontSize: 13, fontWeight: '600', color: C.text },
    careLogDetails: { fontSize: 12, color: C.muted, marginTop: 2 },
    careLogTime: { fontSize: 11, color: C.muted },
    careLogCaregiver: {
      fontSize: 10,
      color: C.accent,
      fontWeight: '600',
      marginTop: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: C.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 16, textAlign: 'center' },
    modalTextInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 16,
      fontSize: 14,
      color: C.text,
      minHeight: 100,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: C.border,
    },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
    modalButton: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonCancel: { backgroundColor: C.background },
    modalButtonConfirm: { backgroundColor: C.accent },
    modalButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    modalButtonTextCancel: { fontSize: 14, fontWeight: '600', color: C.muted },
    subTypeRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
    subTypeButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: 'transparent',
    },
    subTypeButtonSelected: { borderColor: C.accent, backgroundColor: C.accent },
    subTypeButtonText: { fontSize: 13, color: C.text },
    subTypeButtonTextSelected: { fontSize: 13, color: '#fff', fontWeight: '600' },
    textInput: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: C.text,
      marginTop: 12,
      borderWidth: 1,
      borderColor: C.border,
    },
    inputLabel: { fontSize: 12, color: C.muted, marginTop: 12, marginBottom: 4 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('shiftHandoff.title')}</Text>
          <Text style={styles.subtitle}>
            {t('shiftHandoff.activeCaregiver')}: {shiftState.activeCaregiver}
          </Text>
          <View style={styles.trustRow}>
            <Text style={styles.trustLabel}>{t('shiftHandoff.trustIndicator')}:</Text>
            {hasUnreadNote() ? (
              <View style={styles.unreadBadge} />
            ) : (
              <View style={styles.readBadge} />
            )}
            <Text style={styles.trustLabel}>
              {hasUnreadNote() ? t('shiftHandoff.unread') : t('shiftHandoff.read')}
            </Text>
          </View>
        </View>

        <View style={styles.shiftSection}>
          <Text style={styles.sectionTitle}>{t('shiftHandoff.shiftToggle')}</Text>
          <View style={styles.shiftButtons}>
            <TouchableOpacity
              style={[
                styles.shiftButton,
                shiftState.activeCaregiver === 'PA' ? styles.shiftButtonActive : styles.shiftButtonInactive,
              ]}
              onPress={() => handleShiftSwitch('PA')}
            >
              <Text style={styles.shiftButtonLabel}>{t('shiftHandoff.parentA')}</Text>
              {shiftState.activeCaregiver === 'PA' && (
                <Text style={styles.shiftButtonTime}>
                  {t('shiftHandoff.lastSwitch')}: {formatTimestamp(shiftState.lastSwitchTimestamp)}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.shiftButton,
                shiftState.activeCaregiver === 'PB' ? styles.shiftButtonActive : styles.shiftButtonInactive,
              ]}
              onPress={() => handleShiftSwitch('PB')}
            >
              <Text style={styles.shiftButtonLabel}>{t('shiftHandoff.parentB')}</Text>
              {shiftState.activeCaregiver === 'PB' && (
                <Text style={styles.shiftButtonTime}>
                  {t('shiftHandoff.lastSwitch')}: {formatTimestamp(shiftState.lastSwitchTimestamp)}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {recentNote && (
            <View style={styles.handoverNoteCard}>
              <Text style={styles.handoverNoteLabel}>
                {t('shiftHandoff.handoverFrom')} {recentNote.fromCaregiver}:
              </Text>
              <Text style={styles.handoverNoteText}>{recentNote.note}</Text>
              <Text style={styles.handoverNoteTime}>{formatDateTime(recentNote.timestamp)}</Text>
            </View>
          )}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>{t('shiftHandoff.last6Hours')}</Text>
          <View style={styles.summaryCard}>
            {getRecentEntries().length === 0 ? (
              <Text style={styles.noSummary}>{t('shiftHandoff.noRecentEntries')}</Text>
            ) : (
              <View style={styles.summaryRow}>
                {summary.feeding.timestamps.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryIcon}>🍼</Text>
                    <Text style={styles.summaryLabel}>{t('shiftHandoff.feeding')}:</Text>
                    <Text style={styles.summaryTimes}>
                      {summary.feeding.timestamps.map((ts) => formatTimestamp(ts)).join(', ')}
                    </Text>
                  </View>
                )}
                {summary.sleep.timestamps.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryIcon}>🌙</Text>
                    <Text style={styles.summaryLabel}>{t('shiftHandoff.sleep')}:</Text>
                    <Text style={styles.summaryTimes}>
                      {summary.sleep.timestamps.map((ts) => formatTimestamp(ts)).join(', ')}
                    </Text>
                  </View>
                )}
                {summary.diaper.timestamps.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryIcon}>🧷</Text>
                    <Text style={styles.summaryLabel}>{t('shiftHandoff.diaper')}:</Text>
                    <Text style={styles.summaryTimes}>
                      {summary.diaper.timestamps.map((ts) => formatTimestamp(ts)).join(', ')}
                    </Text>
                  </View>
                )}
                {summary.medicine.timestamps.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryIcon}>💊</Text>
                    <Text style={styles.summaryLabel}>{t('shiftHandoff.medicine')}:</Text>
                    <Text style={styles.summaryTimes}>
                      {summary.medicine.timestamps.map((ts) => formatTimestamp(ts)).join(', ')}
                    </Text>
                  </View>
                )}
                {summary.note.timestamps.length > 0 && (
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryIcon}>📝</Text>
                    <Text style={styles.summaryLabel}>{t('shiftHandoff.note')}:</Text>
                    <Text style={styles.summaryTimes}>
                      {summary.note.timestamps.map((ts) => formatTimestamp(ts)).join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={styles.careLogSection}>
          <Text style={styles.sectionTitle}>{t('shiftHandoff.careLog')}</Text>
          <View style={styles.quickEntryRow}>
            <TouchableOpacity
              style={[styles.quickEntryButton, { backgroundColor: '#F5B7B1' }]}
              onPress={() => openEntryModal('feeding')}
            >
              <Text style={styles.quickEntryIcon}>🍼</Text>
              <Text style={styles.quickEntryLabel}>{t('shiftHandoff.feeding')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickEntryButton, { backgroundColor: '#AED6F1' }]}
              onPress={() => openEntryModal('sleep')}
            >
              <Text style={styles.quickEntryIcon}>🌙</Text>
              <Text style={styles.quickEntryLabel}>{t('shiftHandoff.sleep')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickEntryButton, { backgroundColor: '#A8D5BA' }]}
              onPress={() => openEntryModal('diaper')}
            >
              <Text style={styles.quickEntryIcon}>🧷</Text>
              <Text style={styles.quickEntryLabel}>{t('shiftHandoff.diaper')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickEntryButton, { backgroundColor: '#F5B7B1' }]}
              onPress={() => openEntryModal('medicine')}
            >
              <Text style={styles.quickEntryIcon}>💊</Text>
              <Text style={styles.quickEntryLabel}>{t('shiftHandoff.medicine')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickEntryButton, { backgroundColor: '#D2B4DE' }]}
              onPress={() => openEntryModal('note')}
            >
              <Text style={styles.quickEntryIcon}>📝</Text>
              <Text style={styles.quickEntryLabel}>{t('shiftHandoff.note')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.careLogList}>
            {careLog
              .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
              .slice(0, 10)
              .map((entry) => (
                <View key={entry.id} style={styles.careLogItem}>
                  <Text style={styles.careLogIcon}>
                    {entry.type === 'feeding' ? '🍼' : entry.type === 'sleep' ? '🌙' : entry.type === 'diaper' ? '🧷' : entry.type === 'medicine' ? '💊' : '📝'}
                  </Text>
                  <View style={styles.careLogContent}>
                    <Text style={styles.careLogType}>
                      {t(`shiftHandoff.${entry.type}`)}
                      {entry.details.subType ? ` (${entry.details.subType})` : ''}
                    </Text>
                    {entry.details.note && (
                      <Text style={styles.careLogDetails}>{entry.details.note}</Text>
                    )}
                    {entry.details.medicineName && (
                      <Text style={styles.careLogDetails}>
                        {entry.details.medicineName} {entry.details.dosage ? `- ${entry.details.dosage}` : ''}
                      </Text>
                    )}
                    <Text style={styles.careLogTime}>{formatDateTime(entry.timestamp)}</Text>
                    <Text style={styles.careLogCaregiver}>{entry.caregiver}</Text>
                  </View>
                </View>
              ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showHandoverModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {t('shiftHandoff.handoverNote')} ({pendingSwitch})
            </Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder={t('shiftHandoff.handoverPlaceholder')}
              placeholderTextColor={C.muted}
              value={handoverNoteText}
              onChangeText={setHandoverNoteText}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={cancelShiftSwitch}>
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={confirmShiftSwitch}>
                <Text style={styles.modalButtonText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showEntryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t(`shiftHandoff.${entryType}`)}</Text>

            {entryType === 'feeding' && (
              <View style={styles.subTypeRow}>
                {['breast', 'bottle', 'solid'].map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.subTypeButton, entrySubType === sub && styles.subTypeButtonSelected]}
                    onPress={() => setEntrySubType(sub)}
                  >
                    <Text style={entrySubType === sub ? styles.subTypeButtonTextSelected : styles.subTypeButtonText}>
                      {t(`tracking.${sub}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {entryType === 'sleep' && (
              <View style={styles.subTypeRow}>
                {['nap', 'night'].map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.subTypeButton, entrySubType === sub && styles.subTypeButtonSelected]}
                    onPress={() => setEntrySubType(sub)}
                  >
                    <Text style={entrySubType === sub ? styles.subTypeButtonTextSelected : styles.subTypeButtonText}>
                      {t(`tracking.${sub}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {entryType === 'diaper' && (
              <View style={styles.subTypeRow}>
                {['wet', 'dry', 'both'].map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.subTypeButton, entrySubType === sub && styles.subTypeButtonSelected]}
                    onPress={() => setEntrySubType(sub)}
                  >
                    <Text style={entrySubType === sub ? styles.subTypeButtonTextSelected : styles.subTypeButtonText}>
                      {t(`tracking.${sub}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {entryType === 'medicine' && (
              <>
                <Text style={styles.inputLabel}>{t('shiftHandoff.medicineName')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('shiftHandoff.medicineNamePlaceholder')}
                  placeholderTextColor={C.muted}
                  value={entryMedicineName}
                  onChangeText={setEntryMedicineName}
                />
                <Text style={styles.inputLabel}>{t('shiftHandoff.dosage')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('shiftHandoff.dosagePlaceholder')}
                  placeholderTextColor={C.muted}
                  value={entryDosage}
                  onChangeText={setEntryDosage}
                />
              </>
            )}

            {(entryType === 'note' || entryType === 'feeding' || entryType === 'sleep' || entryType === 'diaper') && (
              <>
                <Text style={styles.inputLabel}>{t('shiftHandoff.noteOptional')}</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('shiftHandoff.notePlaceholder')}
                  placeholderTextColor={C.muted}
                  value={entryNote}
                  onChangeText={setEntryNote}
                  multiline
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEntryModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={saveEntry}>
                <Text style={styles.modalButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

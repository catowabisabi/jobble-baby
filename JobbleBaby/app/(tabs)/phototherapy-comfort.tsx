import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STORAGE_KEYS } from '../../store/storage-keys';

const PHOTO_COMFORT_KEY = STORAGE_KEYS.PHOTO_COMFORT_SESSIONS;
const PROFILE_KEY = '@jobble_baby_profile';
const JAUNDICE_KEY = STORAGE_KEYS.JAUNDICE_ENTRIES;

interface PhotoComfortEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  lampType: string;
  durationMin: number;
  eyeMaskOn: boolean;
  skinTempChecked: boolean;
  diaperChanged: boolean;
  feedingDuring: boolean;
  skinTempFelt: 'normal' | 'warm' | 'hot' | 'unknown';
  parentStress: number; // 1-5
  notes?: string;
}

interface BabyProfile {
  name: string;
  birthDate: string;
}

const LAMP_TYPES_I18N = {
  LED: 'photoComfort.lightTypes.LED',
  Halogen: 'photoComfort.lightTypes.Halogen',
  'Fiber Optic': 'photoComfort.lightTypes.Fiber Optic',
  BiliBlanket: 'photoComfort.lightTypes.BiliBlanket',
} as const;
type LampType = keyof typeof LAMP_TYPES_I18N;
const LAMP_TYPE_VALUES = Object.keys(LAMP_TYPES_I18N) as readonly LampType[];

function getAgeDays(birthDate: string): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  return Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function PhototherapyComfortScreen() {
  const [sessions, setSessions] = useState<PhotoComfortEntry[]>([]);
  const [profile, setProfile] = useState<BabyProfile | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [lampType, setLampType] = useState<LampType>(LAMP_TYPE_VALUES[0]);
  const [eyeMaskOn, setEyeMaskOn] = useState(false);
  const [skinTempChecked, setSkinTempChecked] = useState(false);
  const [diaperChanged, setDiaperChanged] = useState(false);
  const [feedingDuring, setFeedingDuring] = useState(false);
  const [skinTempFelt, setSkinTempFelt] = useState<'normal' | 'warm' | 'hot' | 'unknown'>('unknown');
  const [parentStress, setParentStress] = useState(3);
  const [notes, setNotes] = useState('');
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const ti = (key: string): string => {
    const translated = t(key);
    return translated === key ? key : translated;
  };
  const LAMP_TYPES: { value: LampType; label: string }[] = [
    { value: 'LED', label: ti(LAMP_TYPES_I18N.LED) },
    { value: 'Halogen', label: ti(LAMP_TYPES_I18N.Halogen) },
    { value: 'Fiber Optic', label: ti(LAMP_TYPES_I18N['Fiber Optic']) },
    { value: 'BiliBlanket', label: ti(LAMP_TYPES_I18N.BiliBlanket) },
  ];
  const C = COLORS[effectiveTheme];
  const inputBg = effectiveTheme === 'dark' ? '#1a2a3a' : '#f5f7fa';

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [sessionData, profileData] = await Promise.all([
        safeGetItem(PHOTO_COMFORT_KEY),
        safeGetItem(PROFILE_KEY),
      ]);
      if (sessionData) setSessions(JSON.parse(sessionData));
      if (profileData) setProfile(JSON.parse(profileData));
    } catch (e) { /* ignore */ }
  };

  const saveSession = async () => {
    if (!startTime || !endTime) {
      Alert.alert(t('photoComfort.fillTimes') || 'Please fill start and end times');
      return;
    }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMin <= 0) {
      Alert.alert(t('photoComfort.invalidTimes') || 'End time must be after start time');
      return;
    }
    const entry: PhotoComfortEntry = {
      id: Date.now().toString(),
      date: sessionDate,
      startTime,
      endTime,
      lampType,
      durationMin,
      eyeMaskOn,
      skinTempChecked,
      diaperChanged,
      feedingDuring,
      skinTempFelt,
      parentStress,
      notes,
    };
    const updated = [entry, ...sessions];
    setSessions(updated);
    await safeSetItem(PHOTO_COMFORT_KEY, JSON.stringify(updated));
    resetForm();
    setShowModal(false);
  };

  const resetForm = () => {
    setStartTime(''); setEndTime(''); setLampType(LAMP_TYPE_VALUES[0]);
    setEyeMaskOn(false); setSkinTempChecked(false); setDiaperChanged(false);
    setFeedingDuring(false); setSkinTempFelt('unknown'); setParentStress(3); setNotes('');
  };

  const shareReport = async () => {
    const age = profile ? getAgeDays(profile.birthDate) : 0;
    const totalMin = sessions.reduce((s, e) => s + e.durationMin, 0);
    const lines = [
      `Phototherapy Comfort Report — ${profile?.name || 'Baby'}`,
      `Age: ${age} days`,
      `Total sessions: ${sessions.length}`,
      `Total phototherapy time: ${formatDuration(totalMin)}`,
      '',
      ...sessions.slice(0, 10).map(s =>
        `${s.date} | ${s.lampType} | ${s.startTime}-${s.endTime} | ${formatDuration(s.durationMin)} | ` +
        `Eye mask: ${s.eyeMaskOn ? t('common.yes') : t('common.no')} | Skin temp: ${t(`photoComfort.skinTemp.${s.skinTempFelt}`)} | ` +
        `Stress: ${'★'.repeat(s.parentStress)}${'☆'.repeat(5 - s.parentStress)}`
      ),
    ];
    try { await Share.share({ message: lines.join('\n') }); } catch (e) { /* ignore */ }
  };

  const age = profile ? getAgeDays(profile.birthDate) : 0;
  const totalMin = sessions.reduce((s, e) => s + e.durationMin, 0);
  const avgStress = sessions.length > 0
    ? Math.round(sessions.reduce((s, e) => s + e.parentStress, 0) / sessions.length * 10) / 10
    : 0;
  const maskCompliance = sessions.length > 0
    ? Math.round(sessions.filter(s => s.eyeMaskOn).length / sessions.length * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.babyHeader}>
          <View style={[styles.avatarCircle, { backgroundColor: C.accent + '30' }]}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={28} color={C.accent} />
          </View>
          <View style={styles.babyInfo}>
            <Text style={[styles.babyName, { color: C.text }]}>{profile?.name || t('photoComfort.babyNameDefault')}</Text>
            <Text style={[styles.babyAge, { color: C.muted }]}>
              {age} {t('photoComfort.daysOld') || 'days old'}
            </Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: C.card }]}>
            <Text style={[styles.summaryNum, { color: C.accent }]}>{sessions.length}</Text>
            <Text style={[styles.summaryLabel, { color: C.muted }]}>{t('photoComfort.sessions') || 'Sessions'}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: C.card }]}>
            <Text style={[styles.summaryNum, { color: C.accent }]}>{formatDuration(totalMin)}</Text>
            <Text style={[styles.summaryLabel, { color: C.muted }]}>{t('photoComfort.totalTime') || 'Total Time'}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: C.card }]}>
            <Text style={[styles.summaryNum, { color: maskCompliance >= 80 ? '#22C55E' : '#F59E0B' }]}>{maskCompliance}%</Text>
            <Text style={[styles.summaryLabel, { color: C.muted }]}>{t('photoComfort.maskCompliance') || 'Mask OK'}</Text>
          </View>
        </View>

        {/* Parent Stress Indicator */}
        {sessions.length > 0 && (
          <View style={[styles.stressCard, { backgroundColor: C.card }]}>
            <Text style={[styles.stressTitle, { color: C.text }]}>{t('photoComfort.parentWellness') || 'Parent Wellness'}</Text>
            <View style={styles.stressBar}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setParentStress(n)} style={styles.stressDotWrap} accessibilityLabel={`Parent stress level ${n}`}>
                  <View style={[
                    styles.stressDot,
                    { backgroundColor: n <= parentStress ? (parentStress <= 2 ? '#22C55E' : parentStress <= 3 ? '#F59E0B' : '#EF4444') : C.border }
                  ]} />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.stressNote, { color: C.muted }]}>
              {t('photoComfort.stressNote') || 'Track your stress level — self-care is part of care'}
            </Text>
          </View>
        )}

        {/* Comfort Checklist Info */}
        <View style={[styles.infoCard, { backgroundColor: C.card }]}>
          <Text style={[styles.infoTitle, { color: C.text }]}>{t('photoComfort.comfortTips') || 'Home Care Checklist'}</Text>
          {[
            { icon: 'eye-off', text: t('photoComfort.tipEyeMask') || 'Eye mask must cover both eyes completely' },
            { icon: 'thermometer', text: t('photoComfort.tipSkinTemp') || 'Check skin temp every 30 min — keep baby cool' },
            { icon: 'baby-carriage', text: t('photoComfort.tipFeeding') || 'Feed every 2-3h during phototherapy — extra fluids help flush bilirubin' },
            { icon: 'diabetes', text: t('photoComfort.tipDiaper') || 'Change diaper before/after sessions — bilirubin exits via stool' },
            { icon: 'account-heart', text: t('photoComfort.tipBonding') || 'Skin-to-skin during breaks helps both baby and parent' },
          ].map((tip, i) => (
            <View key={i} style={[styles.tipRow, { borderBottomColor: C.border }]}>
              <MaterialCommunityIcons name={tip.icon as any} size={18} color={C.accent} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: C.text }]}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.accent }]}
            onPress={() => setShowModal(true)}
            accessibilityLabel="Start phototherapy session"
          >
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>{t('photoComfort.newSession') || 'New Session'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.border }]}
            onPress={shareReport}
            accessibilityLabel="Share phototherapy report"
          >
            <MaterialCommunityIcons name="share-variant" size={20} color={C.text} />
            <Text style={[styles.actionBtnTextAlt, { color: C.text }]}>{t('photoComfort.share') || 'Share'}</Text>
          </TouchableOpacity>
        </View>

        {/* Session History */}
        <View style={[styles.section, { backgroundColor: C.card }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('photoComfort.sessionHistory') || 'Session History'}</Text>
          {sessions.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>
              {t('photoComfort.noSessions') || 'No sessions yet. Tap New Session to begin.'}
            </Text>
          ) : (
            sessions.slice(0, 20).map(session => (
              <View key={session.id} style={[styles.sessionCard, { borderBottomColor: C.border }]}>
                <View style={styles.sessionHeader}>
                  <View>
                    <Text style={[styles.sessionDate, { color: C.text }]}>{session.date}</Text>
                    <Text style={[styles.sessionTime, { color: C.muted }]}>
                      {session.startTime} - {session.endTime} · {session.lampType} · {formatDuration(session.durationMin)}
                    </Text>
                  </View>
                  <View style={[styles.complianceBadge, {
                    backgroundColor: session.eyeMaskOn && session.skinTempChecked ? '#22C55E20' : '#F59E0B20'
                  }]}>
                    <Text style={[styles.complianceText, {
                      color: session.eyeMaskOn && session.skinTempChecked ? '#22C55E' : '#F59E0B'
                    }]}>
                      {session.eyeMaskOn && session.skinTempChecked ? '✓' : '⚠'}
                    </Text>
                  </View>
                </View>
                <View style={styles.checklistRow}>
                  {[
                    { label: t('photoComfort.eyeMask') || 'Eye mask', done: session.eyeMaskOn },
                    { label: t('photoComfort.skinTemp') || 'Skin temp', done: session.skinTempChecked },
                    { label: t('photoComfort.diaper') || 'Diaper', done: session.diaperChanged },
                    { label: t('photoComfort.feeding') || 'Fed', done: session.feedingDuring },
                  ].map((item, i) => (
                    <View key={i} style={styles.checkItem}>
                      <MaterialCommunityIcons
                        name={item.done ? 'check-circle' : 'circle-outline'}
                        size={14} color={item.done ? '#22C55E' : C.muted}
                      />
                      <Text style={[styles.checkLabel, { color: C.muted }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {session.notes ? (
                  <Text style={[styles.sessionNotes, { color: C.muted }]}>{t('photoComfort.note') || 'Note:'}: {session.notes}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* New Session Modal */}
      {showModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t('photoComfort.newSession') || 'New Phototherapy Session'}</Text>

            <Text style={[styles.modalLabel, { color: C.muted }]}>{t('photoComfort.date') || 'Date'}</Text>
            <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text }]} value={sessionDate} onChangeText={setSessionDate} placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} />

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={[styles.modalLabel, { color: C.muted }]}>{t('photoComfort.startTime') || 'Start'}</Text>
                <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text }]} value={startTime} onChangeText={setStartTime} placeholder="09:00" placeholderTextColor={C.muted} />
              </View>
              <View style={styles.timeField}>
                <Text style={[styles.modalLabel, { color: C.muted }]}>{t('photoComfort.endTime') || 'End'}</Text>
                <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text }]} value={endTime} onChangeText={setEndTime} placeholder="12:00" placeholderTextColor={C.muted} />
              </View>
            </View>

            <Text style={[styles.modalLabel, { color: C.muted }]}>{t('photoComfort.lampType') || 'Lamp Type'}</Text>
            <View style={styles.lampRow}>
              {LAMP_TYPES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.lampBtn, lampType === value && { backgroundColor: C.accent }]}
                  onPress={() => setLampType(value)}
                  accessibilityLabel={"Select lamp type " + label}
                >
                  <Text style={[styles.lampBtnText, lampType === value && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: C.muted }]}>{t('photoComfort.comfortChecklist') || 'Comfort Checklist'}</Text>
            {[
              { label: t('photoComfort.eyeMaskOn') || 'Eye mask on baby', val: eyeMaskOn, set: setEyeMaskOn },
              { label: t('photoComfort.skinTempChecked') || 'Skin temp checked', val: skinTempChecked, set: setSkinTempChecked },
              { label: t('photoComfort.diaperChanged') || 'Diaper changed', val: diaperChanged, set: setDiaperChanged },
              { label: t('photoComfort.feedingDuring') || 'Fed during session', val: feedingDuring, set: setFeedingDuring },
            ].map((item, i) => (
              <TouchableOpacity key={i} style={styles.checkRow} onPress={() => item.set(!item.val)} accessibilityLabel={item.label}>
                <MaterialCommunityIcons name={item.val ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={item.val ? C.accent : C.muted} />
                <Text style={[styles.checkRowText, { color: C.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalLabel, { color: C.muted }]}>{t('photoComfort.skinTempFelt') || 'Skin temp felt'}</Text>
            <View style={styles.tempRow}>
              {(['normal', 'warm', 'hot', 'unknown'] as const).map(temp => (
                <TouchableOpacity
                  key={temp}
                  style={[styles.tempBtn, skinTempFelt === temp && { backgroundColor: C.accent }]}
                  onPress={() => setSkinTempFelt(temp)}
                  accessibilityLabel={"Skin temp " + temp}
                >
                  <Text style={[styles.tempBtnText, skinTempFelt === temp && { color: '#fff' }]}>
                    {temp === 'unknown' ? t('photoComfort.unknown') : t(`photoComfort.skinTemp.${temp}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: C.muted }]}>{t('photoComfort.parentStress') || 'Parent stress (1=great, 5=overwhelmed)'}</Text>
            <View style={styles.stressInputRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setParentStress(n)} style={styles.stressInputDot} accessibilityLabel={`Parent stress level ${n}`}>
                  <View style={[
                    styles.stressInputDotInner,
                    { backgroundColor: n === parentStress ? (n <= 2 ? '#22C55E' : n <= 3 ? '#F59E0B' : '#EF4444') : C.border }
                  ]} />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: C.muted }]}>{t('photoComfort.notes') || 'Notes'}</Text>
            <TextInput style={[styles.input, { backgroundColor: inputBg, color: C.text, minHeight: 60 }]} value={notes} onChangeText={setNotes} placeholder={t('photoComfort.notesPlaceholder') || 'Any notes...'} placeholderTextColor={C.muted} multiline />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: C.border }]} onPress={() => { resetForm(); setShowModal(false); }} accessibilityLabel={t('photoComfort.cancel')}>
                <Text style={[styles.cancelBtnText, { color: C.text }]}>{t('photoComfort.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: C.accent }]} onPress={saveSession} accessibilityLabel="Save phototherapy session">
                <Text style={styles.saveBtnText}>{t('photoComfort.save') || 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  babyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  babyInfo: { marginLeft: 12 },
  babyName: { fontSize: 20, fontWeight: '700' },
  babyAge: { fontSize: 14, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryNum: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  stressCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  stressTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  stressBar: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  stressDotWrap: { flex: 1, alignItems: 'center' },
  stressDot: { width: 28, height: 28, borderRadius: 14 },
  stressNote: { fontSize: 12, marginTop: 4 },
  infoCard: { borderRadius: 12, padding: 16, marginBottom: 12 },
  infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 0 },
  tipIcon: { marginRight: 10, marginTop: 1 },
  tipText: { fontSize: 13, flex: 1, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 6 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  actionBtnTextAlt: { fontWeight: '600', fontSize: 14 },
  section: { borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  sessionCard: { paddingVertical: 12, borderBottomWidth: 1 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  sessionDate: { fontSize: 15, fontWeight: '600' },
  sessionTime: { fontSize: 13, marginTop: 2 },
  complianceBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  complianceText: { fontSize: 14, fontWeight: '700' },
  checklistRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkLabel: { fontSize: 12 },
  sessionNotes: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 16, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 8, padding: 10, fontSize: 15 },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  lampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  lampBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#E5E7EB' },
  lampBtnText: { fontSize: 13, fontWeight: '500' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  checkRowText: { fontSize: 14 },
  tempRow: { flexDirection: 'row', gap: 8 },
  tempBtn: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#E5E7EB' },
  tempBtnText: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  stressInputRow: { flexDirection: 'row', gap: 8 },
  stressInputDot: { flex: 1, alignItems: 'center' },
  stressInputDotInner: { width: 32, height: 32, borderRadius: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: '500' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

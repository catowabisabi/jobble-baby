import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const AIR_LOG_KEY = STORAGE_KEYS.INDOOR_AIR_LOG;
const RESP_EVENTS_KEY = STORAGE_KEYS.RESPIRATORY_EVENTS;
const ROOM_SCORES_KEY = STORAGE_KEYS.ROOM_SCORES;

// ─── Types ───────────────────────────────────────────────────────────────────
interface AirLogEntry {
  id: string;
  date: string;
  timestamp: string;
  purifierOn: boolean;
  windowMinutes: number;
  candlesIncense: boolean;
  cleaningProducts: boolean;
  cookingEvent: boolean;
  notes: string;
}

interface RespiratoryEntry {
  id: string;
  date: string;
  timestamp: string;
  coughCount: number;
  wheezeSeverity: number; // 0-3
  congestionScore: number; // 0-5
  relieverUsed: boolean;
  relieverType: string;
  notes: string;
}

interface RoomScore {
  room: 'nursery' | 'livingRoom' | 'kitchen';
  score: number; // 1-5
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
const d = (): string => new Date().toISOString().split('T')[0];
const now = (): string => new Date().toISOString();

function getWheezeLabel(severity: number, tt: (k: string) => string): string {
  const labels: Record<number, string> = { 0: tt('indoorAir.respiratory.wheezeNone'), 1: tt('indoorAir.respiratory.wheezeMild'), 2: tt('indoorAir.respiratory.wheezeModerate'), 3: tt('indoorAir.respiratory.wheezeSevere') };
  return labels[severity] ?? labels[0];
}

function getCongestionLabel(score: number, tt: (k: string) => string): string {
  const labels: Record<number, string> = { 0: tt('indoorAir.respiratory.congestionNone'), 1: tt('indoorAir.respiratory.congestionMild'), 2: tt('indoorAir.respiratory.congestionModerate'), 3: tt('indoorAir.respiratory.congestionSevere'), 4: tt('indoorAir.respiratory.congestionVerySevere'), 5: tt('indoorAir.respiratory.congestionMax') };
  return labels[score] ?? labels[0];
}

function getRoomLabel(room: string, tt: (k: string) => string): string {
  const labels: Record<string, string> = { nursery: tt('indoorAir.roomScore.nursery'), livingRoom: tt('indoorAir.roomScore.livingRoom'), kitchen: tt('indoorAir.roomScore.kitchen') };
  return labels[room] ?? room;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function IndoorAirNavigatorScreen() {
  const { t: tt } = useLanguage();
  const { theme } = useTheme();
  const t = (key: string) => tt(`indoorAir.${key}`);

  const [airLogs, setAirLogs] = useState<AirLogEntry[]>([]);
  const [respEvents, setRespEvents] = useState<RespiratoryEntry[]>([]);
  const [roomScores, setRoomScores] = useState<RoomScore[]>([
    { room: 'nursery', score: 3 }, { room: 'livingRoom', score: 3 }, { room: 'kitchen', score: 3 }
  ]);
  const [activeSection, setActiveSection] = useState<'log' | 'resp' | 'correlation' | 'rooms' | 'alert'>('log');
  const [showAirModal, setShowAirModal] = useState(false);
  const [showRespModal, setShowRespModal] = useState(false);
  const [alertHistory, setAlertHistory] = useState<string[]>([]);

  // Air log form state
  const [ purifierOn, setPurifierOn ] = useState(false);
  const [ windowMinutes, setWindowMinutes ] = useState('');
  const [ candlesIncense, setCandlesIncense ] = useState(false);
  const [ cleaningProducts, setCleaningProducts ] = useState(false);
  const [ cookingEvent, setCookingEvent ] = useState(false);
  const [ airNotes, setAirNotes ] = useState('');

  // Resp event form state
  const [ coughCount, setCoughCount ] = useState('');
  const [ wheezeSeverity, setWheezeSeverity ] = useState(0);
  const [ congestionScore, setCongestionScore ] = useState(0);
  const [ relieverUsed, setRelieverUsed ] = useState(false);
  const [ relieverType, setRelieverType ] = useState('');

  const loadData = useCallback(async () => {
    try {
      const airRaw = await safeGetItem(AIR_LOG_KEY);
      if (airRaw) setAirLogs(JSON.parse(airRaw));
      const respRaw = await safeGetItem(RESP_EVENTS_KEY);
      if (respRaw) setRespEvents(JSON.parse(respRaw));
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load room scores on mount ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const roomRaw = await safeGetItem(ROOM_SCORES_KEY);
      if (roomRaw) setRoomScores(JSON.parse(roomRaw));
    })();
  }, []);

  // ── Save helpers ─────────────────────────────────────────────────────────────
  async function saveAirLogs(logs: AirLogEntry[]) {
    setAirLogs(logs);
    await safeSetItem(AIR_LOG_KEY, JSON.stringify(logs));
  }

  async function saveRespEvents(events: RespiratoryEntry[]) {
    setRespEvents(events);
    await safeSetItem(RESP_EVENTS_KEY, JSON.stringify(events));
  }

  // ── Check alerts ─────────────────────────────────────────────────────────────
  async function checkAlerts() {
    const today = d();
    const todayAir = airLogs.filter(l => l.date === today);
    const todayResp = respEvents.filter(r => r.date === today);

    const vocSpike = todayAir.some(l => l.candlesIncense || l.cleaningProducts);
    const congestionTrend = todayResp.length > 0 && todayResp[todayResp.length - 1].congestionScore >= 3;

    if (vocSpike && congestionTrend) {
      const alert = `${today}: ${t('indoorAir.alert.vocCongestionAlert')}`;
      if (!alertHistory.includes(alert)) {
        setAlertHistory(prev => [alert, ...prev]);
        Alert.alert(t('indoorAir.alert.vocSpike'), t('indoorAir.alert.vocCongestionDetail'));
      }
    }
  }

  // ── Add Air Log ─────────────────────────────────────────────────────────────
  async function handleAddAirLog() {
    const entry: AirLogEntry = {
      id: uid(), date: d(), timestamp: now(),
      purifierOn, windowMinutes: parseInt(windowMinutes) || 0,
      candlesIncense, cleaningProducts, cookingEvent, notes: airNotes
    };
    await saveAirLogs([entry, ...airLogs]);
    setShowAirModal(false);
    resetAirForm();
    checkAlerts();
  }

  // ── Add Respiratory Event ────────────────────────────────────────────────────
  async function handleAddRespEvent() {
    const entry: RespiratoryEntry = {
      id: uid(), date: d(), timestamp: now(),
      coughCount: parseInt(coughCount) || 0,
      wheezeSeverity, congestionScore,
      relieverUsed, relieverType, notes: ''
    };
    await saveRespEvents([entry, ...respEvents]);
    setShowRespModal(false);
    resetRespForm();
    checkAlerts();
  }

  // ── Room Score ───────────────────────────────────────────────────────────────
  async function updateRoomScore(room: RoomScore['room'], score: number) {
    const updated = roomScores.map(r => r.room === room ? { ...r, score } : r);
    setRoomScores(updated);
    await safeSetItem(ROOM_SCORES_KEY, JSON.stringify(updated));
  }

  // ── Reset forms ─────────────────────────────────────────────────────────────
  function resetAirForm() { setPurifierOn(false); setWindowMinutes(''); setCandlesIncense(false); setCleaningProducts(false); setCookingEvent(false); setAirNotes(''); }
  function resetRespForm() { setCoughCount(''); setWheezeSeverity(0); setCongestionScore(0); setRelieverUsed(false); setRelieverType(''); }

  // ── Correlation data ─────────────────────────────────────────────────────────
  const correlationData = (() => {
    const days = 7;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const airDay = airLogs.filter(l => l.date === dateStr);
      const respDay = respEvents.filter(r => r.date === dateStr);
      const vocScore = airDay.reduce((sum, l) => sum + (l.candlesIncense ? 2 : l.cleaningProducts ? 1 : 0), 0);
      const respScore = respDay.reduce((sum, r) => sum + r.coughCount + r.wheezeSeverity, 0);
      result.push({ date: dateStr, voc: Math.min(vocScore, 5), resp: Math.min(respScore, 5) });
    }
    return result;
  })();

  const todayAirLogs = airLogs.filter(l => l.date === d());
  const todayResp = respEvents.filter(r => r.date === d());

  const bg = theme === 'dark' ? '#111827' : '#F9FAFB';
  const card = theme === 'dark' ? '#1F2937' : '#FFFFFF';
  const text = theme === 'dark' ? '#F9FAFB' : '#111827';
  const subtext = theme === 'dark' ? '#9CA3AF' : '#6B7280';
  const border = theme === 'dark' ? '#374151' : '#E5E7EB';
  const primary = '#3B82F6';

  // ─── Render Section ─────────────────────────────────────────────────────────
  function renderAirLogList() {
    const logs = todayAirLogs.length > 0 ? todayAirLogs : airLogs.slice(0, 10);
    if (logs.length === 0) return <Text style={{ color: subtext, textAlign: 'center', marginTop: 20 }}>{t('indoorAir.airLog.noEntries')}</Text>;
    return logs.map(entry => (
      <View key={entry.id} style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.cardDate, { color: subtext }]}>{entry.date}</Text>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.airLog.purifier')}:</Text><Text style={{ color: text }}>{entry.purifierOn ? '✅' : '❌'}</Text></View>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.airLog.window')}:</Text><Text style={{ color: text }}>{entry.windowMinutes} min</Text></View>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.airLog.candles')}:</Text><Text style={{ color: text }}>{entry.candlesIncense ? '⚠️' : '—'}</Text></View>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.airLog.cleaning')}:</Text><Text style={{ color: text }}>{entry.cleaningProducts ? '⚠️' : '—'}</Text></View>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.airLog.cooking')}:</Text><Text style={{ color: text }}>{entry.cookingEvent ? '🍳' : '—'}</Text></View>
      </View>
    ));
  }

  function renderRespList() {
    const events = todayResp.length > 0 ? todayResp : respEvents.slice(0, 10);
    if (events.length === 0) return <Text style={{ color: subtext, textAlign: 'center', marginTop: 20 }}>{t('indoorAir.respiratory.noEntries')}</Text>;
    return events.map(entry => (
      <View key={entry.id} style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.cardDate, { color: subtext }]}>{entry.date}</Text>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.respiratory.coughCount')}:</Text><Text style={{ color: text }}>{entry.coughCount}</Text></View>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.respiratory.wheeze')}:</Text><Text style={{ color: text }}>{getWheezeLabel(entry.wheezeSeverity, t)}</Text></View>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.respiratory.congestion')}:</Text><Text style={{ color: text }}>{getCongestionLabel(entry.congestionScore, t)} ({entry.congestionScore}/5)</Text></View>
        <View style={styles.cardRow}><Text style={[styles.label, { color: subtext }]}>{t('indoorAir.respiratory.reliever')}:</Text><Text style={{ color: text }}>{entry.relieverUsed ? `✅ ${entry.relieverType}` : '—'}</Text></View>
      </View>
    ));
  }

  function renderCorrelation() {
    const max = Math.max(...correlationData.map(c => Math.max(c.voc, c.resp)), 1);
    return (
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>{t('indoorAir.correlation.title')}</Text>
        <View style={styles.chartContainer}>
          {correlationData.map((c, i) => (
            <View key={i} style={styles.chartBarGroup}>
              <Text style={[styles.chartDate, { color: subtext }]}>{c.date.slice(5)}</Text>
              <View style={styles.chartBars}>
                <View style={[styles.barVoc, { height: Math.max((c.voc / max) * 80, 2) }]} />
                <View style={[styles.barResp, { height: Math.max((c.resp / max) * 80, 2) }]} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.chartLegend}>
          <Text style={{ color: subtext }}>🔵 {t('indoorAir.correlation.voc')}  </Text>
          <Text style={{ color: subtext }}>🔴 {t('indoorAir.correlation.respiratory')}</Text>
        </View>
      </View>
    );
  }

  function renderRoomScores() {
    return (
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>{t('indoorAir.roomScore.title')}</Text>
        {roomScores.map(room => (
          <View key={room.room} style={styles.roomRow}>
            <Text style={{ color: text }}>{getRoomLabel(room.room, t)}</Text>
            <View style={styles.scoreButtons}>
              {[1, 2, 3, 4, 5].map(score => (
                <TouchableOpacity key={score} onPress={() => updateRoomScore(room.room, score)} style={[styles.scoreBtn, { backgroundColor: room.score === score ? primary : border }]} accessibilityLabel={`${getRoomLabel(room.room, t)} score ${score}`}>
                  <Text style={{ color: room.score === score ? '#fff' : subtext, fontSize: 12 }}>{score}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        <Text style={[styles.hint, { color: subtext }]}>{t('indoorAir.roomScore.hint')}</Text>
      </View>
    );
  }

  function renderAlerts() {
    return (
      <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>{t('indoorAir.alert.title')}</Text>
        {alertHistory.length === 0 ? (
          <Text style={{ color: subtext }}>{t('indoorAir.alert.noAlerts')}</Text>
        ) : alertHistory.map((alert, i) => (
          <View key={i} style={[styles.alertItem, { borderColor: '#EF4444' }]}>
            <Text style={{ color: '#EF4444' }}>⚠️ {alert}</Text>
          </View>
        ))}
        <Text style={[styles.hint, { color: subtext, marginTop: 10 }]}>{t('indoorAir.alert.hint')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <ScrollView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: text }]}>{t('title')}</Text>
          <Text style={[styles.headerSub, { color: subtext }]}>{t('subtitle')}</Text>
        </View>

        {/* Section Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs}>
          {(['log', 'resp', 'correlation', 'rooms', 'alert'] as const).map(section => (
            <TouchableOpacity key={section} onPress={() => setActiveSection(section)} style={[styles.sectionTab, activeSection === section && { backgroundColor: primary }]} accessibilityLabel={`${section === 'log' ? t('indoorAir.tabs.airLog') : section === 'resp' ? t('indoorAir.tabs.respiratory') : section === 'correlation' ? t('indoorAir.tabs.correlation') : section === 'rooms' ? t('indoorAir.tabs.roomScore') : t('indoorAir.tabs.alert')} tab`}>
              <Text style={{ color: activeSection === section ? '#fff' : subtext, fontSize: 13 }}>
                {section === 'log' ? t('indoorAir.tabs.airLog') : section === 'resp' ? t('indoorAir.tabs.respiratory') : section === 'correlation' ? t('indoorAir.tabs.correlation') : section === 'rooms' ? t('indoorAir.tabs.roomScore') : t('indoorAir.tabs.alert')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        <View style={styles.content}>
          {activeSection === 'log' && renderAirLogList()}
          {activeSection === 'resp' && renderRespList()}
          {activeSection === 'correlation' && renderCorrelation()}
          {activeSection === 'rooms' && renderRoomScores()}
          {activeSection === 'alert' && renderAlerts()}
        </View>
      </ScrollView>

      {/* FAB — Add Air Log */}
      {activeSection === 'log' && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: primary }]} onPress={() => setShowAirModal(true)} accessibilityLabel={t('indoorAir.airLog.add')}>
          <Text style={styles.fabText}>+ {t('indoorAir.airLog.add')}</Text>
        </TouchableOpacity>
      )}

      {/* FAB — Add Resp Event */}
      {activeSection === 'resp' && (
        <TouchableOpacity style={[styles.fab, { backgroundColor: '#DC2626' }]} onPress={() => setShowRespModal(true)} accessibilityLabel={t('indoorAir.respiratory.add')}>
          <Text style={styles.fabText}>+ {t('indoorAir.respiratory.add')}</Text>
        </TouchableOpacity>
      )}

      {/* Air Log Modal */}
      <Modal visible={showAirModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>{t('indoorAir.airLog.addNew')}</Text>
            <View style={styles.formRow}><Text style={{ color: text }}>{t('indoorAir.airLog.purifier')}</Text><TouchableOpacity onPress={() => setPurifierOn(!purifierOn)} style={[styles.toggle, { backgroundColor: purifierOn ? primary : border }]} accessibilityLabel={`${t('indoorAir.airLog.purifier')} ${purifierOn ? 'ON' : 'OFF'}`}><Text style={{ color: '#fff' }}>{purifierOn ? 'ON' : 'OFF'}</Text></TouchableOpacity></View>
            <View style={styles.formRow}><Text style={{ color: text }}>{t('indoorAir.airLog.window')}</Text><TextInput style={[styles.input, { color: text, borderColor: border }]} value={windowMinutes} onChangeText={setWindowMinutes} keyboardType="numeric" placeholder="0" placeholderTextColor={subtext} /></View>
            <View style={styles.formRow}><Text style={{ color: text }}>{t('indoorAir.airLog.candles')}</Text><TouchableOpacity onPress={() => setCandlesIncense(!candlesIncense)} style={[styles.toggle, { backgroundColor: candlesIncense ? '#F59E0B' : border }]} accessibilityLabel={`${t('indoorAir.airLog.candles')} ${candlesIncense ? 'ON' : 'OFF'}`}><Text style={{ color: '#fff' }}>{candlesIncense ? 'ON' : 'OFF'}</Text></TouchableOpacity></View>
            <View style={styles.formRow}><Text style={{ color: text }}>{t('indoorAir.airLog.cleaning')}</Text><TouchableOpacity onPress={() => setCleaningProducts(!cleaningProducts)} style={[styles.toggle, { backgroundColor: cleaningProducts ? '#F59E0B' : border }]} accessibilityLabel={`${t('indoorAir.airLog.cleaning')} ${cleaningProducts ? 'ON' : 'OFF'}`}><Text style={{ color: '#fff' }}>{cleaningProducts ? 'ON' : 'OFF'}</Text></TouchableOpacity></View>
            <View style={styles.formRow}><Text style={{ color: text }}>{t('indoorAir.airLog.cooking')}</Text><TouchableOpacity onPress={() => setCookingEvent(!cookingEvent)} style={[styles.toggle, { backgroundColor: cookingEvent ? '#F59E0B' : border }]} accessibilityLabel={`${t('indoorAir.airLog.cooking')} ${cookingEvent ? 'ON' : 'OFF'}`}><Text style={{ color: '#fff' }}>{cookingEvent ? 'ON' : 'OFF'}</Text></TouchableOpacity></View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: border }]} onPress={() => { setShowAirModal(false); resetAirForm(); }} accessibilityLabel={t('common.cancel')}><Text style={{ color: text }}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: primary }]} onPress={handleAddAirLog} accessibilityLabel={t('common.save')}><Text style={{ color: '#fff' }}>{t('common.save')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Respiratory Event Modal */}
      <Modal visible={showRespModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: card }]}>
            <Text style={[styles.modalTitle, { color: text }]}>{t('indoorAir.respiratory.addNew')}</Text>
            <View style={styles.formRow}><Text style={{ color: text }}>{t('indoorAir.respiratory.coughCount')}</Text><TextInput style={[styles.input, { color: text, borderColor: border }]} value={coughCount} onChangeText={setCoughCount} keyboardType="numeric" placeholder="0" placeholderTextColor={subtext} /></View>
            <Text style={{ color: subtext, marginBottom: 4 }}>{t('indoorAir.respiratory.wheezeSeverity')}: {getWheezeLabel(wheezeSeverity, t)}</Text>
            <View style={styles.severityRow}>
              {[0, 1, 2, 3].map(s => <TouchableOpacity key={s} onPress={() => setWheezeSeverity(s)} style={[styles.sevBtn, { backgroundColor: wheezeSeverity === s ? primary : border }]} accessibilityLabel={`${t('indoorAir.respiratory.wheezeSeverity')} ${s}`}><Text style={{ color: wheezeSeverity === s ? '#fff' : subtext }}>{s}</Text></TouchableOpacity>)}
            </View>
            <Text style={{ color: subtext, marginBottom: 4 }}>{t('indoorAir.respiratory.congestionScore')}: {getCongestionLabel(congestionScore, t)}</Text>
            <View style={styles.severityRow}>
              {[0, 1, 2, 3, 4, 5].map(s => <TouchableOpacity key={s} onPress={() => setCongestionScore(s)} style={[styles.sevBtn, { backgroundColor: congestionScore === s ? '#DC2626' : border }]} accessibilityLabel={`${t('indoorAir.respiratory.congestionScore')} ${s}`}><Text style={{ color: congestionScore === s ? '#fff' : subtext }}>{s}</Text></TouchableOpacity>)}
            </View>
            <View style={styles.formRow}><Text style={{ color: text }}>{t('indoorAir.respiratory.reliever')}</Text><TouchableOpacity onPress={() => setRelieverUsed(!relieverUsed)} style={[styles.toggle, { backgroundColor: relieverUsed ? primary : border }]} accessibilityLabel={`${t('indoorAir.respiratory.reliever')} ${relieverUsed ? 'YES' : 'NO'}`}><Text style={{ color: '#fff' }}>{relieverUsed ? 'YES' : 'NO'}</Text></TouchableOpacity></View>
            {relieverUsed && <TextInput style={[styles.input, { color: text, borderColor: border }]} value={relieverType} onChangeText={setRelieverType} placeholder={t('indoorAir.respiratory.relieverTypePlaceholder')} placeholderTextColor={subtext} />}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: border }]} onPress={() => { setShowRespModal(false); resetRespForm(); }} accessibilityLabel={t('common.cancel')}><Text style={{ color: text }}>{t('common.cancel')}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#DC2626' }]} onPress={handleAddRespEvent} accessibilityLabel={t('common.save')}><Text style={{ color: '#fff' }}>{t('common.save')}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 2 },
  sectionTabs: { paddingHorizontal: 12, marginBottom: 8 },
  sectionTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginHorizontal: 4, backgroundColor: '#E5E7EB' },
  content: { padding: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  cardDate: { fontSize: 12, marginBottom: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 100, marginBottom: 8 },
  chartBarGroup: { flex: 1, alignItems: 'center' },
  chartDate: { fontSize: 9, marginBottom: 2 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  barVoc: { width: 6, backgroundColor: '#3B82F6', borderRadius: 2 },
  barResp: { width: 6, backgroundColor: '#EF4444', borderRadius: 2 },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4 },
  roomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  scoreButtons: { flexDirection: 'row', gap: 4 },
  scoreBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, marginTop: 6 },
  alertItem: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 8, paddingVertical: 4 },
  fab: { position: 'absolute', bottom: 24, right: 24, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4 },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  formRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 120, textAlign: 'right' },
  toggle: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  severityRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  sevBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
});

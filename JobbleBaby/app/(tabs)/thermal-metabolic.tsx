import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { STORAGE_KEYS } from '../../store/storage-keys';

const THERMAL_READINGS_KEY = STORAGE_KEYS.THERMAL_READINGS;
const BROWN_FAT_SESSIONS_KEY = STORAGE_KEYS.BROWN_FAT_SESSIONS;
const METABOLIC_MEAL_LOG_KEY = STORAGE_KEYS.METABOLIC_MEAL_LOG;
const THERMAL_FEEDING_CORR_KEY = STORAGE_KEYS.THERMAL_FEEDING_CORRELATION;

interface ThermalReading {
  id: string;
  date: string;
  location: string;
  temperature_c: number;
  togs_worn: number;
  thermal_zone: 'cold' | 'optimal' | 'warm';
}

interface BrownFatSession {
  id: string;
  date: string;
  duration_min: number;
  pre_temp: number;
  post_temp: number;
  feeding_after: boolean;
  type: 'kangaroo_care' | 'bath' | 'cold_exposure';
}

interface MetabolicMealEntry {
  id: string;
  date: string;
  time: string;
  food_type: string;
  amount_ml: number;
  hunger_level_pre: number;
  satiety_level_post: number;
  thermal_state_during: 'cold' | 'optimal' | 'warm';
}

interface ThermalFeedingCorr {
  id: string;
  date: string;
  thermal_zone: 'cold' | 'optimal' | 'warm';
  feeding_quality_score: number;
  notes: string;
}

type TabView = 'dashboard' | 'brown_fat' | 'hormone_curve' | 'comfort_zone' | 'feeding_corr' | 'meal_timing' | 'kc_session' | 'growth_velocity';

export default function ThermalMetabolic() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [thermalReadings, setThermalReadings] = useState<ThermalReading[]>([]);
  const [brownFatSessions, setBrownFatSessions] = useState<BrownFatSession[]>([]);
  const [metabolicMeals, setMetabolicMeals] = useState<MetabolicMealEntry[]>([]);
  const [thermalCorrs, setThermalCorrs] = useState<ThermalFeedingCorr[]>([]);

  // Dashboard state
  const [roomTemp, setRoomTemp] = useState('');
  const [togsWorn, setTogsWorn] = useState('');
  const [babyTemp, setBabyTemp] = useState('');

  // Brown fat state
  const [bfDuration, setBfDuration] = useState('');
  const [bfPreTemp, setBfPreTemp] = useState('');
  const [bfPostTemp, setBfPostTemp] = useState('');
  const [bfType, setBfType] = useState<'kangaroo_care' | 'bath' | 'cold_exposure'>('kangaroo_care');

  // Hormone curve state
  const [lastFeedHour, setLastFeedHour] = useState(8);

  // Comfort zone state
  const [ambientTemp, setAmbientTemp] = useState('');
  const [clothingTogs, setClothingTogs] = useState('');

  // Feeding correlation state
  const [corrZone, setCorrZone] = useState<'cold' | 'optimal' | 'warm'>('optimal');
  const [corrScore, setCorrScore] = useState('7');
  const [corrNotes, setCorrNotes] = useState('');

  // KC session state
  const [kcDuration, setKcDuration] = useState('');
  const [kcPreTemp, setKcPreTemp] = useState('');
  const [kcPostTemp, setKcPostTemp] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [tr, bf, mm, tc] = await Promise.all([
        safeGetItem(THERMAL_READINGS_KEY),
        safeGetItem(BROWN_FAT_SESSIONS_KEY),
        safeGetItem(METABOLIC_MEAL_LOG_KEY),
        safeGetItem(THERMAL_FEEDING_CORR_KEY),
      ]);
      if (tr) setThermalReadings(JSON.parse(tr));
      if (bf) setBrownFatSessions(JSON.parse(bf));
      if (mm) setMetabolicMeals(JSON.parse(mm));
      if (tc) setThermalCorrs(JSON.parse(tc));
    } catch (e) { /* ignore */ }
  };

  const saveThermalReadings = async (data: ThermalReading[]) => {
    await safeSetItem(THERMAL_READINGS_KEY, JSON.stringify(data));
    setThermalReadings(data);
  };

  const saveBrownFatSessions = async (data: BrownFatSession[]) => {
    await safeSetItem(BROWN_FAT_SESSIONS_KEY, JSON.stringify(data));
    setBrownFatSessions(data);
  };

  const saveMetabolicMeals = async (data: MetabolicMealEntry[]) => {
    await safeSetItem(METABOLIC_MEAL_LOG_KEY, JSON.stringify(data));
    setMetabolicMeals(data);
  };

  const saveThermalCorrs = async (data: ThermalFeedingCorr[]) => {
    await safeSetItem(THERMAL_FEEDING_CORR_KEY, JSON.stringify(data));
    setThermalCorrs(data);
  };

  const getThermalZone = (temp: number, togs: number): 'cold' | 'optimal' | 'warm' => {
    const effectiveTemp = temp + (togs * 0.5);
    if (effectiveTemp < 36.5) return 'cold';
    if (effectiveTemp > 37.5) return 'warm';
    return 'optimal';
  };

  const getComfortZoneStatus = (): { status: 'cold' | 'optimal' | 'warm'; message: string } => {
    const amb = parseFloat(ambientTemp);
    const togs = parseInt(clothingTogs);
    if (isNaN(amb) || isNaN(togs)) return { status: 'optimal', message: t('thermalMetabolic.enterData') };
    const effective = amb + (togs * 0.5);
    if (effective < 36.0) return { status: 'cold', message: t('thermalMetabolic.coldStress') };
    if (effective > 37.5) return { status: 'warm', message: t('thermalMetabolic.heatStress') };
    return { status: 'optimal', message: t('thermalMetabolic.optimalZone') };
  };

  const getGhrelinLeptinCurve = () => {
    const hour = new Date().getHours();
    // Ghrelin peaks around 6-9 AM and 6-9 PM (hunger)
    // Leptin peaks after meals and during rest
    const ghrelinBase = Math.sin((hour - 6) * Math.PI / 12) * 0.5 + 0.5;
    const leptinBase = Math.cos((hour - 12) * Math.PI / 12) * 0.5 + 0.5;
    return { ghrelin: Math.max(0, ghrelinBase), leptin: Math.max(0, leptinBase), hour };
  };

  const getOptimalFeedingWindows = (): string[] => {
    const hour = new Date().getHours();
    const windows: string[] = [];
    // Peak ghrelin windows
    [6, 7, 8, 18, 19, 20].forEach(h => {
      const diff = Math.abs(h - hour);
      if (diff <= 1) windows.push(`${h}:00 — ${t('thermalMetabolic.peakHunger')}`);
    });
    return windows;
  };

  const handleAddThermalReading = async () => {
    const temp = parseFloat(roomTemp);
    const togs = parseInt(togsWorn);
    if (isNaN(temp) || isNaN(togs)) {
      Alert.alert(t('thermalMetabolic.error'), t('thermalMetabolic.enterValidData'));
      return;
    }
    const zone = getThermalZone(temp, togs);
    const entry: ThermalReading = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      location: 'home',
      temperature_c: temp,
      togs_worn: togs,
      thermal_zone: zone,
    };
    await saveThermalReadings([entry, ...thermalReadings]);
    setRoomTemp('');
    setTogsWorn('');
  };

  const handleAddBrownFatSession = async () => {
    const dur = parseInt(bfDuration);
    const pre = parseFloat(bfPreTemp);
    const post = parseFloat(bfPostTemp);
    if (isNaN(dur) || isNaN(pre) || isNaN(post)) {
      Alert.alert(t('thermalMetabolic.error'), t('thermalMetabolic.enterValidData'));
      return;
    }
    const entry: BrownFatSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration_min: dur,
      pre_temp: pre,
      post_temp: post,
      feeding_after: false,
      type: bfType,
    };
    await saveBrownFatSessions([entry, ...brownFatSessions]);
    setBfDuration('');
    setBfPreTemp('');
    setBfPostTemp('');
  };

  const handleAddThermalCorr = async () => {
    const score = parseInt(corrScore);
    if (isNaN(score)) {
      Alert.alert(t('thermalMetabolic.error'), t('thermalMetabolic.enterValidData'));
      return;
    }
    const entry: ThermalFeedingCorr = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      thermal_zone: corrZone,
      feeding_quality_score: score,
      notes: corrNotes,
    };
    await saveThermalCorrs([entry, ...thermalCorrs]);
    setCorrNotes('');
  };

  const handleAddKCSession = async () => {
    const dur = parseInt(kcDuration);
    const pre = parseFloat(kcPreTemp);
    const post = parseFloat(kcPostTemp);
    if (isNaN(dur) || isNaN(pre) || isNaN(post)) {
      Alert.alert(t('thermalMetabolic.error'), t('thermalMetabolic.enterValidData'));
      return;
    }
    const entry: BrownFatSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      duration_min: dur,
      pre_temp: pre,
      post_temp: post,
      feeding_after: false,
      type: 'kangaroo_care',
    };
    await saveBrownFatSessions([entry, ...brownFatSessions]);
    setKcDuration('');
    setKcPreTemp('');
    setKcPostTemp('');
  };

  const todayZone = thermalReadings.length > 0
    ? thermalReadings[0].thermal_zone
    : 'optimal';

  const zoneColor = (zone: string) => {
    if (zone === 'cold') return '#3B82F6';
    if (zone === 'warm') return '#EF4444';
    return '#22C55E';
  };

  const { ghrelin, leptin, hour } = getGhrelinLeptinCurve();
  const comfortStatus = getComfortZoneStatus();
  const feedingWindows = getOptimalFeedingWindows();

  const TabButton = ({ id, label }: { id: TabView; label: string }) => (
    <TouchableOpacity
      style={[styles.tabBtn, activeTab === id && styles.tabBtnActive]}
      onPress={() => setActiveTab(id)}
      accessibilityLabel={label}
    >
      <Text style={[styles.tabBtnText, activeTab === id && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderDashboard = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('thermalMetabolic.dashboardTitle')}</Text>
      <View style={styles.zoneCard}>
        <Text style={styles.zoneLabel}>{t('thermalMetabolic.todayThermalZone')}</Text>
        <View style={[styles.zoneBadge, { backgroundColor: zoneColor(todayZone) }]}>
          <Text style={styles.zoneBadgeText}>{t(`thermalMetabolic.${todayZone}`)}</Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.roomTemp')}</Text>
        <TextInput
          style={styles.input}
          value={roomTemp}
          onChangeText={setRoomTemp}
          placeholder="22-26°C"
          placeholderTextColor="#64748B"
          keyboardType="numeric"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.togsWorn')}</Text>
        <TextInput
          style={styles.input}
          value={togsWorn}
          onChangeText={setTogsWorn}
          placeholder="1-5 togs"
          placeholderTextColor="#64748B"
          keyboardType="numeric"
        />
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleAddThermalReading} accessibilityLabel={t('thermalMetabolic.logReading')}>
        <Text style={styles.addBtnText}>{t('thermalMetabolic.logReading')}</Text>
      </TouchableOpacity>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{brownFatSessions.length}</Text>
          <Text style={styles.metricLabel}>{t('thermalMetabolic.brownFatSessions')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{thermalCorrs.length}</Text>
          <Text style={styles.metricLabel}>{t('thermalMetabolic.feedingCorrs')}</Text>
        </View>
      </View>
    </View>
  );

  const renderBrownFat = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('thermalMetabolic.brownFatTitle')}</Text>
      <Text style={styles.sectionSubtitle}>{t('thermalMetabolic.brownFatSubtitle')}</Text>

      <View style={styles.typeSelector}>
        {(['kangaroo_care', 'bath', 'cold_exposure'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.typeBtn, bfType === type && styles.typeBtnActive]}
            onPress={() => setBfType(type)}
            accessibilityLabel={t(`thermalMetabolic.${type}`)}
          >
            <Text style={[styles.typeBtnText, bfType === type && styles.typeBtnTextActive]}>
              {t(`thermalMetabolic.${type}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.durationMin')}</Text>
        <TextInput style={styles.input} value={bfDuration} onChangeText={setBfDuration} placeholder="30" placeholderTextColor="#64748B" keyboardType="numeric" />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.preTemp')}</Text>
        <TextInput style={styles.input} value={bfPreTemp} onChangeText={setBfPreTemp} placeholder="36.5" placeholderTextColor="#64748B" keyboardType="numeric" />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.postTemp')}</Text>
        <TextInput style={styles.input} value={bfPostTemp} onChangeText={setBfPostTemp} placeholder="36.8" placeholderTextColor="#64748B" keyboardType="numeric" />
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleAddBrownFatSession} accessibilityLabel={t('thermalMetabolic.logSession')}>
        <Text style={styles.addBtnText}>{t('thermalMetabolic.logSession')}</Text>
      </TouchableOpacity>

      {brownFatSessions.length > 0 && (
        <View style={styles.historyList}>
          <Text style={styles.historyTitle}>{t('thermalMetabolic.recentSessions')}</Text>
          {brownFatSessions.slice(0, 5).map(s => (
            <View key={s.id} style={styles.historyItem}>
              <Text style={styles.historyText}>
                {t(`thermalMetabolic.${s.type}`)} — {s.duration_min}min | {s.pre_temp}°C → {s.post_temp}°C
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderHormoneCurve = () => {
    const markers = [];
    for (let h = 0; h < 24; h++) {
      const g = Math.sin((h - 6) * Math.PI / 12) * 0.5 + 0.5;
      const l = Math.cos((h - 12) * Math.PI / 12) * 0.5 + 0.5;
      const isNow = h === hour;
      markers.push({ hour: h, ghrelin: Math.max(0, g), leptin: Math.max(0, l), isNow });
    }
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('thermalMetabolic.hormoneCurveTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('thermalMetabolic.hormoneCurveSubtitle')}</Text>

        <View style={styles.curveContainer}>
          <View style={styles.curveYAxis}>
            <Text style={styles.curveAxisLabel}>{t('thermalMetabolic.high')}</Text>
            <Text style={styles.curveAxisLabel}>Low</Text>
          </View>
          <View style={styles.curveChart}>
            {markers.map((m, i) => (
              <View key={i} style={styles.curveBarGroup}>
                <View style={styles.curveBars}>
                  <View style={[styles.curveBar, styles.ghrelinBar, { height: m.ghrelin * 40 }]} />
                  <View style={[styles.curveBar, styles.leptinBar, { height: m.leptin * 40 }]} />
                </View>
                {m.isNow && <View style={styles.nowMarker} />}
                <Text style={styles.curveHourLabel}>{m.hour}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>{t('thermalMetabolic.ghrelin')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.legendText}>{t('thermalMetabolic.leptin')}</Text>
          </View>
        </View>

        <View style={styles.feedingWindows}>
          <Text style={styles.windowsTitle}>{t('thermalMetabolic.optimalWindows')}</Text>
          {feedingWindows.length > 0
            ? feedingWindows.map((w, i) => <Text key={i} style={styles.windowItem}>{w}</Text>)
            : <Text style={styles.noWindows}>{t('thermalMetabolic.noWindows')}</Text>
          }
        </View>
      </View>
    );
  };

  const renderComfortZone = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('thermalMetabolic.comfortZoneTitle')}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.ambientTemp')}</Text>
        <TextInput style={styles.input} value={ambientTemp} onChangeText={setAmbientTemp} placeholder="22" placeholderTextColor="#64748B" keyboardType="numeric" />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.clothingTogs')}</Text>
        <TextInput style={styles.input} value={clothingTogs} onChangeText={setClothingTogs} placeholder="2" placeholderTextColor="#64748B" keyboardType="numeric" />
      </View>

      <View style={[styles.zoneCard, { backgroundColor: zoneColor(comfortStatus.status) + '20', borderColor: zoneColor(comfortStatus.status) }]}>
        <Text style={[styles.zoneCardText, { color: zoneColor(comfortStatus.status) }]}>
          {comfortStatus.message}
        </Text>
      </View>

      <View style={styles.zoneGuide}>
        <Text style={styles.guideTitle}>{t('thermalMetabolic.zoneGuide')}</Text>
        <View style={styles.guideRow}>
          <View style={[styles.guideDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.guideText}>{t('thermalMetabolic.coldGuide')} (below 36.0 C)</Text>
        </View>
        <View style={styles.guideRow}>
          <View style={[styles.guideDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.guideText}>{t('thermalMetabolic.optimalGuide')} (36.0-37.5°C)</Text>
        </View>
        <View style={styles.guideRow}>
          <View style={[styles.guideDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.guideText}>{t('thermalMetabolic.warmGuide')} (above 37.5 C)</Text>
        </View>
      </View>
    </View>
  );

  const renderFeedingCorr = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('thermalMetabolic.feedingCorrTitle')}</Text>
      <Text style={styles.sectionSubtitle}>{t('thermalMetabolic.feedingCorrSubtitle')}</Text>

      <View style={styles.zoneSelector}>
        {(['cold', 'optimal', 'warm'] as const).map(zone => (
          <TouchableOpacity
            key={zone}
            style={[styles.zoneSelBtn, { borderColor: zoneColor(zone) }, corrZone === zone && { backgroundColor: zoneColor(zone) }]}
            onPress={() => setCorrZone(zone)}
          >
            <Text style={[styles.zoneSelBtnText, corrZone === zone && { color: '#fff' }]}>
              {t(`thermalMetabolic.${zone}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.feedingQualityScore')}</Text>
        <View style={styles.scoreRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.scoreBtn, parseInt(corrScore) === s && styles.scoreBtnActive]}
              onPress={() => setCorrScore(s.toString())}
            >
              <Text style={[styles.scoreBtnText, parseInt(corrScore) === s && styles.scoreBtnTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.notes')}</Text>
        <TextInput style={[styles.input, styles.textArea]} value={corrNotes} onChangeText={setCorrNotes} placeholder={t('thermalMetabolic.notesPlaceholder')} placeholderTextColor="#64748B" multiline />
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleAddThermalCorr} accessibilityLabel={t('thermalMetabolic.logCorr')}>
        <Text style={styles.addBtnText}>{t('thermalMetabolic.logCorr')}</Text>
      </TouchableOpacity>

      {thermalCorrs.length > 0 && (
        <View style={styles.historyList}>
          <Text style={styles.historyTitle}>{t('thermalMetabolic.recentCorrs')}</Text>
          {thermalCorrs.slice(0, 5).map(c => (
            <View key={c.id} style={styles.historyItem}>
              <Text style={styles.historyText}>
                {t(`thermalMetabolic.${c.thermal_zone}`)} | Score: {c.feeding_quality_score}/10
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderMealTiming = () => {
    const curve = [];
    for (let h = 0; h < 24; h++) {
      const g = Math.sin((h - 6) * Math.PI / 12) * 0.5 + 0.5;
      curve.push({ hour: h, ghrelin: Math.max(0, g) });
    }
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('thermalMetabolic.mealTimingTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('thermalMetabolic.mealTimingSubtitle')}</Text>

        <View style={styles.timingBars}>
          {curve.map((c, i) => (
            <View key={i} style={styles.timingBarContainer}>
              <View style={[styles.timingBar, { height: c.ghrelin * 50, backgroundColor: c.ghrelin > 0.7 ? '#F59E0B' : c.ghrelin > 0.4 ? '#22C55E' : '#334155' }]} />
              <Text style={styles.timingHour}>{c.hour}</Text>
            </View>
          ))}
        </View>

        <View style={styles.peakWindows}>
          <Text style={styles.windowsTitle}>{t('thermalMetabolic.peakFeedingWindows')}</Text>
          {['06:00-09:00', '18:00-21:00'].map(w => (
            <View key={w} style={styles.peakWindowItem}>
              <Text style={styles.peakWindowText}>{w}</Text>
              <Text style={styles.peakWindowDesc}>{t('thermalMetabolic.peakHunger')}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderKCSession = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('thermalMetabolic.kcSessionTitle')}</Text>
      <Text style={styles.sectionSubtitle}>{t('thermalMetabolic.kcSessionSubtitle')}</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.durationMin')}</Text>
        <TextInput style={styles.input} value={kcDuration} onChangeText={setKcDuration} placeholder="60" placeholderTextColor="#64748B" keyboardType="numeric" />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.preTemp')}</Text>
        <TextInput style={styles.input} value={kcPreTemp} onChangeText={setKcPreTemp} placeholder="36.2" placeholderTextColor="#64748B" keyboardType="numeric" />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{t('thermalMetabolic.postTemp')}</Text>
        <TextInput style={styles.input} value={kcPostTemp} onChangeText={setKcPostTemp} placeholder="36.6" placeholderTextColor="#64748B" keyboardType="numeric" />
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={handleAddKCSession} accessibilityLabel={t('thermalMetabolic.logKCSession')}>
        <Text style={styles.addBtnText}>{t('thermalMetabolic.logKCSession')}</Text>
      </TouchableOpacity>

      {brownFatSessions.filter(s => s.type === 'kangaroo_care').length > 0 && (
        <View style={styles.historyList}>
          <Text style={styles.historyTitle}>{t('thermalMetabolic.kcHistory')}</Text>
          {brownFatSessions.filter(s => s.type === 'kangaroo_care').slice(0, 5).map(s => (
            <View key={s.id} style={styles.historyItem}>
              <Text style={styles.historyText}>
                {s.duration_min}min | {s.pre_temp}°C → {s.post_temp}°C | Δ {(s.post_temp - s.pre_temp).toFixed(1)}°C
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderGrowthVelocity = () => {
    const totalSessions = brownFatSessions.length;
    const avgTempDelta = brownFatSessions.length > 0
      ? brownFatSessions.reduce((sum, s) => sum + (s.post_temp - s.pre_temp), 0) / brownFatSessions.length
      : 0;
    const optimalCorrs = thermalCorrs.filter(c => c.thermal_zone === 'optimal').length;
    const corrRate = thermalCorrs.length > 0 ? (optimalCorrs / thermalCorrs.length) * 100 : 0;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('thermalMetabolic.growthVelocityTitle')}</Text>
        <Text style={styles.sectionSubtitle}>{t('thermalMetabolic.growthVelocitySubtitle')}</Text>

        <View style={styles.velocityCard}>
          <Text style={styles.velocityLabel}>{t('thermalMetabolic.thermalExpenditure')}</Text>
          <View style={styles.velocityBar}>
            <View style={[styles.velocityFill, { width: `${Math.min(100, totalSessions * 10)}%` }]} />
          </View>
          <Text style={styles.velocityDesc}>{t('thermalMetabolic.thermalExpenditureDesc')}</Text>
        </View>

        <View style={styles.velocityCard}>
          <Text style={styles.velocityLabel}>{t('thermalMetabolic.brownFatActivation')}</Text>
          <View style={styles.velocityBar}>
            <View style={[styles.velocityFill, { width: `${Math.min(100, avgTempDelta * 50)}%`, backgroundColor: '#F59E0B' }]} />
          </View>
          <Text style={styles.velocityDesc}>{t('thermalMetabolic.avgTempDelta')}: {avgTempDelta.toFixed(2)}°C</Text>
        </View>

        <View style={styles.velocityCard}>
          <Text style={styles.velocityLabel}>{t('thermalMetabolic.feedingAlignment')}</Text>
          <View style={styles.velocityBar}>
            <View style={[styles.velocityFill, { width: `${corrRate}%`, backgroundColor: '#22C55E' }]} />
          </View>
          <Text style={styles.velocityDesc}>{corrRate.toFixed(0)}% feeds in optimal thermal zone</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabNav}>
        {[
          { id: 'dashboard', label: t('thermalMetabolic.dashboard') },
          { id: 'brown_fat', label: t('thermalMetabolic.brownFat') },
          { id: 'hormone_curve', label: t('thermalMetabolic.hormoneCurve') },
          { id: 'comfort_zone', label: t('thermalMetabolic.comfortZone') },
          { id: 'feeding_corr', label: t('thermalMetabolic.feedingCorr') },
          { id: 'meal_timing', label: t('thermalMetabolic.mealTiming') },
          { id: 'kc_session', label: t('thermalMetabolic.kcSession') },
          { id: 'growth_velocity', label: t('thermalMetabolic.growthVelocity') },
        ].map(tab => (
          <TabButton key={tab.id} id={tab.id as TabView} label={tab.label} />
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'brown_fat' && renderBrownFat()}
        {activeTab === 'hormone_curve' && renderHormoneCurve()}
        {activeTab === 'comfort_zone' && renderComfortZone()}
        {activeTab === 'feeding_corr' && renderFeedingCorr()}
        {activeTab === 'meal_timing' && renderMealTiming()}
        {activeTab === 'kc_session' && renderKCSession()}
        {activeTab === 'growth_velocity' && renderGrowthVelocity()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  tabNav: { maxHeight: 48, backgroundColor: '#1E293B', paddingHorizontal: 8 },
  content: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#94A3B8', marginBottom: 16 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 10, marginRight: 4, borderRadius: 8, backgroundColor: 'transparent' },
  tabBtnActive: { backgroundColor: '#3B82F6' },
  tabBtnText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  tabBtnTextActive: { color: '#fff' },
  zoneCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  zoneLabel: { fontSize: 13, color: '#94A3B8', marginBottom: 8 },
  zoneBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  zoneBadgeText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  zoneCardText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, color: '#94A3B8', marginBottom: 6 },
  input: { backgroundColor: '#1E293B', borderRadius: 8, padding: 12, color: '#F8FAFC', fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  addBtn: { backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  metricCard: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 16, alignItems: 'center' },
  metricValue: { fontSize: 28, fontWeight: '700', color: '#F8FAFC' },
  metricLabel: { fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  typeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  typeBtnActive: { borderColor: '#F59E0B', backgroundColor: '#F59E0B20' },
  typeBtnText: { fontSize: 11, color: '#94A3B8' },
  typeBtnTextActive: { color: '#F59E0B' },
  historyList: { marginTop: 16 },
  historyTitle: { fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginBottom: 8 },
  historyItem: { backgroundColor: '#1E293B', borderRadius: 8, padding: 10, marginBottom: 6 },
  historyText: { fontSize: 12, color: '#94A3B8' },
  curveContainer: { flexDirection: 'row', marginBottom: 16 },
  curveYAxis: { justifyContent: 'space-between', paddingVertical: 4, marginRight: 8 },
  curveAxisLabel: { fontSize: 10, color: '#64748B' },
  curveChart: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', height: 80, borderBottomWidth: 1, borderBottomColor: '#334155' },
  curveBarGroup: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  curveBars: { alignItems: 'center', justifyContent: 'flex-end', height: 40 },
  curveBar: { width: 3, borderRadius: 2, marginHorizontal: 1 },
  ghrelinBar: { backgroundColor: '#F59E0B' },
  leptinBar: { backgroundColor: '#8B5CF6' },
  nowMarker: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', position: 'absolute', top: -4 },
  curveHourLabel: { fontSize: 8, color: '#64748B', marginTop: 2 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#94A3B8' },
  feedingWindows: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  windowsTitle: { fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginBottom: 8 },
  windowItem: { fontSize: 13, color: '#F59E0B', marginBottom: 4 },
  noWindows: { fontSize: 13, color: '#64748B' },
  zoneGuide: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginTop: 16 },
  guideTitle: { fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginBottom: 8 },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  guideDot: { width: 10, height: 10, borderRadius: 5 },
  guideText: { fontSize: 13, color: '#94A3B8' },
  zoneSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  zoneSelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 2, alignItems: 'center' },
  zoneSelBtnText: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  scoreRow: { flexDirection: 'row', gap: 4 },
  scoreBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1E293B', alignItems: 'center' },
  scoreBtnActive: { backgroundColor: '#3B82F6' },
  scoreBtnText: { fontSize: 12, color: '#64748B' },
  scoreBtnTextActive: { color: '#fff', fontWeight: '600' },
  timingBars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, marginBottom: 16 },
  timingBarContainer: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  timingBar: { width: 8, borderRadius: 4, marginHorizontal: 1 },
  timingHour: { fontSize: 8, color: '#64748B', marginTop: 2 },
  peakWindows: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  peakWindowItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  peakWindowText: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  peakWindowDesc: { fontSize: 12, color: '#94A3B8' },
  velocityCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12 },
  velocityLabel: { fontSize: 14, fontWeight: '600', color: '#F8FAFC', marginBottom: 8 },
  velocityBar: { height: 12, backgroundColor: '#334155', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  velocityFill: { height: '100%', borderRadius: 6, backgroundColor: '#3B82F6' },
  velocityDesc: { fontSize: 12, color: '#94A3B8' },
});

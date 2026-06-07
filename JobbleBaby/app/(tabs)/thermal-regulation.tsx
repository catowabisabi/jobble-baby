import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { onNewGrowthEntry } from '../utils/badgeService';

const THERMAL_LOG_KEY = '@jobble/thermal_log';
const THERMAL_ALERT_THRESHOLD_KEY = '@jobble/thermal_alert_threshold';
const FEVER_EPISODE_KEY = '@jobble/fever_episode';
const CAR_TEMP_ALERT_KEY = '@jobble/car_temp_alert_enabled';

interface ThermalEntry {
  id: string;
  timestamp: string;
  bodyTemp: number;
  bodyTempType: 'axillary' | 'ear' | 'forehead';
  ambientTemp: number;
  clothingLayers: number;
  sweatLevel: 'none' | 'damp' | 'wet';
}

interface FeverEpisode {
  id: string;
  timestamp: string;
  temp: number;
  tempType: 'rectal' | 'ear' | 'axillary';
  duration: string;
  treatment: string;
  feedingChange: string;
}

interface AlertThreshold {
  ambientTemp: number;
  clothingLayers: number;
}

function getThermalColor(temp: number): string {
  if (temp < 35.6) return '#60A5FA';
  if (temp < 36.1) return '#34D399';
  if (temp <= 37.2) return '#10B981';
  if (temp <= 37.7) return '#FBBF24';
  return '#EF4444';
}

function getThermalLabel(temp: number): string {
  if (temp < 35.6) return 'cold';
  if (temp < 36.1) return 'cool';
  if (temp <= 37.2) return 'optimal';
  if (temp <= 37.7) return 'warm';
  return 'hot';
}

function calcSleepEnvScore(ambient: number, clothing: number): { score: string; color: string; recommendation: string } {
  if (ambient >= 16 && ambient <= 20 && clothing <= 2) {
    return { score: 'optimal', color: '#10B981', recommendation: 'idealSleepEnvironment' };
  } else if (ambient > 20 || clothing > 2) {
    return { score: 'warmer', color: '#F59E0B', recommendation: 'reduceLayersOrTemp' };
  }
  return { score: 'cooler', color: '#60A5FA', recommendation: 'addLayerOrWarmRoom' };
}

function checkOverheatingRisk(ambient: number, clothing: number, threshold: AlertThreshold): boolean {
  return ambient > threshold.ambientTemp && clothing > threshold.clothingLayers;
}

function isFever(temp: number, type: 'rectal' | 'ear' | 'axillary'): boolean {
  if (type === 'rectal' || type === 'ear') return temp > 38;
  return temp > 37.5;
}

export default function ThermalRegulationScreen() {
  const { t } = useLanguage();
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<ThermalEntry[]>([]);
  const [bodyTemp, setBodyTemp] = useState('');
  const [bodyTempType, setBodyTempType] = useState<'axillary' | 'ear' | 'forehead'>('axillary');
  const [ambientTemp, setAmbientTemp] = useState('');
  const [clothingLayers, setClothingLayers] = useState(1);
  const [sweatLevel, setSweatLevel] = useState<'none' | 'damp' | 'wet'>('none');

  const [threshold, setThreshold] = useState<AlertThreshold>({ ambientTemp: 24, clothingLayers: 2 });

  const [feverEpisodes, setFeverEpisodes] = useState<FeverEpisode[]>([]);
  const [feverTemp, setFeverTemp] = useState('');
  const [feverTempType, setFeverTempType] = useState<'rectal' | 'ear' | 'axillary'>('axillary');
  const [feverDuration, setFeverDuration] = useState('');
  const [feverTreatment, setFeverTreatment] = useState('');
  const [feverFeedingChange, setFeverFeedingChange] = useState('');

  const [coolingActive, setCoolingActive] = useState(false);
  const [coolingTimeLeft, setCoolingTimeLeft] = useState(600);

  const [carAlertEnabled, setCarAlertEnabled] = useState(true);
  const [activeSection, setActiveSection] = useState('temperatureLog');

  useEffect(() => {
    loadThermalLog();
    loadAlertThreshold();
    loadFeverEpisodes();
    loadCarAlertSetting();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (coolingActive && coolingTimeLeft > 0) {
      interval = setInterval(() => {
        setCoolingTimeLeft(prev => {
          if (prev <= 1) { setCoolingActive(false); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [coolingActive, coolingTimeLeft]);

  useEffect(() => {
    if (entries.length > 0) {
      const latest = entries[0];
      if (checkOverheatingRisk(latest.ambientTemp, latest.clothingLayers, threshold)) {
        Alert.alert(t('thermal.overheatingRisk'), t('thermal.removeLayerAdvice'), [{ text: 'OK', style: 'default' }]);
      }
    }
  }, [entries, threshold]);

  const loadThermalLog = async () => {
    try {
      const data = await AsyncStorage.getItem(THERMAL_LOG_KEY);
      if (data) setEntries(JSON.parse(data));
    } catch (e) { /* ignore */ }
  };

  const loadAlertThreshold = async () => {
    try {
      const data = await AsyncStorage.getItem(THERMAL_ALERT_THRESHOLD_KEY);
      if (data) setThreshold(JSON.parse(data));
    } catch (e) { /* ignore */ }
  };

  const loadFeverEpisodes = async () => {
    try {
      const data = await AsyncStorage.getItem(FEVER_EPISODE_KEY);
      if (data) setFeverEpisodes(JSON.parse(data));
    } catch (e) { /* ignore */ }
  };

  const loadCarAlertSetting = async () => {
    try {
      const data = await AsyncStorage.getItem(CAR_TEMP_ALERT_KEY);
      if (data !== null) setCarAlertEnabled(JSON.parse(data));
    } catch (e) { /* ignore */ }
  };

  const saveThermalEntry = async () => {
    const bt = parseFloat(bodyTemp);
    if (isNaN(bt) || bt < 30 || bt > 45) {
      Alert.alert(t('thermal.invalidTemp'), t('thermal.enterValidTemp'));
      return;
    }
    const at = parseFloat(ambientTemp);
    if (isNaN(at) || at < -10 || at > 50) {
      Alert.alert(t('thermal.invalidAmbient'), t('thermal.enterValidAmbient'));
      return;
    }
    const entry: ThermalEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      bodyTemp: bt,
      bodyTempType,
      ambientTemp: at,
      clothingLayers,
      sweatLevel,
    };
    const updated = [entry, ...entries].slice(0, 100);
    setEntries(updated);
    await AsyncStorage.setItem(THERMAL_LOG_KEY, JSON.stringify(updated));
    try { await onNewGrowthEntry(); } catch (e) { /* ignore badge errors */ }
    setBodyTemp('');
    setAmbientTemp('');
  };

  const saveFeverEpisode = async () => {
    const ft = parseFloat(feverTemp);
    if (isNaN(ft) || ft < 35 || ft > 42) {
      Alert.alert(t('thermal.invalidTemp'), t('thermal.enterValidTemp'));
      return;
    }
    const episode: FeverEpisode = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      temp: ft,
      tempType: feverTempType,
      duration: feverDuration,
      treatment: feverTreatment,
      feedingChange: feverFeedingChange,
    };
    const updated = [episode, ...feverEpisodes].slice(0, 50);
    setFeverEpisodes(updated);
    await AsyncStorage.setItem(FEVER_EPISODE_KEY, JSON.stringify(updated));
    if (isFever(ft, feverTempType)) {
      Alert.alert(t('thermal.feverDetected'), t('thermal.feverAdvice'), [{ text: 'OK', style: 'default' }]);
    }
    setFeverTemp('');
    setFeverDuration('');
    setFeverTreatment('');
    setFeverFeedingChange('');
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="thermometer" size={28} color={C.accent} />
          <Text style={[styles.headerTitle, { color: C.text }]}>{t('thermal.title')}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {[
            { key: 'temperatureLog', label: t('thermal.tempLog') },
            { key: 'feverTracker', label: t('thermal.feverTracker') },
            { key: 'coolingGuide', label: t('thermal.evaporativeCooling') },
            { key: 'sleepScore', label: t('thermal.sleepEnvScore') },
            { key: 'carAlert', label: t('thermal.carSeat') },
          ].map(sec => (
            <TouchableOpacity
              key={sec.key}
              accessibilityLabel={`Section: ${sec.label}`}
              style={[styles.sectionBtn, activeSection === sec.key && { backgroundColor: C.accent }]}
              onPress={() => setActiveSection(sec.key)}
            >
              <Text style={[styles.sectionBtnText, activeSection === sec.key && { color: '#fff' }]}>{sec.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeSection === 'temperatureLog' && (
          <View>
            <View style={[styles.card, { backgroundColor: C.card }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.tempLog')}</Text>

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.bodyTemp')}</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                  placeholder="36.5"
                  placeholderTextColor={C.muted}
                  keyboardType="decimal-pad"
                  value={bodyTemp}
                  onChangeText={setBodyTemp}
                  accessibilityLabel="Body temperature input"
                />
                <View style={styles.typeRow}>
                  {(['axillary', 'ear', 'forehead'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      accessibilityLabel={`Temperature type: ${type}`}
                      style={[styles.typeBtn, bodyTempType === type && { backgroundColor: C.accent }]}
                      onPress={() => setBodyTempType(type)}
                    >
                      <Text style={[styles.typeBtnText, bodyTempType === type && { color: '#fff' }]}>
                        {t(`thermal.${type}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.ambientTemp')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                placeholder="22"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={ambientTemp}
                onChangeText={setAmbientTemp}
                accessibilityLabel="Ambient temperature input"
              />

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.clothingLayers')}</Text>
              <View style={styles.layerRow}>
                {[1, 2, 3, 4, 5].map(layer => (
                  <TouchableOpacity
                    key={layer}
                    accessibilityLabel={`Clothing layer ${layer}`}
                    style={[styles.layerBtn, clothingLayers === layer && { backgroundColor: C.accent }]}
                    onPress={() => setClothingLayers(layer)}
                  >
                    <Text style={[styles.layerBtnText, clothingLayers === layer && { color: '#fff' }]}>{layer}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.sweatLevel')}</Text>
              <View style={styles.sweatRow}>
                {(['none', 'damp', 'wet'] as const).map(level => (
                  <TouchableOpacity
                    key={level}
                    accessibilityLabel={`Sweat level: ${level}`}
                    style={[styles.sweatBtn, sweatLevel === level && { backgroundColor: C.accent }]}
                    onPress={() => setSweatLevel(level)}
                  >
                    <Text style={[styles.sweatBtnText, sweatLevel === level && { color: '#fff' }]}>
                      {t(`thermal.${level}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: C.accent }]}
                activeOpacity={0.7}
                onPress={saveThermalEntry}
                accessibilityLabel="Save temperature entry"
              >
                <Text style={styles.saveBtnText}>{t('thermal.save')}</Text>
              </TouchableOpacity>
            </View>

            {entries.length > 0 && (
              <View style={[styles.card, { backgroundColor: C.card }]}>
                <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.timeline')}</Text>
                <View style={styles.timeline}>
                  {entries.slice(0, 20).map(entry => (
                    <View key={entry.id} style={styles.timelineItem}>
                      <View style={[styles.tempBar, { backgroundColor: getThermalColor(entry.bodyTemp), height: Math.max(20, entry.bodyTemp * 2 - 60) }]} />
                      <Text style={[styles.tempVal, { color: C.text }]}>{entry.bodyTemp}</Text>
                      <Text style={[styles.tempLabel, { color: C.muted }]}>{getThermalLabel(entry.bodyTemp)}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.legend}>
                  {[{ color: '#60A5FA', label: t('thermal.cold') }, { color: '#10B981', label: t('thermal.optimal') }, { color: '#EF4444', label: t('thermal.hot') }].map(item => (
                    <View key={item.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendText, { color: C.muted }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: C.card }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.history')}</Text>
              {entries.length === 0 ? (
                <Text style={[styles.emptyText, { color: C.muted }]}>{t('thermal.noEntries')}</Text>
              ) : entries.slice(0, 10).map(entry => (
                <View key={entry.id} style={styles.historyRow}>
                  <View style={[styles.historyDot, { backgroundColor: getThermalColor(entry.bodyTemp) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyDate, { color: C.text }]}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                    <Text style={[styles.historyDetail, { color: C.muted }]}>
                      {t(`thermal.${entry.bodyTempType}`)}: {entry.bodyTemp}C | {t('thermal.ambient')}: {entry.ambientTemp}C | {t('thermal.layers')}: {entry.clothingLayers}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeSection === 'feverTracker' && (
          <View>
            <View style={[styles.card, { backgroundColor: C.card }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.feverTracker')}</Text>

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.feverTemp')}</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border, flex: 1 }]}
                  placeholder="38.0"
                  placeholderTextColor={C.muted}
                  keyboardType="decimal-pad"
                  value={feverTemp}
                  onChangeText={setFeverTemp}
                  accessibilityLabel="Fever temperature input"
                />
                <View style={styles.typeRow}>
                  {(['rectal', 'ear', 'axillary'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      accessibilityLabel={`Fever temperature type: ${type}`}
                      style={[styles.typeBtn, feverTempType === type && { backgroundColor: C.accent }]}
                      onPress={() => setFeverTempType(type)}
                    >
                      <Text style={[styles.typeBtnText, feverTempType === type && { color: '#fff' }]}>
                        {t(`thermal.${type}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.duration')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                placeholder="2 hours"
                placeholderTextColor={C.muted}
                value={feverDuration}
                onChangeText={setFeverDuration}
                accessibilityLabel="Fever duration input"
              />

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.treatment')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                placeholder={t('thermal.paracetamolExample')}
                placeholderTextColor={C.muted}
                value={feverTreatment}
                onChangeText={setFeverTreatment}
                accessibilityLabel="Fever treatment input"
              />

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.feedingChange')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                placeholder={t('thermal.feedingChangeExample')}
                placeholderTextColor={C.muted}
                value={feverFeedingChange}
                onChangeText={setFeverFeedingChange}
                accessibilityLabel="Feeding change input"
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#EF4444' }]}
                activeOpacity={0.7}
                onPress={saveFeverEpisode}
                accessibilityLabel="Save fever episode"
              >
                <Text style={styles.saveBtnText}>{t('thermal.saveFever')}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: C.card }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.feverHistory')}</Text>
              {feverEpisodes.length === 0 ? (
                <Text style={[styles.emptyText, { color: C.muted }]}>{t('thermal.noFeverEntries')}</Text>
              ) : feverEpisodes.slice(0, 10).map(episode => {
                const feverReading = isFever(episode.temp, episode.tempType);
                return (
                  <View key={episode.id} style={styles.feverRow}>
                    <MaterialCommunityIcons name={feverReading ? 'alert-circle' : 'check-circle'} size={20} color={feverReading ? '#EF4444' : '#10B981'} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.feverDate, { color: C.text }]}>
                        {new Date(episode.timestamp).toLocaleString()} — {episode.temp}C ({t(`thermal.${episode.tempType}`)})
                      </Text>
                      {episode.duration ? <Text style={[styles.feverDetail, { color: C.muted }]}>{t('thermal.duration')}: {episode.duration}</Text> : null}
                      {episode.treatment ? <Text style={[styles.feverDetail, { color: C.muted }]}>{t('thermal.treatment')}: {episode.treatment}</Text> : null}
                      {episode.feedingChange ? <Text style={[styles.feverDetail, { color: C.muted }]}>{t('thermal.feedingChange')}: {episode.feedingChange}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {feverEpisodes.length > 0 && (
              <View style={[styles.alertCard, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <MaterialCommunityIcons name="information" size={20} color="#F59E0B" />
                <Text style={[styles.alertText, { color: '#92400E' }]}>{t('thermal.dehydrationWarning')}</Text>
              </View>
            )}
          </View>
        )}

        {activeSection === 'coolingGuide' && (
          <View>
            <View style={[styles.card, { backgroundColor: C.card }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.evaporativeCooling')}</Text>
              <Text style={[styles.cardDesc, { color: C.muted }]}>{t('thermal.evaporativeCoolingDesc')}</Text>

              <View style={styles.timerCard}>
                <Text style={[styles.timerText, { color: C.accent }]}>{formatTime(coolingTimeLeft)}</Text>
                <TouchableOpacity
                  style={[styles.timerBtn, { backgroundColor: coolingActive ? '#EF4444' : C.accent }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (coolingActive) { setCoolingActive(false); setCoolingTimeLeft(600); }
                    else { setCoolingActive(true); setCoolingTimeLeft(600); }
                  }}
                  accessibilityLabel={coolingActive ? 'Stop cooling timer' : 'Start cooling timer'}
                >
                  <Text style={styles.timerBtnText}>{coolingActive ? t('thermal.stopTimer') : t('thermal.startTimer')}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.subTitle, { color: C.text }]}>{t('thermal.pulsePoints')}</Text>
              {[
                { icon: 'human-male', name: t('thermal.groin'), desc: t('thermal.groinDesc') },
                { icon: 'human', name: t('thermal.axillae'), desc: t('thermal.axillaeDesc') },
                { icon: 'head-snowflake', name: t('thermal.neck'), desc: t('thermal.neckDesc') },
              ].map(point => (
                <View key={point.name} style={styles.pulsePoint}>
                  <MaterialCommunityIcons name={point.icon as any} size={24} color={C.accent} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={[styles.pulseName, { color: C.text }]}>{point.name}</Text>
                    <Text style={[styles.pulseDesc, { color: C.muted }]}>{point.desc}</Text>
                  </View>
                </View>
              ))}

              <Text style={[styles.subTitle, { color: C.text }]}>{t('thermal.steps')}</Text>
              {[t('thermal.step1'), t('thermal.step2'), t('thermal.step3'), t('thermal.step4')].map((step, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: C.accent }]}>
                    <Text style={styles.stepNumText}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: C.text }]}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeSection === 'sleepScore' && (
          <View>
            <View style={[styles.card, { backgroundColor: C.card }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.sleepEnvScore')}</Text>
              <Text style={[styles.cardDesc, { color: C.muted }]}>{t('thermal.sleepEnvScoreDesc')}</Text>

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.ambientTemp')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                placeholder="18-22"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={ambientTemp}
                onChangeText={setAmbientTemp}
                accessibilityLabel="Sleep environment temperature"
              />

              <Text style={[styles.inputLabel, { color: C.muted }]}>{t('thermal.clothingLayers')}</Text>
              <View style={styles.layerRow}>
                {[1, 2, 3, 4, 5].map(layer => (
                  <TouchableOpacity
                    key={layer}
                    accessibilityLabel={`Clothing layer ${layer}`}
                    style={[styles.layerBtn, clothingLayers === layer && { backgroundColor: C.accent }]}
                    onPress={() => setClothingLayers(layer)}
                  >
                    <Text style={[styles.layerBtnText, clothingLayers === layer && { color: '#fff' }]}>{layer}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {ambientTemp !== '' && (() => {
                const score = calcSleepEnvScore(parseFloat(ambientTemp) || 0, clothingLayers);
                return (
                  <View style={[styles.scoreCard, { backgroundColor: score.color + '22' }]}>
                    <Text style={[styles.scoreLabel, { color: score.color }]}>{t(`thermal.${score.score}`)}</Text>
                    <Text style={[styles.scoreRecommendation, { color: C.text }]}>{t(`thermal.${score.recommendation}`)}</Text>
                  </View>
                );
              })()}

              <View style={[styles.infoCard, { backgroundColor: '#ECFDF5' }]}>
                <MaterialCommunityIcons name="information" size={18} color="#10B981" />
                <Text style={[styles.infoText, { color: '#065F46' }]}>{t('thermal.optimalSleepRange')}</Text>
              </View>
            </View>
          </View>
        )}

        {activeSection === 'carAlert' && (
          <View>
            <View style={[styles.card, { backgroundColor: C.card }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.carSeat')}</Text>
              <Text style={[styles.cardDesc, { color: C.muted }]}>{t('thermal.carSeatDesc')}</Text>

              <TouchableOpacity
                style={[styles.toggleRow, { backgroundColor: carAlertEnabled ? '#ECFDF5' : C.background }]}
                activeOpacity={0.7}
                onPress={async () => {
                  const newVal = !carAlertEnabled;
                  setCarAlertEnabled(newVal);
                  await AsyncStorage.setItem(CAR_TEMP_ALERT_KEY, JSON.stringify(newVal));
                }}
                accessibilityLabel={carAlertEnabled ? 'Disable car seat alert' : 'Enable car seat alert'}
              >
                <MaterialCommunityIcons name={carAlertEnabled ? 'bell' : 'bell-off'} size={24} color={carAlertEnabled ? '#10B981' : C.muted} />
                <Text style={[styles.toggleText, { color: C.text }]}>
                  {carAlertEnabled ? t('thermal.carAlertEnabled') : t('thermal.carAlertDisabled')}
                </Text>
              </TouchableOpacity>
            </View>

            {entries.length >= 5 && (
              <View style={[styles.card, { backgroundColor: C.card }]}>
                <Text style={[styles.cardTitle, { color: C.text }]}>{t('thermal.correlationTitle')}</Text>
                <Text style={[styles.cardDesc, { color: C.muted }]}>{t('thermal.correlationDesc')}</Text>
                <View style={[styles.insightCard, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.insightText, { color: '#1E40AF' }]}>{t('thermal.correlationInsight')}</Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', marginLeft: 8 },
  sectionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F3F4F6' },
  sectionBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  cardDesc: { fontSize: 13, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  typeBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F3F4F6' },
  typeBtnText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  layerRow: { flexDirection: 'row', gap: 8 },
  layerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  layerBtnText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  sweatRow: { flexDirection: 'row', gap: 8 },
  sweatBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  sweatBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  saveBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  timeline: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4, marginBottom: 8 },
  timelineItem: { flex: 1, alignItems: 'center' },
  tempBar: { width: '100%', borderRadius: 4 },
  tempVal: { fontSize: 9, marginTop: 2 },
  tempLabel: { fontSize: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  historyDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  historyDate: { fontSize: 12, fontWeight: '600' },
  historyDetail: { fontSize: 11, marginTop: 2 },
  alertCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 8 },
  alertText: { fontSize: 13, flex: 1 },
  feverRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  feverDate: { fontSize: 13, fontWeight: '600' },
  feverDetail: { fontSize: 11, marginTop: 2 },
  timerCard: { alignItems: 'center', marginVertical: 16 },
  timerText: { fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  timerBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  subTitle: { fontSize: 15, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  pulsePoint: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  pulseName: { fontSize: 14, fontWeight: '600' },
  pulseDesc: { fontSize: 12, marginTop: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { fontSize: 13, flex: 1, lineHeight: 18 },
  scoreCard: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  scoreLabel: { fontSize: 24, fontWeight: '800' },
  scoreRecommendation: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 12, gap: 8 },
  infoText: { fontSize: 13, flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 12 },
  toggleText: { fontSize: 15, fontWeight: '600', flex: 1 },
  insightCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 12, gap: 8 },
  insightText: { fontSize: 13, flex: 1 },
});
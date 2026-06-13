import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STORAGE_KEYS } from '../../store/storage-keys';

const SECURITY_KEY = STORAGE_KEYS.IOT_SECURITY_ENTRIES;
const ALERTS_KEY = STORAGE_KEYS.IOT_ALERTS;

const BRANDS = [
  { id: 'nanit', name: 'Nanit', privacyUrl: 'https://nanit.com/privacy' },
  { id: 'owlet', name: 'Owlet', privacyUrl: 'https://owletcare.com/privacy' },
  { id: 'cubo', name: 'Cubo AI', privacyUrl: 'https://cuboai.com/privacy' },
  { id: 'smartthings', name: 'Samsung SmartThings', privacyUrl: 'https://samsung.com/privacy' },
  { id: 'infantoptics', name: 'Infant Optics', privacyUrl: 'https://infantoptics.com/privacy' },
  { id: 'motorola', name: 'Motorola Halo', privacyUrl: 'https://motorola.com/privacy' },
];

const CHECKLIST_TEMPLATE: Record<string, { key: string; label: string; help: string }[]> = {
  nanit: [
    { key: 'vlan', label: 'Network Isolation (VLAN)', help: 'Isolate Nanit on a separate VLAN from main network devices' },
    { key: 'firmware', label: 'Firmware Updated', help: 'Check for updates in Nanit app settings regularly' },
    { key: 'password', label: 'Default Password Changed', help: 'Change default admin password immediately after setup' },
    { key: '2fa', label: 'Two-Factor Authentication Enabled', help: 'Enable 2FA in Nanit account settings' },
    { key: 'privacy', label: 'Privacy Policy Reviewed', help: 'Review what data Nanit collects and how it is shared' },
  ],
  owlet: [
    { key: 'vlan', label: 'Network Isolation (VLAN)', help: 'Isolate Owlet cam on a separate VLAN from your main network' },
    { key: 'firmware', label: 'Firmware Updated', help: 'Check for firmware updates in the Owlet app' },
    { key: 'password', label: 'Default Password Changed', help: 'Change the default password on your Owlet account' },
    { key: '2fa', label: 'Two-Factor Authentication Enabled', help: 'Enable 2FA in your Owlet account settings' },
    { key: 'privacy', label: 'Privacy Policy Reviewed', help: 'Review data collection and sharing practices' },
  ],
  cubo: [
    { key: 'vlan', label: 'Network Isolation (VLAN)', help: 'Put Cubo AI camera on a dedicated baby monitor network' },
    { key: 'firmware', label: 'Firmware Updated', help: 'Keep Cubo app and firmware updated at all times' },
    { key: 'password', label: 'Default Password Changed', help: 'Change default credentials after first setup' },
    { key: '2fa', label: 'Two-Factor Authentication Enabled', help: 'Enable 2FA for added account security' },
    { key: 'privacy', label: 'Privacy Policy Reviewed', help: 'Understand what footage Cubo stores and for how long' },
  ],
  smartthings: [
    { key: 'vlan', label: 'Network Isolation (VLAN)', help: 'Isolate SmartThings hub on a separate VLAN' },
    { key: 'firmware', label: 'Firmware Updated', help: 'Keep SmartThings hub firmware current via app' },
    { key: 'password', label: 'Samsung Account Password Strong', help: 'Use a strong unique password for your Samsung account' },
    { key: '2fa', label: 'Two-Factor Authentication Enabled', help: 'Enable 2FA on your Samsung account' },
    { key: 'privacy', label: 'Privacy Policy Reviewed', help: 'Review SmartThings data sharing policies' },
  ],
  infantoptics: [
    { key: 'vlan', label: 'Network Isolation (VLAN)', help: 'Isolate Infant Optics monitor on a separate network' },
    { key: 'firmware', label: 'Firmware Updated', help: 'Check for updates at infantoptics.com regularly' },
    { key: 'password', label: 'Default Password Changed', help: 'Change the default camera password' },
    { key: '2fa', label: 'Two-Factor Authentication Enabled', help: 'Check if 2FA is available for your model' },
    { key: 'privacy', label: 'Privacy Policy Reviewed', help: 'Review privacy policy for local vs cloud storage' },
  ],
  motorola: [
    { key: 'vlan', label: 'Network Isolation (VLAN)', help: 'Isolate Motorola Halo on a dedicated network' },
    { key: 'firmware', label: 'Firmware Updated', help: 'Check for updates in the Halo app' },
    { key: 'password', label: 'Default Password Changed', help: 'Change the default camera password' },
    { key: '2fa', label: 'Two-Factor Authentication Enabled', help: 'Enable 2FA if available for your model' },
    { key: 'privacy', label: 'Privacy Policy Reviewed', help: 'Review data retention and sharing policies' },
  ],
};

interface SecurityEntry {
  brand: string;
  checklist: Record<string, boolean>;
  lastUpdated: string;
}

export default function IoTSecurityScreen() {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];
  const [selectedBrand, setSelectedBrand] = useState<string>('nanit');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [alerts, setAlerts] = useState<{ date: string; brand: string; concern: string; notes: string }[]>([]);
  const [alertText, setAlertText] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedBrand]);

  async function loadData() {
    try {
      const secData = await AsyncStorage.getItem(SECURITY_KEY);
      const alertData = await AsyncStorage.getItem(ALERTS_KEY);
      if (secData) {
        const entries: SecurityEntry[] = JSON.parse(secData);
        const entry = entries.find(e => e.brand === selectedBrand);
        if (entry) setChecklist(entry.checklist);
        else setChecklist({});
      }
      if (alertData) setAlerts(JSON.parse(alertData));
    } catch (e) { /* silently fail */ }
  }

  async function saveChecklist() {
    try {
      const secData = await AsyncStorage.getItem(SECURITY_KEY);
      const entries: SecurityEntry[] = secData ? JSON.parse(secData) : [];
      const idx = entries.findIndex(e => e.brand === selectedBrand);
      const newEntry: SecurityEntry = { brand: selectedBrand, checklist, lastUpdated: new Date().toISOString() };
      if (idx >= 0) entries[idx] = newEntry;
      else entries.push(newEntry);
      await AsyncStorage.setItem(SECURITY_KEY, JSON.stringify(entries));
    } catch (e) { /* silently fail */ }
  }

  function toggleItem(key: string) {
    const updated = { ...checklist, [key]: !checklist[key] };
    setChecklist(updated);
    saveChecklist();
  }

  function getScore(): number {
    const items = CHECKLIST_TEMPLATE[selectedBrand] || [];
    if (items.length === 0) return 0;
    const checked = Object.values(checklist).filter(Boolean).length;
    return Math.round((checked / items.length) * 100);
  }

  async function addAlert() {
    if (!alertText.trim()) return;
    const newAlert = { date: new Date().toISOString(), brand: selectedBrand, concern: alertText, notes: '' };
    const updated = [newAlert, ...alerts];
    setAlerts(updated);
    setAlertText('');
    try {
      await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
    } catch (e) { /* silently fail */ }
  }

  const score = getScore();
  const scoreColor = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const brand = BRANDS.find(b => b.id === selectedBrand);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: C.card }]}>
          <Text style={[styles.scoreLabel, { color: C.text }]}>{t('iotSecurity.networkScore')}</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}</Text>
            <Text style={[styles.scoreMax, { color: C.muted }]}>/100</Text>
          </View>
          <View style={[styles.scoreBar, { backgroundColor: C.muted }]}>
            <View style={[styles.scoreFill, { backgroundColor: scoreColor, width: `${score}%` }]} />
          </View>
        </View>

        {/* Brand Selector */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('iotSecurity.selectDevice')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandScroll}>
          {BRANDS.map(b => (
            <TouchableOpacity
                            accessibilityLabel="TouchableOpacity in iot-security"
              key={b.id}
              onPress={() => setSelectedBrand(b.id)}
              style={[styles.brandChip, { backgroundColor: selectedBrand === b.id ? C.accent : C.card, borderColor: C.accent }]}
            >
              <Text style={[styles.brandChipText, { color: selectedBrand === b.id ? '#fff' : C.text }]}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Checklist */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('iotSecurity.securityChecklist')}</Text>
        {(CHECKLIST_TEMPLATE[selectedBrand] || []).map(item => (
          <TouchableOpacity
                          accessibilityLabel="TouchableOpacity in iot-security"
            key={item.key}
            style={[styles.checkItem, { backgroundColor: C.card }]}
            onPress={() => toggleItem(item.key)}
            onLongPress={() => setExpandedCard(expandedCard === item.key ? null : item.key)}
          >
            <View style={[styles.checkbox, { borderColor: C.accent }]}>
              {checklist[item.key] && <MaterialCommunityIcons name="check" size={16} color={C.accent} />}
            </View>
            <View style={styles.checkContent}>
              <Text style={[styles.checkLabel, { color: C.text }]}>{item.label}</Text>
              {expandedCard === item.key && <Text style={[styles.checkHelp, { color: C.muted }]}>{item.help}</Text>}
            </View>
          </TouchableOpacity>
        ))}

        {/* Privacy Policy Link */}
        {brand && (
          <TouchableOpacity
                          accessibilityLabel="TouchableOpacity in iot-security"
            style={[styles.privacyBtn, { backgroundColor: C.card }]}
            onPress={() => Linking.openURL(brand.privacyUrl)}
          >
            <MaterialCommunityIcons name="shield-lock" size={18} color={C.accent} />
            <Text style={[styles.privacyBtnText, { color: C.accent }]}>
              {t('iotSecurity.reviewPrivacy')} {brand.name}
            </Text>
            <MaterialCommunityIcons name="open-in-new" size={14} color={C.accent} />
          </TouchableOpacity>
        )}

        {/* Educational Cards */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('iotSecurity.learnMore')}</Text>
        {[
          { key: 'vlan', icon: 'network-outline', title: t('iotSecurity.edu_vlan_title'), body: t('iotSecurity.edu_vlan_body') },
          { key: 'firmware', icon: 'update', title: t('iotSecurity.edu_firmware_title'), body: t('iotSecurity.edu_firmware_body') },
          { key: 'password', icon: 'lock-outline', title: t('iotSecurity.edu_password_title'), body: t('iotSecurity.edu_password_body') },
        ].map(card => (
          <TouchableOpacity
                          accessibilityLabel="TouchableOpacity in iot-security"
            key={card.key}
            style={[styles.eduCard, { backgroundColor: C.card }]}
            onPress={() => setExpandedCard(expandedCard === 'edu_' + card.key ? null : 'edu_' + card.key)}
          >
            <View style={styles.eduHeader}>
              <MaterialCommunityIcons name={card.icon as any} size={20} color={C.accent} />
              <Text style={[styles.eduTitle, { color: C.text }]}>{card.title}</Text>
            </View>
            {expandedCard === 'edu_' + card.key && (
              <Text style={[styles.eduBody, { color: C.muted }]}>{card.body}</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* Alert Log */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>{t('iotSecurity.alertLog')}</Text>
        <View style={[styles.alertInputRow, { backgroundColor: C.card }]}>
          <TextInput
            style={[styles.alertInput, { color: C.text, backgroundColor: C.background }]}
            placeholder={t('iotSecurity.alertPlaceholder')}
            placeholderTextColor={C.muted}
            value={alertText}
            onChangeText={setAlertText}
          />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: C.accent }]} onPress={addAlert}>
                          accessibilityLabel="Add iot-security entry"
            <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {alerts.filter(a => a.brand === selectedBrand).map((alert, i) => (
          <View key={i} style={[styles.alertItem, { backgroundColor: C.card }]}>
            <Text style={[styles.alertDate, { color: C.muted }]}>{new Date(alert.date).toLocaleDateString()}</Text>
            <Text style={[styles.alertText, { color: C.text }]}>{alert.concern}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  scoreCard: { borderRadius: 12, padding: 16, marginBottom: 16 },
  scoreLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  scoreValue: { fontSize: 48, fontWeight: '700' },
  scoreMax: { fontSize: 20, marginLeft: 4 },
  scoreBar: { height: 8, borderRadius: 4, marginTop: 8 },
  scoreFill: { height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8 },
  brandScroll: { marginBottom: 16 },
  brandChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  brandChipText: { fontSize: 14, fontWeight: '500' },
  checkItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  checkContent: { flex: 1 },
  checkLabel: { fontSize: 14, fontWeight: '500' },
  checkHelp: { fontSize: 12, marginTop: 4 },
  privacyBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
  privacyBtnText: { flex: 1, fontSize: 14, fontWeight: '500' },
  eduCard: { borderRadius: 8, padding: 12, marginBottom: 8 },
  eduHeader: { flexDirection: 'row', alignItems: 'center' },
  eduTitle: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
  eduBody: { fontSize: 12, marginTop: 8, lineHeight: 18 },
  alertInputRow: { flexDirection: 'row', borderRadius: 8, marginBottom: 12, overflow: 'hidden' },
  alertInput: { flex: 1, padding: 12, fontSize: 14 },
  addBtn: { padding: 12, justifyContent: 'center', alignItems: 'center' },
  alertItem: { borderRadius: 8, padding: 12, marginBottom: 8 },
  alertDate: { fontSize: 11, marginBottom: 2 },
  alertText: { fontSize: 14 },
});
import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const GEAR_KEY = '@jobble/gear_check_entries';
const PROFILE_KEY = '@jobble_baby_profile';

interface GearItem {
  id: string;
  label: string;
  checked: boolean;
  category: string;
}

interface GearEntry {
  id: string;
  date: string;
  tripType: string;
  items: GearItem[];
}

type TripType = 'short_walk' | 'errand' | 'full_day';

const BASE_ITEMS: Omit<GearItem, 'checked'>[] = [
  { id: 'diapers', label: 'Diapers (4+)', category: 'essentials' },
  { id: 'wipes', label: 'Wipes', category: 'essentials' },
  { id: 'changing_pad', label: 'Changing pad', category: 'essentials' },
  { id: 'spare_clothes', label: 'Spare clothes (2 sets)', category: 'essentials' },
  { id: 'burp_cloth', label: 'Burp cloth', category: 'essentials' },
  { id: 'diaper_cream', label: 'Diaper cream', category: 'essentials' },
  { id: 'formula', label: 'Formula / breast milk', category: 'feeding' },
  { id: 'bottles', label: 'Bottles (2)', category: 'feeding' },
  { id: 'baby_blanket', label: 'Baby blanket', category: 'comfort' },
  { id: 'pacifier', label: 'Pacifier', category: 'comfort' },
  { id: 'toys', label: 'Favorite toys', category: 'comfort' },
  { id: 'stroller_cover', label: 'Stroller weather cover', category: 'outdoor' },
  { id: 'car_seat_adapter', label: 'Car seat adapter', category: 'outdoor' },
  { id: 'sun_shade', label: 'Sun shade / hat', category: 'outdoor' },
  { id: 'rain_cover', label: 'Rain cover', category: 'outdoor' },
  { id: 'extra_layers', label: 'Extra layers / jacket', category: 'outdoor' },
  { id: 'thermometer', label: 'Thermometer', category: 'health' },
  { id: 'first_aid', label: 'First aid basics', category: 'health' },
  { id: 'medications', label: 'Baby medications', category: 'health' },
];

const TRIP_LABELS: Record<TripType, string> = {
  short_walk: 'Short Walk (15 min)',
  errand: 'Errand (1 hr)',
  full_day: 'Full Day Outing',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

export default function GearCheckScreen() {
  const { t } = useLanguage();
  const { theme: themeMode } = useTheme();
  const effectiveTheme = themeMode === 'system' ? 'dark' : themeMode;
  const C = COLORS[effectiveTheme];

  const [entries, setEntries] = useState<GearEntry[]>([]);
  const [currentTripType, setCurrentTripType] = useState<TripType>('errand');
  const [currentItems, setCurrentItems] = useState<GearItem[]>([]);
  const [babyAge, setBabyAge] = useState<number>(0);
  const [customItem, setCustomItem] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [gearData, profileData] = await Promise.all([
        AsyncStorage.getItem(GEAR_KEY),
        AsyncStorage.getItem(PROFILE_KEY),
      ]);
      if (gearData) {
        const all: GearEntry[] = JSON.parse(gearData);
        setEntries(all);
        if (all.length > 0) {
          const last = all[all.length - 1];
          setCurrentTripType(last.tripType as TripType);
          setCurrentItems(last.items);
        } else {
          initItems();
        }
      } else {
        initItems();
      }
      if (profileData) {
        const profile = JSON.parse(profileData);
        if (profile.birthDate) {
          setBabyAge(getAgeInMonths(profile.birthDate));
        }
      }
    } catch (e) {
      initItems();
    }
  };

  const initItems = () => {
    setCurrentItems(BASE_ITEMS.map(item => ({ ...item, checked: false })));
  };

  const saveEntries = async (newEntries: GearEntry[]) => {
    await AsyncStorage.setItem(GEAR_KEY, JSON.stringify(newEntries));
    setEntries(newEntries);
  };

  const toggleItem = (id: string) => {
    setCurrentItems(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const addCustomItem = () => {
    if (!customItem.trim()) return;
    const newItem: GearItem = {
      id: generateId(),
      label: customItem.trim(),
      checked: false,
      category: 'custom',
    };
    setCurrentItems(prev => [...prev, newItem]);
    setCustomItem('');
    setShowCustom(false);
  };

  const resetChecklist = () => {
    Alert.alert(
      t('gearCheck.resetAlert') || 'Reset Checklist',
      t('gearCheck.resetConfirm') || 'Uncheck all items?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('common.confirm') || 'Confirm', onPress: () => initItems() },
      ]
    );
  };

  const saveCurrentAndStartNew = async () => {
    const entry: GearEntry = {
      id: generateId(),
      date: formatDate(new Date()),
      tripType: currentTripType,
      items: currentItems,
    };
    const newEntries = [...entries, entry];
    await saveEntries(newEntries);
    initItems();
  };

  const checkedCount = currentItems.filter(i => i.checked).length;
  const totalCount = currentItems.length;
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;

  const groupedItems = currentItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, GearItem[]>);

  const categoryLabels: Record<string, string> = {
    essentials: t('gearCheck.category.essentials') || 'Essentials',
    feeding: t('gearCheck.category.feeding') || 'Feeding',
    comfort: t('gearCheck.category.comfort') || 'Comfort',
    outdoor: t('gearCheck.category.outdoor') || 'Outdoor',
    health: t('gearCheck.category.health') || 'Health',
    custom: t('gearCheck.category.custom') || 'Custom',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('tabs.gearCheck') || 'Gear Check'}</Text>
        {babyAge > 0 && (
          <Text style={[styles.babyAge, { color: C.muted }]}>
            {babyAge < 12 ? `${babyAge} months old` : `${(babyAge / 12).toFixed(1)} years old`}
          </Text>
        )}
      </View>

      <View style={styles.tripTypeRow}>
        {(Object.keys(TRIP_LABELS) as TripType[]).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.tripChip,
              { borderColor: C.border, backgroundColor: currentTripType === type ? C.accent : 'transparent' },
            ]}
            onPress={() => { setCurrentTripType(type); initItems(); }}
          >
            <Text style={[styles.tripChipText, { color: currentTripType === type ? '#fff' : C.text }]}>
              {TRIP_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressBar, { backgroundColor: C.card }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: C.accent }]} />
        </View>
        <Text style={[styles.progressText, { color: C.muted }]}>
          {checkedCount}/{totalCount}
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {Object.entries(groupedItems).map(([category, items]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={[styles.categoryLabel, { color: C.muted }]}>
              {categoryLabels[category] || category}
            </Text>
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, { backgroundColor: C.card }]}
                onPress={() => toggleItem(item.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={item.checked ? 'check-circle' : 'circle'}
                  size={24}
                  color={item.checked ? C.accent : C.muted}
                />
                <Text style={[
                  styles.itemLabel,
                  { color: item.checked ? C.muted : C.text, textDecorationLine: item.checked ? 'line-through' : 'none' },
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.addCustomBtn, { borderColor: C.border }]}
          onPress={() => setShowCustom(true)}
        >
          <MaterialIcons name="add" size={20} color={C.accent} />
          <Text style={[styles.addCustomText, { color: C.accent }]}>
            {t('gearCheck.addCustom') || 'Add custom item'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: C.border }]}>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: C.card }]} onPress={resetChecklist}>
          <MaterialIcons name="refresh" size={20} color={C.text} />
          <Text style={[styles.footerBtnText, { color: C.text }]}>
            {t('gearCheck.reset') || 'Reset'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.accent }]}
          onPress={saveCurrentAndStartNew}
        >
          <MaterialIcons name="save" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>{t('gearCheck.saveOuting') || 'Save & New Outing'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showCustom} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.card }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t('gearCheck.addCustom') || 'Add Custom Item'}</Text>
            <TextInput
              style={[styles.customInput, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
              placeholder={t('gearCheck.customPlaceholder') || 'Item name'}
              placeholderTextColor={C.muted}
              value={customItem}
              onChangeText={setCustomItem}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: C.border }]} onPress={() => { setShowCustom(false); setCustomItem(''); }}>
                <Text style={[styles.modalBtnText, { color: C.text }]}>{t('common.cancel') || 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.accent }]} onPress={addCustomItem}>
                <Text style={styles.modalBtnPrimary}>{t('common.add') || 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  babyAge: { fontSize: 13, marginTop: 2 },
  tripTypeRow: { flexDirection: 'row', padding: 12, gap: 8 },
  tripChip: { flex: 1, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  tripChipText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  progressBar: { flex: 1, height: 8, borderRadius: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '600', width: 40, textAlign: 'right' },
  list: { flex: 1 },
  listContent: { padding: 16, gap: 16 },
  categorySection: { gap: 6 },
  categoryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 12 },
  itemLabel: { fontSize: 15, flex: 1 },
  addCustomBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', gap: 6 },
  addCustomText: { fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1 },
  footerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 6 },
  footerBtnText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, gap: 6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  customInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
  modalBtnPrimary: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, FlatList, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { safeGetItem, safeSetItem } from '../utils/SafeStorage';
import { useLanguage } from '../context/LanguageContext';
import { STORAGE_KEYS } from '../../store/storage-keys';

const ENTRIES_KEY = STORAGE_KEYS.DIAPER_CREAM_ENTRIES;

// String literal types for type safety
type CreamType = 'diaperCream.creamTypeZincOxide' | 'diaperCream.creamTypePetroleum' | 'diaperCream.creamTypeNatural' | 'diaperCream.creamTypeOther';
type Amount = 'diaperCream.amountThin' | 'diaperCream.amountMedium' | 'diaperCream.amountThick';
type Location = 'diaperCream.locationDiaperArea' | 'diaperCream.locationSkinFolds' | 'diaperCream.locationRashSpots';
type RashType = 'diaperCream.rashTypeYeast' | 'diaperCream.rashTypeContact' | 'diaperCream.rashTypeIrritant';
type RashSeverity = 'diaperCream.severityMild' | 'diaperCream.severityModerate' | 'diaperCream.severitySevere';

interface Entry {
  id: string;
  date: string;
  creamType: CreamType;
  amount: Amount;
  locations: Location[];
  barrierRating: number;
  rashPresent: boolean;
  rashType?: RashType;
  rashSeverity?: RashSeverity;
  photoNote?: string;
  notes?: string;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function DiaperCreamScreen() {
  const { t } = useLanguage();
  const CREAM_TYPES: { value: CreamType; label: string }[] = [
    { value: 'diaperCream.creamTypeZincOxide', label: t('diaperCream.creamTypeZincOxide') },
    { value: 'diaperCream.creamTypePetroleum', label: t('diaperCream.creamTypePetroleum') },
    { value: 'diaperCream.creamTypeNatural', label: t('diaperCream.creamTypeNatural') },
    { value: 'diaperCream.creamTypeOther', label: t('diaperCream.creamTypeOther') },
  ];
  const AMOUNTS: { value: Amount; label: string }[] = [
    { value: 'diaperCream.amountThin', label: t('diaperCream.amountThin') },
    { value: 'diaperCream.amountMedium', label: t('diaperCream.amountMedium') },
    { value: 'diaperCream.amountThick', label: t('diaperCream.amountThick') },
  ];
  const LOCATIONS: { value: Location; label: string }[] = [
    { value: 'diaperCream.locationDiaperArea', label: t('diaperCream.locationDiaperArea') },
    { value: 'diaperCream.locationSkinFolds', label: t('diaperCream.locationSkinFolds') },
    { value: 'diaperCream.locationRashSpots', label: t('diaperCream.locationRashSpots') },
  ];
  const RASH_TYPES: { value: RashType; label: string }[] = [
    { value: 'diaperCream.rashTypeYeast', label: t('diaperCream.rashTypeYeast') },
    { value: 'diaperCream.rashTypeContact', label: t('diaperCream.rashTypeContact') },
    { value: 'diaperCream.rashTypeIrritant', label: t('diaperCream.rashTypeIrritant') },
  ];
  const RASH_SEVERITIES: { value: RashSeverity; label: string }[] = [
    { value: 'diaperCream.severityMild', label: t('diaperCream.severityMild') },
    { value: 'diaperCream.severityModerate', label: t('diaperCream.severityModerate') },
    { value: 'diaperCream.severitySevere', label: t('diaperCream.severitySevere') },
  ];
  const [entries, setEntries] = useState<Entry[]>([]);
  const [modal, setModal] = useState(false);
  const [creamType, setCreamType] = useState<CreamType>('diaperCream.creamTypeZincOxide');
  const [amount, setAmount] = useState<Amount>('diaperCream.amountMedium');
  const [locations, setLocations] = useState<Location[]>([]);
  const [barrierRating, setBarrierRating] = useState(3);
  const [rashPresent, setRashPresent] = useState(false);
  const [rashType, setRashType] = useState<RashType>('diaperCream.rashTypeContact');
  const [rashSeverity, setRashSeverity] = useState<RashSeverity>('diaperCream.severityMild');
  const [photoNote, setPhotoNote] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    safeGetItem(ENTRIES_KEY).then(d => d && setEntries(JSON.parse(d)));
  }, []);

  const save = async () => {
    const entry: Entry = {
      id: uid(),
      date: new Date().toISOString(),
      creamType,
      amount,
      locations,
      barrierRating,
      rashPresent,
      rashType: rashPresent ? rashType : undefined,
      rashSeverity: rashPresent ? rashSeverity : undefined,
      photoNote: photoNote || undefined,
      notes: notes || undefined,
    };
    const next = [entry, ...entries];
    setEntries(next);
    await safeSetItem(ENTRIES_KEY, JSON.stringify(next));
    setModal(false);
    setCreamType('diaperCream.creamTypeZincOxide');
    setAmount('diaperCream.amountMedium');
    setLocations([]);
    setBarrierRating(3);
    setRashPresent(false);
    setRashType('diaperCream.rashTypeContact');
    setRashSeverity('diaperCream.severityMild');
    setPhotoNote('');
    setNotes('');
  };

  const toggleLocation = (loc: Location) =>
    setLocations(p => p.includes(loc) ? p.filter(x => x !== loc) : [...p, loc]);

  const getWeeklyStats = () => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const thisWeek = entries.filter(e => new Date(e.date) >= weekStart);
    const applications = thisWeek.length;
    const avgBarrier = thisWeek.length > 0
      ? (thisWeek.reduce((sum, e) => sum + e.barrierRating, 0) / thisWeek.length).toFixed(1)
      : '0.0';
    const rashIncidents = thisWeek.filter(e => e.rashPresent).length;

    return { applications, avgBarrier, rashIncidents };
  };

  const stats = getWeeklyStats();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const creamTypeLabel = (ct: CreamType) => {
    const labels: Record<CreamType, string> = {
      ['diaperCream.creamTypeZincOxide']: t('diaperCream.creamTypeZincOxide'),
      ['diaperCream.creamTypePetroleum']: t('diaperCream.creamTypePetroleum'),
      ['diaperCream.creamTypeNatural']: t('diaperCream.creamTypeNatural'),
      ['diaperCream.creamTypeOther']: t('diaperCream.creamTypeOther'),
    };
    return labels[ct];
  };

  const amountLabel = (a: Amount) => {
    const labels: Record<Amount, string> = {
      ['diaperCream.amountThin']: t('diaperCream.amountThin'),
      ['diaperCream.amountMedium']: t('diaperCream.amountMedium'),
      ['diaperCream.amountThick']: t('diaperCream.amountThick'),
    };
    return labels[a];
  };

  const locationLabel = (loc: Location) => {
    const labels: Record<Location, string> = {
      ['diaperCream.locationDiaperArea']: t('diaperCream.locationDiaperArea'),
      ['diaperCream.locationSkinFolds']: t('diaperCream.locationSkinFolds'),
      ['diaperCream.locationRashSpots']: t('diaperCream.locationRashSpots'),
    };
    return labels[loc];
  };

  const rashTypeLabel = (rt: RashType) => {
    const labels: Record<RashType, string> = {
      ['diaperCream.rashTypeYeast']: t('diaperCream.rashTypeYeast'),
      ['diaperCream.rashTypeContact']: t('diaperCream.rashTypeContact'),
      ['diaperCream.rashTypeIrritant']: t('diaperCream.rashTypeIrritant'),
    };
    return labels[rt];
  };

  const rashSeverityLabel = (rs: RashSeverity) => {
    const labels: Record<RashSeverity, string> = {
      ['diaperCream.severityMild']: t('diaperCream.severityMild'),
      ['diaperCream.severityModerate']: t('diaperCream.severityModerate'),
      ['diaperCream.severitySevere']: t('diaperCream.severitySevere'),
    };
    return labels[rs];
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={styles.hdr}>{t('diaperCream.title')}</Text>
        <Text style={styles.sub}>{t('diaperCream.greeting')}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('diaperCream.weeklySummary')}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.applications}</Text>
              <Text style={styles.summaryLabel}>{t('diaperCream.applicationsThisWeek')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.avgBarrier}</Text>
              <Text style={styles.summaryLabel}>{t('diaperCream.avgBarrierScore')}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{stats.rashIncidents}</Text>
              <Text style={styles.summaryLabel}>{t('diaperCream.rashIncidents')}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)} accessibilityLabel={t('diaperCream.addEntry')}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>{t('diaperCream.addEntry')}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHdr}>{t('diaperCream.history')}</Text>
        {entries.length === 0 && <Text style={styles.empty}>{t('diaperCream.noEntries')}</Text>}
        <FlatList
          data={entries}
          keyExtractor={e => e.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                <View style={[styles.barrierBadge, { backgroundColor: item.barrierRating >= 4 ? '#10B981' : item.barrierRating >= 3 ? '#F59E0B' : '#EF4444' }]}>
                  <Text style={styles.barrierBadgeText}>{t('diaperCream.barrier')}: {item.barrierRating}/5</Text>
                </View>
              </View>
              <Text style={styles.meta}>{creamTypeLabel(item.creamType)} · {amountLabel(item.amount)}</Text>
              <Text style={styles.meta}>{t('diaperCream.locations')}: {item.locations.map(locationLabel).join(', ')}</Text>
              {item.rashPresent && (
                <View style={styles.rashInfo}>
                  <Text style={styles.rashText}>
                    {t('diaperCream.rashPresent')}: {rashTypeLabel(item.rashType!)} ({rashSeverityLabel(item.rashSeverity!)})
                  </Text>
                </View>
              )}
              {item.photoNote && <Text style={styles.notes}>{t('diaperCream.photoNote')}: {item.photoNote}</Text>}
              {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
            </View>
          )}
        />
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{t('diaperCream.addEntry')}</Text>

              <Text style={styles.fieldLabel}>{t('diaperCream.creamType')}</Text>
              <View style={styles.chipRow}>
                {CREAM_TYPES.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, creamType === value && styles.chipActive]}
                    onPress={() => setCreamType(value)}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.chipText, creamType === value && styles.chipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={styles.fieldLabel}>{t('diaperCream.amount')}</Text>
              <View style={styles.chipRow}>
                {AMOUNTS.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, amount === value && styles.chipActive]}
                    onPress={() => setAmount(value)}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.chipText, amount === value && styles.chipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Body Locations */}
              <Text style={styles.fieldLabel}>{t('diaperCream.bodyLocations')}</Text>
              <View style={styles.chipRow}>
                {LOCATIONS.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.chip, locations.includes(value) && styles.chipActive]}
                    onPress={() => toggleLocation(value)}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.chipText, locations.includes(value) && styles.chipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Barrier Integrity Rating */}
              <Text style={styles.fieldLabel}>{t('diaperCream.barrierIntegrity')}</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map(r => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.ratingBtn, barrierRating === r && styles.ratingBtnActive]}
                    onPress={() => setBarrierRating(r)}
                    accessibilityLabel={`${t('diaperCream.barrierRating')} ${r}`}
                  >
                    <Text style={[styles.ratingText, barrierRating === r && styles.ratingTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingDesc}>
                {barrierRating === 1 && t('diaperCream.rating1')}
                {barrierRating === 2 && t('diaperCream.rating2')}
                {barrierRating === 3 && t('diaperCream.rating3')}
                {barrierRating === 4 && t('diaperCream.rating4')}
                {barrierRating === 5 && t('diaperCream.rating5')}
              </Text>

              {/* Rash Present Toggle */}
              <Text style={styles.fieldLabel}>{t('diaperCream.rashPresent')}</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, !rashPresent && styles.toggleBtnActive]}
                  onPress={() => setRashPresent(false)}
                  accessibilityLabel={t('diaperCream.no')}
                >
                  <Text style={[styles.toggleBtnText, !rashPresent && styles.toggleBtnTextActive]}>
                    {t('diaperCream.no')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, rashPresent && styles.toggleBtnActive]}
                  onPress={() => setRashPresent(true)}
                  accessibilityLabel={t('diaperCream.yes')}
                >
                  <Text style={[styles.toggleBtnText, rashPresent && styles.toggleBtnTextActive]}>
                    {t('diaperCream.yes')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Rash Details (if present) */}
              {rashPresent && (
                <>
                  <Text style={styles.fieldLabel}>{t('diaperCream.rashType')}</Text>
                  <View style={styles.chipRow}>
                    {RASH_TYPES.map(({ value, label }) => (
                      <TouchableOpacity
                        key={value}
                        style={[styles.chip, rashType === value && styles.chipActive]}
                        onPress={() => setRashType(value)}
                        accessibilityLabel={label}
                      >
                        <Text style={[styles.chipText, rashType === value && styles.chipTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>{t('diaperCream.rashSeverity')}</Text>
                  <View style={styles.chipRow}>
                    {RASH_SEVERITIES.map(({ value, label }) => (
                      <TouchableOpacity
                        key={value}
                        style={[styles.chip, rashSeverity === value && styles.chipActive]}
                        onPress={() => setRashSeverity(value)}
                        accessibilityLabel={label}
                      >
                        <Text style={[styles.chipText, rashSeverity === value && styles.chipTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Photo Note */}
              <Text style={styles.fieldLabel}>{t('diaperCream.photoNote')}</Text>
              <TextInput
                style={styles.input}
                value={photoNote}
                onChangeText={setPhotoNote}
                placeholder={t('diaperCream.photoNotePlaceholder')}
                placeholderTextColor="#6B7280"
              />

              {/* Notes */}
              <Text style={styles.fieldLabel}>{t('diaperCream.notes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder={t('diaperCream.notesPlaceholder')}
                placeholderTextColor="#6B7280"
              />

              {/* Modal Buttons */}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)} accessibilityLabel={t('common.cancel')}>
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={save} accessibilityLabel={t('diaperCream.save')}>
                  <Text style={styles.saveBtnText}>{t('diaperCream.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hdr: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  sub: { fontSize: 14, color: '#9CA3AF', marginBottom: 20 },
  summaryCard: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#374151' },
  summaryTitle: { fontSize: 16, fontWeight: '600', color: '#D1D5DB', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#3B82F6' },
  summaryLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 10, padding: 14, marginBottom: 20, gap: 8 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionHdr: { fontSize: 16, fontWeight: '600', color: '#D1D5DB', marginBottom: 10 },
  empty: { color: '#6B7280', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateText: { fontSize: 13, color: '#9CA3AF' },
  barrierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  barrierBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  meta: { fontSize: 13, color: '#D1D5DB', marginTop: 4 },
  rashInfo: { marginTop: 6, padding: 8, backgroundColor: '#374151', borderRadius: 8 },
  rashText: { fontSize: 12, color: '#F97316' },
  notes: { fontSize: 12, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', marginTop: 12, marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#1F2937', borderRadius: 8, padding: 12, color: '#F9FAFB', fontSize: 14, borderWidth: 1, borderColor: '#374151' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151' },
  chipActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  chipText: { color: '#9CA3AF', fontSize: 12 },
  chipTextActive: { color: '#3B82F6' },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  ratingBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  ratingText: { color: '#9CA3AF', fontSize: 16, fontWeight: '600' },
  ratingTextActive: { color: '#3B82F6' },
  ratingDesc: { fontSize: 11, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#1F2937', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  toggleBtnActive: { backgroundColor: '#1E3A5F', borderColor: '#3B82F6' },
  toggleBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  toggleBtnTextActive: { color: '#3B82F6' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center' },
  cancelBtnText: { color: '#D1D5DB', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#3B82F6', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

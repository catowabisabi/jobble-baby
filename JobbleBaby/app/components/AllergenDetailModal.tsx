import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  LayoutAnimation,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Allergen, AllergenEntry, AllergenStatus, STATUS_LABELS, FPIES_WARNING } from '../data/allergens';
import { COLORS } from '../theme';
import { useTheme } from '../context/ThemeContext';



interface Props {
  visible: boolean;
  allergen: Allergen;
  entry?: AllergenEntry;
  onClose: () => void;
  onSave: (entry: AllergenEntry) => void;
  onLogReaction?: () => void;
}

const STATUSES: AllergenStatus[] = ['not_introduced', 'introduced', 'reaction_observed', 'tolerated'];

export function AllergenDetailModal({ visible, allergen, entry, onClose, onSave, onLogReaction }: Props) {
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const [status, setStatus] = useState<AllergenStatus>(entry?.status ?? 'not_introduced');
  const [dateIntroduced, setDateIntroduced] = useState<Date>(
    entry?.date_introduced ? new Date(entry.date_introduced) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleStatusChange = (newStatus: AllergenStatus) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStatus(newStatus);

    const updatedEntry: AllergenEntry = {
      id: allergen.id,
      status: newStatus,
      date_introduced: (newStatus === 'introduced' || newStatus === 'tolerated')
        ? dateIntroduced.toISOString()
        : undefined,
      reactions: entry?.reactions ?? [],
    };

    onSave(updatedEntry);
  };

  const handleDateChange = (_: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateIntroduced(selectedDate);
      const updatedEntry: AllergenEntry = {
        id: allergen.id,
        status,
        date_introduced: selectedDate.toISOString(),
        reactions: entry?.reactions ?? [],
      };
      onSave(updatedEntry);
    }
  };

  const showDatePickerSection = status === 'introduced' || status === 'tolerated';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.header}>
            <Text style={[styles.headerText, { color: C.text }]}>
              {allergen.emoji} {allergen.name}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.closeButton, { color: C.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusContainer}>
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusButton,
                  {
                    borderColor: status === s ? C.accent : C.border,
                    backgroundColor: status === s ? `${C.accent}20` : 'transparent',
                  },
                ]}
                onPress={() => handleStatusChange(s)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    { color: status === s ? C.accent : C.text },
                  ]}
                >
                  {STATUS_LABELS[s]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showDatePickerSection && (
            <View style={styles.dateSection}>
              <Text style={[styles.dateLabel, { color: C.muted }]}>Date Introduced:</Text>
              <TouchableOpacity
                style={[styles.dateButton, { borderColor: C.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateButtonText, { color: C.text }]}>
                  {dateIntroduced.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dateIntroduced}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>
          )}

          {status === 'reaction_observed' && (
            <View style={[styles.fpiesNote, { backgroundColor: `${C.accent}15` }]}>
              <Text style={[styles.fpiesText, { color: C.accent }]}>
                ⚠️ {FPIES_WARNING}
              </Text>
            </View>
          )}

          {status === 'reaction_observed' && (
            <TouchableOpacity
              style={[styles.logReactionButton, { backgroundColor: '#e74c3c' }]}
              onPress={onLogReaction}
            >
              <Text style={styles.logReactionButtonText}>Log Reaction</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 20,
    fontWeight: '300',
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  dateButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 16,
  },
  fpiesNote: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fpiesText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logReactionButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  logReactionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

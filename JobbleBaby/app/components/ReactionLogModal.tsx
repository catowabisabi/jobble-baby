import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  LayoutAnimation,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Reaction, ReactionType, REACTION_SYMPTOMS, Allergen } from '../data/allergens';
import { COLORS } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';



interface Props {
  visible: boolean;
  allergen: Allergen;
  existingReactions: Reaction[];
  onClose: () => void;
  onSave: (reactions: Reaction[]) => void;
}

const REACTION_TYPES: ReactionType[] = ['IgE', 'FPIES', 'non-IgE'];

export function ReactionLogModal({ visible, allergen, existingReactions, onClose, onSave }: Props) {
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [reactionType, setReactionType] = useState<ReactionType>('IgE');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [severity, setSeverity] = useState<number>(1);
  const [reactionDate, setReactionDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  const getSeverityLabel = (level: number) => {
    const labels: Record<number, string> = {
1: t('reactionModal.mild'),
      2: t('reactionModal.light'),
      3: t('reactionModal.moderate'),
      4: t('reactionModal.severe'),
      5: t('reactionModal.critical'),
    };
    return labels[level] || '';
  };

  const resetForm = () => {
    setReactionType('IgE');
    setSelectedSymptoms([]);
    setSeverity(1);
    setReactionDate(new Date());
    setNotes('');
    setPhotoUri(undefined);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleSymptom = (symptom: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleDateChange = (_: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setReactionDate(selectedDate);
    }
  };

  const handlePhotoPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    const newReaction: Reaction = {
      id: Date.now().toString(),
      type: reactionType,
      symptoms: selectedSymptoms,
      severity,
      date: reactionDate.toISOString(),
      photo_uri: photoUri,
      notes: notes.trim() || undefined,
    };

    onSave([...existingReactions, newReaction]);
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.header}>
            <Text style={[styles.headerText, { color: C.text }]}>
              {t('reactionModal.logReaction', { name: `${allergen.emoji} ${allergen.name}` })}
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('reactionModal.close')}>
              <Text style={[styles.closeButton, { color: C.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionLabel, { color: C.muted }]}>{t('reactionModal.reactionType')}</Text>
            <View style={styles.chipContainer}>
              {REACTION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    {
                      borderColor: reactionType === type ? C.accent : C.border,
                      backgroundColor: reactionType === type ? `${C.accent}20` : 'transparent',
                    },
                  ]}
                  onPress={() => setReactionType(type)}
                  accessibilityLabel={t(`reactionModal.reactionType${type}`)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: reactionType === type ? C.accent : C.text },
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {reactionType === 'FPIES' && (
              <View style={[styles.fpiesNote, { backgroundColor: `${C.accent}15` }]}>
                <Text style={[styles.fpiesText, { color: C.accent }]}>
                  ⚠️ {t('reactionModal.fpiesWarning')}
                </Text>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: C.muted }]}>{t('reactionModal.symptoms')}</Text>
            <View style={styles.chipContainer}>
              {REACTION_SYMPTOMS.map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.chip,
                    {
                      borderColor: selectedSymptoms.includes(symptom) ? C.accent : C.border,
                      backgroundColor: selectedSymptoms.includes(symptom) ? `${C.accent}20` : 'transparent',
                    },
                  ]}
                  onPress={() => toggleSymptom(symptom)}
                  accessibilityLabel={t('reactionModal.symptom', { name: symptom })}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedSymptoms.includes(symptom) ? C.accent : C.text },
                    ]}
                  >
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: C.muted }]}>{t('reactionModal.severity')}</Text>
            <View style={styles.severityContainer}>
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.severityButton,
                    {
                      borderColor: severity === level ? C.accent : C.border,
                      backgroundColor: severity === level ? `${C.accent}20` : 'transparent',
                    },
                  ]}
                  onPress={() => setSeverity(level)}
                  accessibilityLabel={`${level} ${getSeverityLabel(level)}`}
                >
                  <Text
                    style={[
                      styles.severityNumber,
                      { color: severity === level ? C.accent : C.text },
                    ]}
                  >
                    {level}
                  </Text>
                  <Text
                    style={[
                      styles.severityLabel,
                      { color: severity === level ? C.accent : C.muted },
                    ]}
                  >
                    {getSeverityLabel(level)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: C.muted }]}>{t('reactionModal.date')}</Text>
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: C.border }]}
              onPress={() => setShowDatePicker(true)}
              accessibilityLabel={t('reactionModal.selectDate')}
            >
              <Text style={[styles.dateButtonText, { color: C.text }]}>
                {reactionDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={reactionDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <Text style={[styles.sectionLabel, { color: C.muted }]}>{t('reactionModal.notes')}</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
              placeholder={t('reactionModal.notesPlaceholder')}
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <Text style={[styles.sectionLabel, { color: C.muted }]}>{t('reactionModal.photo')}</Text>
            <TouchableOpacity
              style={[styles.photoButton, { borderColor: C.border }]}
              onPress={handlePhotoPick}
              accessibilityLabel={photoUri ? t('reactionModal.changePhoto') : t('reactionModal.addPhoto')}
            >
              <Text style={[styles.photoButtonText, { color: C.accent }]}>
                {photoUri ? t('reactionModal.changePhoto') : t('reactionModal.addPhoto')}
              </Text>
            </TouchableOpacity>
            {photoUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.imagePreview} />
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: C.border }]}
                onPress={handleClose}
                accessibilityLabel={t('common.cancel')}
              >
                <Text style={[styles.cancelButtonText, { color: C.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: C.accent }]}
                onPress={handleSave}
                accessibilityLabel={t('reactionModal.saveReaction')}
              >
                <Text style={styles.saveButtonText}>{t('reactionModal.saveReaction')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxHeight: '85%',
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
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 20,
    fontWeight: '300',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fpiesNote: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  fpiesText: {
    fontSize: 13,
    fontWeight: '500',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  severityNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  severityLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  dateButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    fontSize: 16,
  },
  notesInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  imagePreview: {
    width: 200,
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

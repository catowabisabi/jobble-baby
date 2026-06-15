import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';

export interface RegulatoryEntry {
  date: string;
  composite_score: number;
  autonomic_score: number;
  sensory_score: number;
  motor_score: number;
  social_score: number;
  notes?: string;
}

const STORAGE_KEY = '@jobble/regulatory_fitness';
const MAX_ENTRIES = 90;

export const loadRegulatoryData = async (): Promise<RegulatoryEntry[]> => {
  try {
    const data = await safeGetItem(STORAGE_KEY);
    if (data) {
      const parsed: RegulatoryEntry[] = JSON.parse(data);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - MAX_ENTRIES);
      return parsed.filter((e) => new Date(e.date) >= cutoff);
    }
  } catch (error) {
    console.error('Error loading regulatory data:', error);
  }
  return [];
};

export const saveRegulatoryEntry = async (entry: RegulatoryEntry): Promise<void> => {
  try {
    const allEntries = await loadRegulatoryData();
    const filtered = allEntries.filter((e) => e.date !== entry.date);
    const updated = [...filtered, entry].slice(-MAX_ENTRIES);
    await safeSetItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving regulatory entry:', error);
    throw error;
  }
};

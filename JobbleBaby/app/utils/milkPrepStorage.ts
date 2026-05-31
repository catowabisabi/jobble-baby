import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MilkBag {
  id: string;
  volumeMl: number;
  freezeDate: string; // ISO YYYY-MM-DD format
  expiryDate: string; // ISO YYYY-MM-DD format
}

export interface MilkTimer {
  startedAt: number; // timestamp in milliseconds
  durationMs: number;
  location: 'room' | 'fridge';
}

const STASH_KEY = '@jobble/milk_stash';
const TIMER_KEY = '@jobble/milk_timer';

export const saveStash = async (stash: MilkBag[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STASH_KEY, JSON.stringify(stash));
  } catch (error) {
    console.error('Failed to save milk stash:', error);
  }
};

export const loadStash = async (): Promise<MilkBag[]> => {
  try {
    const raw = await AsyncStorage.getItem(STASH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Failed to load milk stash:', error);
    return [];
  }
};

export const saveTimer = async (timer: MilkTimer): Promise<void> => {
  try {
    await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(timer));
  } catch (error) {
    console.error('Failed to save milk timer:', error);
  }
};

export const loadTimer = async (): Promise<MilkTimer | null> => {
  try {
    const raw = await AsyncStorage.getItem(TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Failed to load milk timer:', error);
    return null;
  }
};

export const clearTimer = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TIMER_KEY);
  } catch (error) {
    console.error('Failed to clear milk timer:', error);
  }
};
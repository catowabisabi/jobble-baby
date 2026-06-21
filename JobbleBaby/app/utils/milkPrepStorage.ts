import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/SafeStorage';

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
    await safeSetItem(STASH_KEY, JSON.stringify(stash));
  } catch { }
};

export const loadStash = async (): Promise<MilkBag[]> => {
  try {
    const raw = await safeGetItem(STASH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveTimer = async (timer: MilkTimer): Promise<void> => {
  try {
    await safeSetItem(TIMER_KEY, JSON.stringify(timer));
  } catch { }
};

export const loadTimer = async (): Promise<MilkTimer | null> => {
  try {
    const raw = await safeGetItem(TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const clearTimer = async (): Promise<void> => {
  try {
    await safeRemoveItem(TIMER_KEY);
  } catch { }
};
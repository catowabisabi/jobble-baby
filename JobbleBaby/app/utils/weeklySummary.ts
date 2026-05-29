import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TrackingEntry {
  id: string;
  type: 'diaper' | 'feed' | 'sleep';
  subtype: string;
  icon: string;
  time: string;    // "HH:mm" format
  date: string;    // "YYYY-MM-DD" ISO format
  note?: string;
}

export interface GrowthEntry {
  id: string;
  date: string;    // "May 20, 2026" locale format - NEED TO PARSE
  height: number;
  weight: number;
}

export interface WeeklyTotals {
  diaperCount: number;
  feedCount: number;
  sleepCount: number;
  growthCount: number;
}

export interface WeeklyTrend {
  current: WeeklyTotals;
  previous: WeeklyTotals;
  trends: {
    diaper: '↑' | '↓' | '→';
    feed: '↑' | '↓' | '→';
    sleep: '↑' | '↓' | '→';
    growth: '↑' | '↓' | '→';
  };
}

// Get start of week (Monday) for a given date
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Get end of week (Sunday 23:59:59)
export const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

// Get the previous week's start and end
export const getPreviousWeekRange = (currentWeekStart: Date): { start: Date; end: Date } => {
  const prevStart = new Date(currentWeekStart);
  prevStart.setDate(prevStart.getDate() - 7);
  const prevEnd = new Date(prevStart);
  prevEnd.setDate(prevEnd.getDate() + 6);
  prevEnd.setHours(23, 59, 59, 999);
  return { start: prevStart, end: prevEnd };
};

// Parse "May 20, 2026" to Date object
export const parseLocaleDate = (dateStr: string): Date => {
  return new Date(dateStr);
};

const isInRange = (entryDate: Date, start: Date, end: Date): boolean => {
  return entryDate >= start && entryDate <= end;
};

export const getWeeklySummary = async (): Promise<WeeklyTrend> => {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const currentWeekEnd = getWeekEnd(now);
  const prevRange = getPreviousWeekRange(currentWeekStart);

  // Load tracking entries
  const trackingRaw = await AsyncStorage.getItem('@jobble/tracking_entries');
  const trackingEntries: TrackingEntry[] = trackingRaw ? JSON.parse(trackingRaw) : [];

  // Load growth entries
  const growthRaw = await AsyncStorage.getItem('@jobble/growth_entries');
  const growthEntries: GrowthEntry[] = growthRaw ? JSON.parse(growthRaw) : [];

  // Helper to calculate totals for a given date range
  const calcTotals = (entries: TrackingEntry[], growthData: GrowthEntry[], start: Date, end: Date): WeeklyTotals => {
    // Filter tracking entries by date
    const trackingFiltered = entries.filter(e => {
      const entryDate = new Date(e.date);
      return isInRange(entryDate, start, end);
    });

    // Filter growth entries by date
    const growthFiltered = growthData.filter(e => {
      const entryDate = parseLocaleDate(e.date);
      return isInRange(entryDate, start, end);
    });

    return {
      diaperCount: trackingFiltered.filter(e => e.type === 'diaper').length,
      feedCount: trackingFiltered.filter(e => e.type === 'feed').length,
      sleepCount: trackingFiltered.filter(e => e.type === 'sleep').length,
      growthCount: growthFiltered.length,
    };
  };

  const currentTotals = calcTotals(trackingEntries, growthEntries, currentWeekStart, currentWeekEnd);
  const previousTotals = calcTotals(trackingEntries, growthEntries, prevRange.start, prevRange.end);

  // Calculate trends
  const getTrend = (curr: number, prev: number): '↑' | '↓' | '→' => {
    const diff = curr - prev;
    if (diff > 0) return '↑';
    if (diff < 0) return '↓';
    return '→';
  };

  return {
    current: currentTotals,
    previous: previousTotals,
    trends: {
      diaper: getTrend(currentTotals.diaperCount, previousTotals.diaperCount),
      feed: getTrend(currentTotals.feedCount, previousTotals.feedCount),
      sleep: getTrend(currentTotals.sleepCount, previousTotals.sleepCount),
      growth: getTrend(currentTotals.growthCount, previousTotals.growthCount),
    },
  };
};

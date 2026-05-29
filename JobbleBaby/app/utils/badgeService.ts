// Badge award service — checks conditions and awards badges
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { BADGES, Badge } from '../data/badges';

const BADGES_KEY = '@jobble/badges';
const LOG_COUNT_KEY = '@jobble/log_count';
const STREAK_KEY = '@jobble/streak';
const LAST_LOG_DATE_KEY = '@jobble/last_log_date';

export interface BadgeState {
  [badgeId: string]: {
    earned: boolean;
    earnedAt?: string; // ISO date string
  };
}

// Load all badge states
export const loadBadgeState = async (): Promise<BadgeState> => {
  try {
    const raw = await AsyncStorage.getItem(BADGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// Save badge state
const saveBadgeState = async (state: BadgeState): Promise<void> => {
  try {
    await AsyncStorage.setItem(BADGES_KEY, JSON.stringify(state));
  } catch {}
};

// Get or initialize state
const getState = async (): Promise<BadgeState> => {
  const state = await loadBadgeState();
  // Initialize all badges as not earned if not present
  for (const badge of BADGES) {
    if (!state[badge.id]) {
      state[badge.id] = { earned: false };
    }
  }
  return state;
};

// Award a specific badge
export const awardBadge = async (badgeId: string): Promise<boolean> => {
  const state = await getState();
  if (state[badgeId]?.earned) return false; // already earned

  const badge = BADGES.find((b) => b.id === badgeId);
  state[badgeId] = { earned: true, earnedAt: new Date().toISOString() };
  await saveBadgeState(state);
  if (badge) await notifyBadgeAward(badge);
  return true;
};

// Check streak — called whenever a new log entry is created
export const checkStreakBadges = async (): Promise<string[]> => {
  const awarded: string[] = [];
  const today = new Date().toISOString().split('T')[0];
  const state = await getState();

  // Get last log date
  const lastLogDate = (await AsyncStorage.getItem(LAST_LOG_DATE_KEY)) || today;
  const streakCount = parseInt((await AsyncStorage.getItem(STREAK_KEY)) || '0', 10);

  // Simple streak: if last log was yesterday, increment; if today, keep; if gap, reset
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = streakCount;
  if (lastLogDate === today) {
    // Already logged today, no change
    newStreak = streakCount;
  } else if (lastLogDate === yesterdayStr) {
    newStreak = streakCount + 1;
  } else {
    newStreak = 1; // streak broken or first log
  }

  await AsyncStorage.setItem(STREAK_KEY, String(newStreak));
  await AsyncStorage.setItem(LAST_LOG_DATE_KEY, today);

  // Check streak badges
  if (newStreak >= 7 && !state['streak_7']?.earned) {
    if (await awardBadge('streak_7')) awarded.push('streak_7');
  }
  if (newStreak >= 30 && !state['streak_30']?.earned) {
    if (await awardBadge('streak_30')) awarded.push('streak_30');
  }

  return awarded;
};

// Check first-log badges based on entry type
export const checkFirstLogBadge = async (entryType: string): Promise<string[]> => {
  const awarded: string[] = [];
  const badgeMap: Record<string, string> = {
    diaper: 'first_diaper',
    feed: 'first_feed',
    sleep: 'first_sleep',
  };
  const badgeId = badgeMap[entryType];
  if (!badgeId) return awarded;

  if (await awardBadge(badgeId)) {
    awarded.push(badgeId);
  }
  return awarded;
};

// Check milestone badges based on total entry count
export const checkMilestoneBadges = async (totalCount: number): Promise<string[]> => {
  const awarded: string[] = [];
  const milestones = [10, 50, 100];
  const badgeIds = ['milestone_10', 'milestone_50', 'milestone_100'];

  for (let i = 0; i < milestones.length; i++) {
    if (totalCount >= milestones[i]) {
      if (await awardBadge(badgeIds[i])) {
        awarded.push(badgeIds[i]);
      }
    }
  }
  return awarded;
};

// Increment log count and check milestone badges
export const incrementLogCount = async (): Promise<string[]> => {
  const countStr = await AsyncStorage.getItem(LOG_COUNT_KEY);
  const count = (parseInt(countStr || '0', 10)) + 1;
  await AsyncStorage.setItem(LOG_COUNT_KEY, String(count));
  return checkMilestoneBadges(count);
};

// Award weekly viewer badge
export const awardWeeklyViewer = async (): Promise<string[]> => {
  const awarded: string[] = [];
  if (await awardBadge('weekly_view')) {
    awarded.push('weekly_view');
  }
  return awarded;
};

// Award growth tracked badge
export const awardGrowthTracked = async (): Promise<string[]> => {
  const awarded: string[] = [];
  if (await awardBadge('growth_tracked')) {
    awarded.push('growth_tracked');
  }
  return awarded;
};

// Get all newly awarded badges for a log entry
export const onNewLogEntry = async (entryType: string): Promise<Badge[]> => {
  const allAwarded: string[] = [];

  const streakAwards = await checkStreakBadges();
  allAwarded.push(...streakAwards);

  const firstAwards = await checkFirstLogBadge(entryType);
  allAwarded.push(...firstAwards);

  const milestoneAwards = await incrementLogCount();
  allAwarded.push(...milestoneAwards);

  return allAwarded.map((id) => BADGES.find((b) => b.id === id)!).filter(Boolean);
};

// Get newly awarded when growth entry is added
export const onNewGrowthEntry = async (): Promise<Badge[]> => {
  const awarded: string[] = [];
  if (await awardBadge('growth_tracked')) {
    awarded.push('growth_tracked');
  }
  return awarded.map((id) => BADGES.find((b) => b.id === id)!).filter(Boolean);
};

// Get all earned badges
export const getEarnedBadges = async (): Promise<Badge[]> => {
  const state = await getState();
  return BADGES.filter((b) => state[b.id]?.earned).map((b => ({
    ...b,
    earnedAt: state[b.id].earnedAt,
  }))) as (Badge & { earnedAt: string })[];
};

// Get badge counts
export const getBadgeCounts = async (): Promise<{ earned: number; total: number }> => {
  const state = await getState();
  const earned = BADGES.filter((b) => state[b.id]?.earned).length;
  return { earned, total: BADGES.length };
};

// Notify user of a newly awarded badge
export const notifyBadgeAward = async (badge: Badge): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎉 Badge Earned!',
        body: `You earned the "${badge.name}" badge`,
      },
      trigger: null, // Fire immediately
    });
  } catch (error) {
    console.error('Failed to send badge award notification:', error);
  }
};

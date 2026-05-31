// Badge definitions for Jobble Baby gamification system

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'first' | 'milestone' | 'engagement';
  condition: string;
}

export const BADGES: Badge[] = [
  // Streak badges
  {
    id: 'streak_7',
    name: '7-Day Streak',
    description: 'Logged baby care for 7 days in a row',
    icon: '🔥',
    category: 'streak',
    condition: '7 consecutive days of logging',
  },
  {
    id: 'streak_30',
    name: '30-Day Streak',
    description: 'Logged baby care for 30 days in a row',
    icon: '⚡',
    category: 'streak',
    condition: '30 consecutive days of logging',
  },
  // First-log badges
  {
    id: 'first_diaper',
    name: 'First Diaper',
    description: 'Logged your first diaper change',
    icon: '🧷',
    category: 'first',
    condition: 'Log 1 diaper entry',
  },
  {
    id: 'first_feed',
    name: 'First Feeding',
    description: 'Logged your first feeding',
    icon: '🍼',
    category: 'first',
    condition: 'Log 1 feeding entry',
  },
  {
    id: 'first_sleep',
    name: 'First Sleep',
    description: 'Logged your first sleep entry',
    icon: '🌙',
    category: 'first',
    condition: 'Log 1 sleep entry',
  },
  {
    id: 'first_allergen',
    name: 'First Allergen Introduced',
    description: 'Introduced your first allergen to baby',
    icon: '🥜',
    category: 'first',
    condition: 'Introduce 1 allergen',
  },
  // Milestone badges
  {
    id: 'milestone_10',
    name: '10 Entries',
    description: 'Logged 10 total baby care entries',
    icon: '📊',
    category: 'milestone',
    condition: '10 total log entries',
  },
  {
    id: 'milestone_50',
    name: '50 Entries',
    description: 'Logged 50 total baby care entries',
    icon: '🏆',
    category: 'milestone',
    condition: '50 total log entries',
  },
  {
    id: 'milestone_100',
    name: '100 Entries',
    description: 'Logged 100 total baby care entries',
    icon: '👑',
    category: 'milestone',
    condition: '100 total log entries',
  },
  // Engagement badges
  {
    id: 'weekly_view',
    name: 'Weekly Viewer',
    description: 'Viewed your weekly summary for the first time',
    icon: '📅',
    category: 'engagement',
    condition: 'Open weekly summary once',
  },
  {
    id: 'growth_tracked',
    name: 'Growth Tracker',
    description: 'Added your first growth measurement',
    icon: '📈',
    category: 'milestone',
    condition: 'Add 1 growth entry',
  },
  {
    id: 'stress_survival',
    name: 'Stress Survival',
    description: 'Completed 3 crisis interventions',
    icon: '🧘',
    category: 'engagement',
    condition: 'Complete 3 crisis interventions',
  },
  {
    id: 'team_player',
    name: 'Team Player',
    description: 'Handed off to partner during stress',
    icon: '🤝',
    category: 'engagement',
    condition: 'Handoff during stress flag',
  },
];

export const getBadgeById = (id: string): Badge | undefined =>
  BADGES.find((b) => b.id === id);

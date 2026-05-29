export interface ThemeColors {
  background: string;
  card: string;
  border: string;
  accent: string;
  text: string;
  muted: string;
}

export const COLORS = {
  dark: {
    background: '#0a1628',
    card: '#1a2a3a',
    border: '#2a3a4a',
    accent: '#3B82F6',
    text: '#F8FAFC',
    muted: '#8b9bb4',
  },
  light: {
    background: '#f5f7fa',
    card: '#ffffff',
    border: '#e5e7eb',
    accent: '#3B82F6',
    text: '#1a2a3a',
    muted: '#6b7280',
  },
} satisfies Record<'dark' | 'light', ThemeColors>;

export const STATUS_COLORS = {
  good: '#2ecc71',
  warning: '#f1c40f',
  error: '#e74c3c',
};

export const CATEGORY_COLORS = {
  diaper: '#A8D5BA',
  feed: '#F5B7B1',
  sleep: '#AED6F1',
  wet: '#3498db',
  solid: '#1abc9c',
  bottle: '#f39c12',
  breast: '#e74c3c',
  both: '#9b59b6',
  nightSleep: '#5DADE2',
};

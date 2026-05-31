import { Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERRED_APP_KEY = '@jobble/preferred_monitor_app';
const LAST_EVENT_KEY = '@jobble/last_monitor_event';
const MONITOR_EVENTS_KEY = '@jobble/monitor_events';

export type MonitorApp = 'baby-monitor-3g' | 'cloudbaby' | 'nanit' | 'other';
export type MonitorEventType = 'sound' | 'motion' | 'cry';

export interface MonitorEvent {
  id: string;
  type: MonitorEventType;
  timestamp: string; // ISO string
  app: MonitorApp;
}

export interface LastMonitorEvent {
  type: MonitorEventType;
  timestamp: string;
  app: string;
}

const MONITOR_SCHEMES: Record<MonitorApp, string> = {
  'baby-monitor-3g': 'baby-monitor-3g://',
  'cloudbaby': 'cloudbaby://',
  'nanit': 'nanit://',
  'other': 'mobymob://',
};

const MONITOR_APP_NAMES: Record<MonitorApp, string> = {
  'baby-monitor-3g': 'Baby Monitor 3G',
  'cloudbaby': 'Cloud Baby Camera',
  'nanit': 'Nanit',
  'other': 'Baby Monitor',
};

export function useMonitorLink() {
  const getPreferredApp = async (): Promise<MonitorApp | null> => {
    try {
      const val = await AsyncStorage.getItem(PREFERRED_APP_KEY);
      if (val === 'baby-monitor-3g' || val === 'cloudbaby' || val === 'nanit' || val === 'other') {
        return val;
      }
      return null;
    } catch {
      return null;
    }
  };

  const setPreferredApp = async (app: MonitorApp): Promise<void> => {
    await AsyncStorage.setItem(PREFERRED_APP_KEY, app);
  };

  const openMonitorApp = async (): Promise<boolean> => {
    try {
      const app = await getPreferredApp();
      if (!app) {
        Alert.alert('No Monitor App', 'Please select a monitor app in Profile settings first.');
        return false;
      }
      const scheme = MONITOR_SCHEMES[app];
      const canOpen = await Linking.canOpenURL(scheme);
      if (canOpen) {
        await Linking.openURL(scheme);
        return true;
      } else {
        Alert.alert('App Not Found', `${MONITOR_APP_NAMES[app]} is not installed on this device.`);
        return false;
      }
    } catch {
      return false;
    }
  };

  const getLastEvent = async (): Promise<LastMonitorEvent | null> => {
    try {
      const raw = await AsyncStorage.getItem(LAST_EVENT_KEY);
      if (raw) return JSON.parse(raw);
      return null;
    } catch {
      return null;
    }
  };

  const saveLastEvent = async (event: Omit<LastMonitorEvent, 'app'>): Promise<void> => {
    const app = await getPreferredApp();
    const fullEvent: LastMonitorEvent = { ...event, app: app || 'other' };
    await AsyncStorage.setItem(LAST_EVENT_KEY, JSON.stringify(fullEvent));
    // Also append to history
    const historyRaw = await AsyncStorage.getItem(MONITOR_EVENTS_KEY);
    const history: MonitorEvent[] = historyRaw ? JSON.parse(historyRaw) : [];
    const newEvent: MonitorEvent = { id: Date.now().toString(), ...event, app: app || 'other' };
    const updated = [newEvent, ...history].slice(0, 100); // keep last 100
    await AsyncStorage.setItem(MONITOR_EVENTS_KEY, JSON.stringify(updated));
  };

  const getMonitorEvents = async (): Promise<MonitorEvent[]> => {
    try {
      const raw = await AsyncStorage.getItem(MONITOR_EVENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const getMonitorAppName = (app: MonitorApp): string => MONITOR_APP_NAMES[app];

  return { getPreferredApp, setPreferredApp, openMonitorApp, getLastEvent, saveLastEvent, getMonitorEvents, getMonitorAppName };
}
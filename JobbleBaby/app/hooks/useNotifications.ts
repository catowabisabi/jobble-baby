import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export function useNotifications() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      setNotificationChannel();
    }
  }, []);

  const requestPermissions = async (): Promise<PermissionStatus> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status as PermissionStatus;
    } catch { return 'denied'; }
  };

  const getPermissionStatus = async (): Promise<PermissionStatus> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status as PermissionStatus;
    } catch { return 'undetermined'; }
  };

  const scheduleSleepNotification = async (
    title: string,
    body: string,
    weekday: number = 1,
    hour: number = 14,
    minute: number = 0
  ): Promise<string> => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        } as Notifications.NotificationTriggerInput,
      });
      return id;
    } catch { return ''; }
  };

  const scheduleFeedingReminder = async (
    title: string,
    body: string,
    weekday: number = 1,
    hour: number = 9,
    minute: number = 0
  ): Promise<string> => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour,
          minute,
        } as Notifications.NotificationTriggerInput,
      });
      return id;
    } catch { return ''; }
  };

  const scheduleDailySummary = async (
    title: string,
    body: string,
    hour: number = 20,
    minute: number = 0
  ): Promise<string> => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        } as Notifications.NotificationTriggerInput,
      });
      return id;
    } catch { return ''; }
  };

  const cancelAllNotifications = async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch { }
  };

  const setNotificationChannel = async (): Promise<void> => {
    if (Platform.OS !== 'android') return;

    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    } catch { }
  };

  return {
    requestPermissions,
    getPermissionStatus,
    scheduleSleepNotification,
    scheduleFeedingReminder,
    scheduleDailySummary,
    cancelAllNotifications,
    setNotificationChannel,
  };
}

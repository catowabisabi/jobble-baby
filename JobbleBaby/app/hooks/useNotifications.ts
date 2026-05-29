import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export function useNotifications() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      setNotificationChannel();
    }
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  };

  const getPermissionStatus = async (): Promise<PermissionStatus> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status as PermissionStatus;
    } catch (error) {
      console.error('Failed to get permission status:', error);
      return 'undetermined';
    }
  };

  const scheduleSleepNotification = async (
    title: string,
    body: string,
    hoursFromNow: number = 1
  ): Promise<string> => {
    try {
      const date = new Date();
      date.setHours(date.getHours() + hoursFromNow);
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        } as Notifications.NotificationTriggerInput,
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule sleep notification:', error);
      return '';
    }
  };

  const scheduleFeedingReminder = async (
    title: string,
    body: string,
    hour: number = 9,
    minute: number = 0
  ): Promise<string> => {
    try {
      const date = new Date();
      date.setHours(hour, minute, 0, 0);
      if (date.getTime() < Date.now()) {
        date.setDate(date.getDate() + 1);
      }
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        } as Notifications.NotificationTriggerInput,
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule feeding reminder:', error);
      return '';
    }
  };

  const cancelAllNotifications = async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
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
    } catch (error) {
      console.error('Failed to set notification channel:', error);
    }
  };

  return {
    requestPermissions,
    getPermissionStatus,
    scheduleSleepNotification,
    scheduleFeedingReminder,
    cancelAllNotifications,
    setNotificationChannel,
  };
}

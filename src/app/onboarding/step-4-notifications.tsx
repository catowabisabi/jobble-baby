import React, { useState, useRef } from 'react';
import { View, Text, Switch, StyleSheet, Animated as RNAnimated } from 'react-native';
import * as Notifications from 'expo-notifications';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

interface Step4NotificationsProps {
  onComplete: (notificationsEnabled: boolean) => void;
}

export default function Step4Notifications({ onComplete }: Step4NotificationsProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isAnimating, setIsAnimating] = useState(false);
  const [radarActive, setRadarActive] = useState(false);

  const pulseAnim1 = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim2 = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim3 = useRef(new RNAnimated.Value(0)).current;

  const triggerRadarAnimation = () => {
    setIsAnimating(true);

    const createPulse = (anim: RNAnimated.Value, delay: number) => {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(anim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          RNAnimated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    createPulse(pulseAnim1, 0);
    createPulse(pulseAnim2, 500);
    createPulse(pulseAnim3, 1000);

    setTimeout(() => {
      setIsAnimating(false);
      setRadarActive(true);
    }, 3000);
  };

  const requestPermission = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      setPermissionStatus('granted');
      setNotificationsEnabled(true);
      triggerRadarAnimation();
      return;
    }

    const { status } = await Notifications.requestPermissionsAsync();

    if (status === 'granted') {
      setPermissionStatus('granted');
      setNotificationsEnabled(true);
      triggerRadarAnimation();
    } else {
      setPermissionStatus('denied');
      setNotificationsEnabled(false);
    }
  };

  const RadarAnimation = () => (
    <View style={styles.radarContainer}>
      {[pulseAnim1, pulseAnim2, pulseAnim3].map((anim, idx) => {
        const size = 80 + idx * 40;
        return (
          <RNAnimated.View
            key={idx}
            style={[
              styles.radarCircle,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 0],
                }),
                transform: [{
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1.5],
                  }),
                }],
              },
            ]}
          />
        );
      })}
      <View style={styles.radarCenter}>
        <Text style={styles.radarIcon}>📡</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        啟動獵頭雷達
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        接收最新職位配對通知
      </ThemedText>

      <View style={styles.toggleSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Text style={styles.toggleIcon}>🔔</Text>
            <ThemedText type="default">接收通知</ThemedText>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={requestPermission}
            trackColor={{ false: Colors.light.backgroundElement, true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>

        {permissionStatus === 'denied' && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.deniedMessage}>
            <ThemedText themeColor="textSecondary" type="small">
              請在設定中啟用通知
            </ThemedText>
          </Animated.View>
        )}
      </View>

      {(isAnimating || radarActive) && (
        <Animated.View entering={FadeIn.duration(500)} style={styles.radarSection}>
          <RadarAnimation />
          {radarActive && (
            <Animated.View entering={FadeIn.delay(500).duration(300)}>
              <View style={styles.activeBadge}>
                <Text style={styles.activeIcon}>✓</Text>
                <ThemedText type="smallBold" style={styles.activeText}>
                  獵頭雷達已啟動
                </ThemedText>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {!isAnimating && !radarActive && (
        <View style={styles.previewSection}>
          <View style={styles.radarPreview}>
            <Text style={styles.radarPreviewIcon}>📡</Text>
          </View>
          <ThemedText themeColor="textSecondary" type="small" style={styles.previewText}>
            開啟通知，及時接收心水職位
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.four,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: Spacing.five,
  },
  toggleSection: {
    width: '100%',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toggleIcon: {
    fontSize: 24,
  },
  deniedMessage: {
    marginTop: Spacing.two,
    padding: Spacing.two,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  radarSection: {
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  radarContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  radarCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarIcon: {
    fontSize: 28,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: '#E8F5E9',
    borderRadius: Spacing.five,
  },
  activeIcon: {
    fontSize: 16,
    color: '#34C759',
  },
  activeText: {
    color: '#34C759',
  },
  previewSection: {
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  radarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.backgroundElement,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  radarPreviewIcon: {
    fontSize: 48,
  },
  previewText: {
    textAlign: 'center',
  },
});
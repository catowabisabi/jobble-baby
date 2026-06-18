import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMonitorLink, LastMonitorEvent } from '../hooks/useMonitorLink';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../theme';

const EVENT_ICONS: Record<string, any> = {
  sound: 'microphone',
  motion: 'vibrate',
  cry: 'baby-face-outline',
};

export default function MonitorWidget() {
  const { getLastEvent, openMonitorApp } = useMonitorLink();
  const { effectiveTheme } = useTheme();
  const { t } = useLanguage();
  const C = COLORS[effectiveTheme];

  const [lastEvent, setLastEvent] = useState<LastMonitorEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const event = await getLastEvent();
      setLastEvent(event);
      setLoading(false);
    };
    load();
  }, []);

  const handlePress = async () => {
    await openMonitorApp();
  };

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <ActivityIndicator size="small" color={C.muted} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}
      activeOpacity={0.7}
      onPress={handlePress}
      accessibilityLabel={lastEvent ? t('monitor.lastEvent') : t('monitor.noEvents')}
    >
      <View style={styles.iconContainer}>
        {lastEvent ? (
          <MaterialCommunityIcons
            name={EVENT_ICONS[lastEvent.type] || 'baby-face-outline'}
            size={28}
            color="#3B82F6"
          />
        ) : (
          <Text style={styles.emoji}>📹</Text>
        )}
      </View>
      <View style={styles.content}>
        {lastEvent ? (
          <>
            <Text style={[styles.primaryText, { color: C.text }]}>
              {lastEvent.type === 'cry' ? '👶 Cry detected' : lastEvent.type === 'motion' ? '📳 Motion detected' : '🔊 Sound detected'}
            </Text>
            <Text style={[styles.secondaryText, { color: C.muted }]}>
              {new Date(lastEvent.timestamp).toLocaleString()} · {lastEvent.app}
            </Text>
          </>
        ) : (
          <Text style={[styles.noEventText, { color: C.muted }]}>
            {t('monitor.noEvents') || 'No monitor events yet — tap to open monitor app'}
          </Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={C.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emoji: { fontSize: 24 },
  content: { flex: 1 },
  primaryText: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  secondaryText: { fontSize: 12 },
  noEventText: { fontSize: 13 },
});

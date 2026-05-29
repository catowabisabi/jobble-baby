import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingRowProps {
  icon: string;
  label: string;
}

const SETTINGS = [
  { icon: '🔔', label: 'Notifications', key: 'notifications' },
  { icon: '📤', label: 'Data Export', key: 'data-export' },
  { icon: '🔒', label: 'Privacy', key: 'privacy' },
  { icon: 'ℹ️', label: 'About', key: 'about' },
];

function SettingRow({ icon, label }: SettingRowProps) {
  return (
    <TouchableOpacity style={rowStyles.container} activeOpacity={0.7}>
      <View style={rowStyles.left}>
        <Text style={rowStyles.icon}>{icon}</Text>
        <Text style={rowStyles.label}>{label}</Text>
      </View>
      <Text style={rowStyles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  left: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 20, marginRight: 12 },
  label: { fontSize: 16, color: '#E2E8F0', fontWeight: '500' },
  chevron: { fontSize: 20, color: '#64748B' },
});

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Parent Profile</Text>
        </View>

        {/* Avatar + Info */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>JS</Text>
          </View>
          <View style={styles.parentInfo}>
            <Text style={styles.parentName}>Jamie & Sam</Text>
            <Text style={styles.parentEmail}>jamie@jobble.app</Text>
          </View>
        </View>

        {/* Baby Profile Card */}
        <View style={styles.babyCard}>
          <View style={styles.babyHeader}>
            <Text style={styles.babyEmoji}>👶</Text>
            <View>
              <Text style={styles.babyName}>Luna</Text>
              <Text style={styles.babyMeta}>Born Jan 15, 2026 · Girl</Text>
            </View>
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsLabel}>Settings</Text>
          {SETTINGS.map((s) => (
            <SettingRow key={s.key} icon={s.icon} label={s.label} />
          ))}
        </View>

        {/* App version */}
        <Text style={styles.version}>Jobble Baby v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0D0F' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  sectionTitle: { fontSize: 28, fontWeight: '800', color: '#F8FAFC', letterSpacing: -0.5 },
  avatarCard: {
    backgroundColor: '#1A1A1E',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitials: { fontSize: 22, fontWeight: '800', color: '#fff' },
  parentInfo: { flex: 1 },
  parentName: { fontSize: 18, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  parentEmail: { fontSize: 14, color: '#94A3B8' },
  babyCard: {
    backgroundColor: '#1A1A1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  babyHeader: { flexDirection: 'row', alignItems: 'center' },
  babyEmoji: { fontSize: 32, marginRight: 14 },
  babyName: { fontSize: 18, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  babyMeta: { fontSize: 14, color: '#94A3B8' },
  settingsSection: { marginBottom: 24 },
  settingsLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  version: { fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 8 },
});
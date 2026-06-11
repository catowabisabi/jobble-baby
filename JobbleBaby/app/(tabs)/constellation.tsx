import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

// Milestone constellation data
const MILESTONE_CLUSTERS = [
  {
    name: 'Motor Orion',
    color: '#3B82F6',
    milestones: [
      { id: 'head_control', label: 'Head Control', age: '0-2mo', connections: ['rolling', 'sitting'] },
      { id: 'rolling', label: 'Rolling Both Ways', age: '4-6mo', connections: ['crawling', 'pulling_up'] },
      { id: 'sitting', label: 'Sitting Unsupported', age: '6-7mo', connections: ['crawling', 'standing'] },
      { id: 'crawling', label: 'Crawling', age: '7-9mo', connections: ['pulling_up', 'cruising'] },
      { id: 'pulling_up', label: 'Pulling to Stand', age: '8-10mo', connections: ['cruising', 'walking'] },
      { id: 'cruising', label: 'Cruising', age: '9-11mo', connections: ['walking'] },
      { id: 'walking', label: 'First Steps', age: '11-14mo', connections: [] },
    ],
  },
  {
    name: 'Social Cassiopeia',
    color: '#EC4899',
    milestones: [
      { id: 'social_smile', label: 'Social Smile', age: '0-2mo', connections: ['joint_attention'] },
      { id: 'eye_contact', label: 'Eye Contact', age: '0-2mo', connections: ['joint_attention', 'stranger_wariness'] },
      { id: 'joint_attention', label: 'Joint Attention', age: '6-9mo', connections: ['pointing', 'gestures'] },
      { id: 'stranger_wariness', label: 'Stranger Wariness', age: '7-10mo', connections: ['separation_anxiety'] },
      { id: 'separation_anxiety', label: 'Separation Anxiety', age: '8-14mo', connections: ['object_permanence'] },
      { id: 'pointing', label: 'Pointing', age: '9-12mo', connections: ['words'] },
      { id: 'gestures', label: 'Gestures (bye-bye)', age: '9-12mo', connections: ['words'] },
      { id: 'words', label: 'First Words', age: '10-14mo', connections: [] },
    ],
  },
  {
    name: 'Sensory Ursa',
    color: '#10B981',
    milestones: [
      { id: 'vestibular_tolerance', label: 'Vestibular Tolerance', age: '0-3mo', connections: ['rolling', 'balance'] },
      { id: 'balance', label: 'Balance', age: '4-6mo', connections: ['sitting', 'crawling'] },
      { id: 'pincer_grasp', label: 'Pincer Grasp', age: '8-10mo', connections: ['self_feeding'] },
      { id: 'self_feeding', label: 'Self Feeding', age: '9-12mo', connections: [] },
    ],
  },
];

const STAR_SIZE = 44;

export default function ConstellationScreen() {
  const { t } = useLanguage();
  const [selectedCluster, setSelectedCluster] = useState(0);
  const [selectedStar, setSelectedStar] = useState<string | null>(null);
  const [loggedMilestones, setLoggedMilestones] = useState<Set<string>>(new Set());

  const cluster = MILESTONE_CLUSTERS[selectedCluster];

  const toggleMilestone = (id: string) => {
    setLoggedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedData = selectedStar
    ? cluster.milestones.find(m => m.id === selectedStar)
    : null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t('constellation.title')}</Text>
      <Text style={styles.subtitle}>{t('constellation.subtitle')}</Text>

      {/* Cluster selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clusterSelector}>
        {MILESTONE_CLUSTERS.map((c, i) => (
          <TouchableOpacity
            key={c.name}
            style={[styles.clusterChip, selectedCluster === i && { backgroundColor: c.color }]}
            onPress={() => { setSelectedCluster(i); setSelectedStar(null); }}
          >
            <Text style={[styles.clusterChipText, selectedCluster === i && { color: '#fff' }]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Constellation map */}
      <View style={styles.constellationContainer}>
        <View style={[styles.constellationBg, { borderColor: cluster.color + '30' }]}>
          {cluster.milestones.map((m, idx) => {
            const isLogged = loggedMilestones.has(m.id);
            const isSelected = selectedStar === m.id;
            const angle = (idx / cluster.milestones.length) * 2 * Math.PI - Math.PI / 2;
            const radius = 100;
            const cx = 160 + radius * Math.cos(angle);
            const cy = 160 + radius * Math.sin(angle);

            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.star,
                  {
                    left: cx - STAR_SIZE / 2,
                    top: cy - STAR_SIZE / 2,
                    backgroundColor: isLogged ? cluster.color : '#1a1a2e',
                    borderColor: isSelected ? cluster.color : isLogged ? cluster.color : '#374151',
                    borderWidth: isSelected ? 3 : 2,
                  },
                ]}
                onPress={() => setSelectedStar(isSelected ? null : m.id)}
                accessibilityLabel={`${m.label} milestone, age ${m.age}${isLogged ? ', logged' : ''}`}
              >
                <Text style={styles.starEmoji}>
                  {isLogged ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            );
          })}
          {/* Connection lines (simplified: draw to center) */}
          {cluster.milestones.map((m, idx) => {
            if (!m.connections.length) return null;
            return m.connections.slice(0, 1).map(connId => {
              const connIdx = cluster.milestones.findIndex(x => x.id === connId);
              if (connIdx < 0) return null;
              return (
                <View key={`${m.id}-${connId}`} style={styles.connectionHint}>
                  <Text style={styles.connectionText}>
                    → {cluster.milestones[connIdx].label}
                  </Text>
                </View>
              );
            });
          })}
        </View>
      </View>

      {/* Star detail panel */}
      {selectedData && (
        <View style={[styles.detailPanel, { borderLeftColor: cluster.color }]}>
          <Text style={styles.detailTitle}>{selectedData.label}</Text>
          <Text style={styles.detailAge}>Age: {selectedData.age}</Text>
          <Text style={styles.detailConnections}>
            Enables: {selectedData.connections.length > 0
              ? selectedData.connections.map(id => cluster.milestones.find(m => m.id === id)?.label).filter(Boolean).join(', ')
              : 'Final milestone'}
          </Text>
          <TouchableOpacity
            style={[styles.logButton, { backgroundColor: loggedMilestones.has(selectedData.id) ? '#374151' : cluster.color }]}
            onPress={() => toggleMilestone(selectedData.id)}
            accessibilityLabel={loggedMilestones.has(selectedData.id) ? 'Unmark milestone' : 'Log milestone'}
          >
            <Text style={styles.logButtonText}>
              {loggedMilestones.has(selectedData.id) ? '✓ Logged' : '+ Log Milestone'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logged count */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{loggedMilestones.size}</Text>
          <Text style={styles.statLabel}>{t('constellation.logged')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{cluster.milestones.length}</Text>
          <Text style={styles.statLabel}>{t('constellation.total')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{cluster.milestones.length - loggedMilestones.size}</Text>
          <Text style={styles.statLabel}>{t('constellation.remaining')}</Text>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0F', padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#F9FAFB', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 16 },
  clusterSelector: { marginBottom: 16 },
  clusterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#1F2937', marginRight: 8,
  },
  clusterChipText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  constellationContainer: { alignItems: 'center', marginBottom: 16 },
  constellationBg: {
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: '#0f0f1a', borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  star: {
    position: 'absolute', width: STAR_SIZE, height: STAR_SIZE,
    borderRadius: STAR_SIZE / 2, justifyContent: 'center', alignItems: 'center',
  },
  starEmoji: { fontSize: 20, color: '#fff' },
  connectionHint: { position: 'absolute', top: 160, left: 160 },
  connectionText: { color: '#4B5563', fontSize: 10 },
  detailPanel: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16,
    borderLeftWidth: 4, marginBottom: 16,
  },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#F9FAFB', marginBottom: 4 },
  detailAge: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  detailConnections: { fontSize: 13, color: '#D1D5DB', marginBottom: 12 },
  logButton: {
    paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  logButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#1F2937', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#F9FAFB' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  bottomPadding: { height: 40 },
});

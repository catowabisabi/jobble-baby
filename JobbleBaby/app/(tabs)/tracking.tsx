import { StyleSheet, Text, View } from 'react-native';

export default function TrackingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Baby Tracking</Text>
      <Text style={styles.section}>Diaper Log</Text>
      <Text style={styles.placeholder}>[Diaper change entries will appear here]</Text>
      <Text style={styles.section}>Feeding Log</Text>
      <Text style={styles.placeholder}>[Feeding entries will appear here]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  section: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  placeholder: { fontSize: 14, color: '#999', fontStyle: 'italic' },
});
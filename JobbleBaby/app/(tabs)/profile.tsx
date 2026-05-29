import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parent Profile</Text>
      <Text style={styles.placeholder}>[Parent profile and settings will appear here]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  placeholder: { fontSize: 14, color: '#999', fontStyle: 'italic' },
});
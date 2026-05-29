import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={[styles.container, { backgroundColor: '#E6F4FE' }]}>
      <Text style={styles.title}>Jobble Baby</Text>
      <Text style={styles.subtitle}>嬰兒用品資訊</Text>
      <Text style={styles.welcome}>歡迎來到 Jobble Baby！</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 20, color: '#666', marginBottom: 24 },
  welcome: { fontSize: 16, color: '#333' },
});
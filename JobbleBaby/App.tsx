import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Jobble Baby</Text>
      <Text style={styles.subtitle}>嬰兒用品資訊</Text>
      <Text style={styles.welcome}>歡迎來到 Jobble Baby！</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 24,
  },
  welcome: {
    fontSize: 16,
    color: '#333',
  },
});

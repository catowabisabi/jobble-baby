import AsyncStorage from '@react-native-async-storage/async-storage';

export async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn(`[SafeStorage] Failed to getItem("${key}"):`, error);
    return null;
  }
}

export async function safeSetItem(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[SafeStorage] Failed to setItem("${key}"):`, error);
    return false;
  }
}

export async function safeRemoveItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[SafeStorage] Failed to removeItem("${key}"):`, error);
    return false;
  }
}

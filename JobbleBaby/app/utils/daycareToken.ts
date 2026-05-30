// Daycare Token Utility — encode/decode baby profile tokens for sharing with daycare
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DAYCARE_TOKEN_KEY = '@jobble/daycare_token';

export interface DaycareTokenPayload {
  babyName: string;
  birthDate: string; // ISO date string
  sharedAt: string; // ISO date string
}

export interface StoredDaycareToken {
  token: string;
  createdAt: number; // Unix ms timestamp
  expiresAt: number; // Unix ms timestamp
}

interface BabyProfile {
  name: string;
  birthDate: string;
  gender?: string;
}

/**
 * Base64 encode — React Native safe, handles Unicode (emoji, Chinese, etc.)
 */
function base64Encode(str: string): string {
  const bytes = new Uint8Array(new TextEncoder().encode(str));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Base64 decode — React Native safe, handles Unicode
 */
function base64Decode(str: string): string {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Encode a baby profile into a base64 token string
 */
export function encodeDaycareToken(profile: BabyProfile): string {
  const payload: DaycareTokenPayload = {
    babyName: profile.name,
    birthDate: profile.birthDate,
    sharedAt: new Date().toISOString(),
  };
  return base64Encode(JSON.stringify(payload));
}

/**
 * Decode a token string back into a DaycareTokenPayload.
 * Returns null if the token is invalid (bad base64 or JSON parse failure).
 */
export function decodeDaycareToken(token: string): DaycareTokenPayload | null {
  try {
    const json = base64Decode(token);
    const parsed = JSON.parse(json);
    if (
      typeof parsed.babyName === 'string' &&
      typeof parsed.birthDate === 'string' &&
      typeof parsed.sharedAt === 'string'
    ) {
      return parsed as DaycareTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Store a daycare token with a 30-day expiry in AsyncStorage.
 */
export async function storeDaycareToken(token: string): Promise<void> {
  const stored: StoredDaycareToken = {
    token,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  await AsyncStorage.setItem(DAYCARE_TOKEN_KEY, JSON.stringify(stored));
}

/**
 * Retrieve the stored daycare token.
 * Returns null if nothing is stored, or if the token is expired (in which case it deletes the expired entry).
 */
export async function getDaycareToken(): Promise<StoredDaycareToken | null> {
  try {
    const raw = await AsyncStorage.getItem(DAYCARE_TOKEN_KEY);
    if (!raw) return null;
    const stored: StoredDaycareToken = JSON.parse(raw);
    if (isTokenExpired(stored.expiresAt)) {
      await AsyncStorage.removeItem(DAYCARE_TOKEN_KEY);
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

/**
 * Check whether a token's expiry time has passed.
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}

/**
 * Check whether a daycare token payload has expired (7 days from sharedAt).
 */
export function isTokenExpiredPayload(payload: DaycareTokenPayload): boolean {
  const sharedAt = new Date(payload.sharedAt);
  const now = new Date();
  const diffMs = now.getTime() - sharedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 7;
}

/**
 * Returns the ceiling of days remaining until the token expires.
 * Returns 0 if already expired.
 */
export function getTokenDaysRemaining(expiresAt: number): number {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

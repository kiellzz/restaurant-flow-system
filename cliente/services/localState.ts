import AsyncStorage from '@react-native-async-storage/async-storage';

export const SESSION_KEY = 'restaurant.session.v1';
export const cartStorageKey = (sessionId: string) => `restaurant.cart.v1.${sessionId}`;

// Keep rapid edits and clears in order so an older write cannot restore a cleared cart.
const writes = new Map<string, Promise<void>>();
export function writeLocalState(key: string, value: unknown | null): Promise<void> {
  const next = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(() => (
    value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, JSON.stringify(value))
  ));
  writes.set(key, next);
  void next.finally(() => { if (writes.get(key) === next) writes.delete(key); }).catch(() => {});
  return next;
}

export async function readLocalState(key: string): Promise<unknown> {
  await writes.get(key)?.catch(() => {});
  const text = await AsyncStorage.getItem(key);
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

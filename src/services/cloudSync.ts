// src/services/cloudSync.ts
// Kullanıcının araç ve rota geçmişi verilerini, kendi hesabına bağlı olarak
// Firebase Realtime Database'de saklamak için kullanılan yardımcı fonksiyonlar.
// Her kullanıcının verisi kendi kimliğine (uid) özel bir yolda tutulur:
// /users/{uid}/vehicles  ve  /users/{uid}/history

import { auth, db } from '@/config/firebase';
import { get, ref, remove, set } from 'firebase/database';

function userPath(path: string): string | null {
  const uid = auth.currentUser?.uid;
  return uid ? `users/${uid}/${path}` : null;
}

/**
 * Veriyi bulutta, giriş yapmış kullanıcının kendi alanına kaydeder.
 * Giriş yapılmamışsa sessizce hiçbir şey yapmaz (uygulama yerel depolamayla
 * çalışmaya devam eder).
 */
export function syncToCloud(path: string, data: unknown) {
  const fullPath = userPath(path);
  if (!fullPath) return;
  set(ref(db, fullPath), data).catch((error) => {
    console.log(`Bulut senkronizasyon hatası (${path}):`, error);
  });
}

/**
 * Bulutta kayıtlı veriyi getirir. Giriş yapılmamışsa ya da veri yoksa
 * null döner.
 */
export async function fetchFromCloud<T>(path: string): Promise<T | null> {
  const fullPath = userPath(path);
  if (!fullPath) return null;
  try {
    const snapshot = await get(ref(db, fullPath));
    return snapshot.exists() ? (snapshot.val() as T) : null;
  } catch (error) {
    console.log(`Bulut okuma hatası (${path}):`, error);
    return null;
  }
}

/** Bulutta kayıtlı veriyi tamamen siler. */
export function clearCloudPath(path: string) {
  const fullPath = userPath(path);
  if (!fullPath) return;
  remove(ref(db, fullPath)).catch((error) => {
    console.log(`Bulut silme hatası (${path}):`, error);
  });
}
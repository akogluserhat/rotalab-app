// src/config/firebase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
// Not: getReactNativePersistence, 'firebase/auth' paketinde değil,
// alttaki '@firebase/auth' paketinde bulunuyor. TypeScript'in tip denetleyicisi
// bu paketin "react-native" sürümünü değil "node" sürümünü referans aldığı için
// (gerçek uygulamada Expo/Metro doğru sürümü kullanır) burada zararsız bir
// tip hatası görünür; bu yüzden bir sonraki satırda bastırıyoruz.
// @ts-ignore
import { getReactNativePersistence } from '@firebase/auth';
import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDBtt-vFa1LVdzsmcfxX-8rrnmYNacg8x8",
  authDomain: "rotalab-app.firebaseapp.com",
  databaseURL: "https://rotalab-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "rotalab-app",
  storageBucket: "rotalab-app.firebasestorage.app",
  messagingSenderId: "948700399740",
  appId: "1:948700399740:web:087665ff116997eea4e1f9",
  measurementId: "G-KQH4XZ3R1B"
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Realtime Database servisini dışa aktar
export const db = getDatabase(app);

// Authentication servisini dışa aktar (oturumu telefonda hatırlaması için
// AsyncStorage ile birlikte başlatılıyor)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
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
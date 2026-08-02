// src/app/(tabs)/index.tsx
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text } from 'react-native';
import FuelPriceCard from '../../components/FuelPriceCard';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>RotaLab 🚀</Text>
        <Text style={styles.subtitle}>Veri Katmanı Entegrasyon Testi</Text>

        {/* Firebase'den canlı veri çeken test bileşenimiz */}
        <FuelPriceCard />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
    marginTop: 4,
  },
});
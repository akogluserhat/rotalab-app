// src/components/FuelPriceCard.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FuelPriceData, FuelRepository } from '../services/fuelRepository';

export default function FuelPriceCard() {
  const [prices, setPrices] = useState<FuelPriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFuelPrices() {
      try {
        // İstanbul (34) plakasının verisini Realtime Database'den çekiyoruz
        const data = await FuelRepository.getPricesByCity('34');
        setPrices(data);
      } catch (err) {
        console.error('Fiyat yükleme hatası:', err);
        setError('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    }

    loadFuelPrices();
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#0066cc" />
        <Text style={styles.loadingText}>Akaryakıt fiyatları çekiliyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>İstanbul (34) Akaryakıt Fiyatları</Text>
      <Text style={styles.priceText}>⛽ Benzin: {prices?.benzin} TL</Text>
      <Text style={styles.priceText}>🚜 Motorin: {prices?.motorin} TL</Text>
      <Text style={styles.priceText}>💨 LPG: {prices?.lpg} TL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    // Gölge efekti
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  priceText: {
    fontSize: 14,
    marginVertical: 4,
    color: '#555',
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#777',
  },
});
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { router } from 'expo-router';
import { Theme } from '@/constants/Theme';

export default function ResultsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hesaplama Sonuçları</Text>
      <Button title="Geri Dön" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Theme.colors.background,
  },
  title: {
    fontFamily: Theme.fonts.bold,
    fontSize: 20,
    marginVertical: 20,
  }
});

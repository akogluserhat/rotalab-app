import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';

export function Logo() {
  return (
    <View style={styles.container}>
      <Text style={styles.logoText}>RotaLab</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontFamily: Theme.fonts.bold,
    fontSize: 24,
  },
});

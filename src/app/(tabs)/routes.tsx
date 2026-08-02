import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '@/constants/Theme';

export default function RoutesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Geçmiş Rotalar</Text>
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
  }
});

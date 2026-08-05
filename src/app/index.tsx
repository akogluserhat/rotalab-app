import FuelPriceCard from '@/components/FuelPriceCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    DeviceEventEmitter,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const THEME_KEY = '@rotalab_theme';

export default function HomeScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
    const sub = DeviceEventEmitter.addListener('themeChanged', (mode: string) => {
      setIsDarkMode(mode === 'dark');
    });
    return () => sub.remove();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      setIsDarkMode(savedTheme === 'dark');
    } catch (e) {
      console.log('Tema okuma hatası:', e);
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            
            {/* 🖼️ BİR TIK DAHA BÜYÜTÜLMÜŞ LOGO ALANI */}
            <View style={styles.logoWrapper}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
              En akıllı rotanı oluşturmaya hazır mısın?
            </Text>

            {/* 📋 ROTA PLANLA KARTI */}
            <View style={[styles.card, isDarkMode && styles.cardDark]}>
              <Text style={[styles.cardTitle, isDarkMode && styles.textWhite]}>
                Yeni Rota Planla
              </Text>
              <Text style={[styles.cardDescription, isDarkMode && styles.textGray]}>
                Başlangıç ve varış noktalarını seç, aracına en uygun optimize edilmiş rotayı bul.
              </Text>

              <TouchableOpacity
                style={styles.createButton}
                activeOpacity={0.85}
                onPress={() => router.push('/plan')}
              >
                <Text style={styles.createButtonText}>Rota Oluştur</Text>
              </TouchableOpacity>
            </View>

            {/* ⛽ CANLI AKARYAKIT FİYATLARI KARTI */}
            <View style={styles.fuelCardWrapper}>
              <FuelPriceCard />
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#0F172A',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 65,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logoWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: width,        // Ekranın tam genişliğini kullanır
    height: 275,         // Logo tam bir tık daha büyütüldü
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginTop: -10,
    marginBottom: 36,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  subtitleDark: {
    color: '#94A3B8',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#b85d00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F8FAFC',
  },
  cardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#b85d00',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#b85d00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  fuelCardWrapper: {
    width: '100%',
    marginTop: 16,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textGray: {
    color: '#94A3B8',
  },
});
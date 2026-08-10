import { syncToCloud } from '@/services/cloudSync';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavBar from '../components/BottomNavBar';

const NAV_BAR_HEIGHT = Platform.OS === 'ios' ? 82 : 65;
const HISTORY_STORAGE_KEY = '@rotamap_history';
const THEME_KEY = ' @rotamap_theme';

export default function RouteDetailsScreen() {
  const params = useLocalSearchParams();

  const origin = (params.origin as string) || 'Kalkış';
  const destination = (params.destination as string) || 'Varış';
  const price = (params.price as string) || '1.224,50 ₺';
  const distance = (params.distance as string) || '443 km';
  const duration = (params.duration as string) || '4s 45d';
  const vehicleType = (params.vehicleType as string) || 'Binek';
  const fuelType = (params.fuelType as string) || 'Motorin';
  const consumption = (params.consumption as string) || '6,5';
  const vehicleName = (params.vehicleName as string) || '';
  const plate = (params.plate as string) || '';

  // Rota Türünü Doğru Tespit Etme
  const rawRouteType = (params.routeType as string) || '';
  const rawRouteTitle = (params.routeTitle as string) || '';

  const isFastRoute = rawRouteType === 'fast' || rawRouteTitle.includes('Hızlı');
  const routeTitle = isFastRoute ? 'En Hızlı' : 'En Ekonomik';

  const [saved, setSaved] = useState(false);
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

  const priceClean = price.replace('₺', '').trim();
  const [mainPrice, decimalPrice] = priceClean.includes(',')
    ? priceClean.split(',')
    : [priceClean, '00'];

  const handleSaveRoute = async () => {
    try {
      const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      const historyList = stored ? JSON.parse(stored) : [];

      const newHistoryItem = {
        id: Date.now().toString(),
        origin,
        destination,
        date: new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }),
        price,
        distance,
        duration,
        vehicleType,
        fuelType,
        consumption,
        vehicleName,
        plate,
        routeTitle,
        routeType: isFastRoute ? 'fast' : 'eco',
      };

      const updatedHistory = [newHistoryItem, ...historyList];
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      syncToCloud('history', updatedHistory);
      setSaved(true);
      Alert.alert('Başarılı', 'Rota hesaplamanız Rota Geçmişim sayfasına kaydedildi!');
    } catch (error) {
      console.log('Rota kaydetme hatası:', error);
      Alert.alert('Hata', 'Rota kaydedilemedi.');
    }
  };

  const getVehicleIcon = () => {
    const vType = vehicleType.toLowerCase();
    if (vType === 'elektrikli') return 'flash-outline';
    if (vType === 'ticari') return 'bus-outline';
    return 'car-sport-outline';
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* ÜST BAR */}
      <SafeAreaView style={[styles.topSafeArea, isDarkMode && styles.topSafeAreaDark]}>
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F8FAFC' : '#1A1A1A'} />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Ionicons name="compass" size={22} color="#b85d00" />
            <Text style={styles.logoText}>
              Rota<Text style={{ fontWeight: '800' }}>Lab</Text>
            </Text>
          </View>

          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      {/* İÇERİK ALANI */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* BAŞLIK & ROTA TÜRÜ VE KAYDET */}
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.mainTitle, isDarkMode && styles.textWhite]}>Hesaplama Sonuçları</Text>
            <Text style={[styles.subTitle, isDarkMode && styles.textGray]}>
              {origin} ➔ {destination}
            </Text>
          </View>

          <View style={styles.actionHeaderRow}>
            <TouchableOpacity style={[styles.shareIconButton, isDarkMode && styles.shareIconButtonDark]}>
              <Ionicons name="share-social-outline" size={20} color={isDarkMode ? '#94A3B8' : '#4B5563'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saved && { backgroundColor: '#16A34A' }]}
              onPress={handleSaveRoute}
            >
              <Ionicons name={saved ? 'checkmark-circle' : 'bookmark'} size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{saved ? 'Kaydedildi' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🌟 SEÇİLEN ROTA TÜRÜ ROZETİ */}
        <View style={[styles.routeTypeBadge, isFastRoute ? styles.fastRouteBadge : styles.ecoRouteBadge]}>
          <Ionicons
            name={isFastRoute ? 'flash' : 'leaf'}
            size={16}
            color={isFastRoute ? '#1D63B8' : '#b85d00'}
          />
          <Text style={[styles.routeTypeBadgeText, { color: isFastRoute ? '#1D63B8' : '#b85d00' }]}>
            Seçilen Rota: {routeTitle} Rota
          </Text>
        </View>

        {/* 🚘 HESAPLAMADA KULLANILAN ARAÇ BİLGİSİ KARTI */}
        <View style={[styles.vehicleCard, isDarkMode && styles.vehicleCardDark]}>
          <View style={styles.vehicleCardHeader}>
            <View style={styles.vehicleIconCircle}>
              <Ionicons name={getVehicleIcon()} size={22} color="#b85d00" />
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.vehicleCardTitle, isDarkMode && styles.textWhite]}>
                {vehicleName ? vehicleName : `${vehicleType} Araç`}
              </Text>
              <Text style={[styles.vehicleCardSubtitle, isDarkMode && styles.textGray]}>
                {plate && plate !== 'Plaka Belirtilmedi' ? `${plate} • ` : ''}
                {fuelType} ({consumption} {fuelType === 'Elektrik' ? 'kWh' : 'L'}/100km)
              </Text>
            </View>

            {vehicleName ? (
              <View style={[styles.defaultTag, isDarkMode && styles.defaultTagDark]}>
                <Ionicons name="checkmark-circle" size={13} color="#b85d00" />
                <Text style={styles.defaultTagText}>Garajdan</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* TOPLAM MALİYET KARTI */}
        <View style={[styles.totalCard, isDarkMode && styles.cardDark]}>
          <View style={styles.totalCardBgDecoration} />
          <Text style={[styles.totalCardLabel, isDarkMode && styles.textGray]}>TOPLAM MALİYET</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currencySymbol}>₺</Text>
            <Text style={styles.priceMainText}>{mainPrice}</Text>
            <Text style={styles.priceDecimalText}>₺,{decimalPrice}</Text>
          </View>
        </View>

        {/* MESAFA VE SÜRE KARTLARI */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, isDarkMode && styles.cardDark]}>
            <View style={styles.statIconCircle}>
              <Ionicons name="map-outline" size={22} color="#2563EB" />
            </View>
            <Text style={[styles.statValue, isDarkMode && styles.textWhite]}>{distance}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.textGray]}>Mesafe</Text>
          </View>

          <View style={[styles.statCard, isDarkMode && styles.cardDark]}>
            <View style={styles.statIconCircle}>
              <Ionicons name="time-outline" size={22} color="#2563EB" />
            </View>
            <Text style={[styles.statValue, isDarkMode && styles.textWhite]}>{duration}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.textGray]}>Süre</Text>
          </View>
        </View>

        {/* MALİYET DAĞILIMI */}
        <View style={[styles.breakdownCard, isDarkMode && styles.cardDark]}>
          <View style={styles.breakdownHeader}>
            <View style={styles.breakdownTitleRow}>
              <Ionicons name="pie-chart-outline" size={20} color="#b85d00" />
              <Text style={[styles.breakdownTitle, isDarkMode && styles.textWhite]}>Maliyet Dağılımı</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressSegment, { flex: 0.67, backgroundColor: '#b85d00' }]} />
            <View style={[styles.progressSegment, { flex: 0.33, backgroundColor: '#1D63B8' }]} />
          </View>

          <View style={[styles.costItemRow, isDarkMode && styles.costItemRowDark]}>
            <View style={styles.costItemLeft}>
              <View style={[styles.dot, { backgroundColor: '#b85d00' }]} />
              <View>
                <Text style={[styles.costItemTitle, isDarkMode && styles.textWhite]}>Yakıt Gideri</Text>
                <Text style={[styles.costItemSub, isDarkMode && styles.textGray]}>
                  Ort. {consumption} {fuelType === 'Elektrik' ? 'kWh' : 'L'}/100km Tüketimle
                </Text>
              </View>
            </View>
            <Text style={[styles.costItemPrice, isDarkMode && styles.textWhite]}>{price}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 🔻 SABİT ALT NAVİGASYON BAR */}
      <BottomNavBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#0F172A',
  },
  topSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  topSafeAreaDark: {
    backgroundColor: '#1E293B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 18,
    color: '#b85d00',
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: NAV_BAR_HEIGHT + 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  subTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIconButtonDark: {
    backgroundColor: '#1E293B',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#b85d00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  routeTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 14,
  },
  ecoRouteBadge: {
    backgroundColor: '#FFF4E5',
  },
  fastRouteBadge: {
    backgroundColor: '#EFF6FF',
  },
  routeTypeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FFF4E5',
    shadowColor: '#b85d00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  vehicleCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  vehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  vehicleCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  defaultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultTagDark: {
    backgroundColor: '#334155',
  },
  defaultTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b85d00',
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    position: 'relative',
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  totalCardBgDecoration: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF4E5',
    opacity: 0.8,
  },
  totalCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: '#b85d00',
    marginRight: 4,
  },
  priceMainText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#b85d00',
    letterSpacing: -1,
  },
  priceDecimalText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#b85d00',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  breakdownHeader: {
    marginBottom: 16,
  },
  breakdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressContainer: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressSegment: {
    height: '100%',
  },
  costItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  costItemRowDark: {
    backgroundColor: '#0F172A',
  },
  costItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  costItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  costItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  costItemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textGray: {
    color: '#64748B',
  },
});
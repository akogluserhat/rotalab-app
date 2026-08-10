import { clearCloudPath, fetchFromCloud, syncToCloud } from '@/services/cloudSync';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

const HISTORY_STORAGE_KEY = '@rotamap_history';
const THEME_KEY = '@rotamap_theme';

interface HistoryItem {
  id: string;
  origin: string;
  destination: string;
  date: string;
  price: string;
  distance: string;
  duration: string;
  vehicleType: string;
  fuelType: string;
  vehicleName?: string;
  plate?: string;
  routeTitle?: string;
  routeType?: string;
}

export default function HistoryScreen() {
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      loadTheme();
    }, [])
  );

  const loadHistory = async () => {
    setRefreshing(true);
    try {
      // Önce buluttan (Firebase) okumayı dene
      const cloudHistory = await fetchFromCloud<HistoryItem[]>('history');
      if (cloudHistory && cloudHistory.length > 0) {
        setHistoryList(cloudHistory);
        await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(cloudHistory));
        return;
      }

      const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistoryList(parsed);
        // Bulutta hiç kayıt yoksa, mevcut yerel veriyi ilk kez buluta taşı
        if (cloudHistory === null && parsed.length > 0) syncToCloud('history', parsed);
      } else {
        setHistoryList([]);
      }
    } catch (error) {
      console.log('Geçmiş yükleme hatası:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 300);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Kayıt Silinsin mi?', 'Bu geçmiş rota kaydını silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const updated = historyList.filter((item) => item.id !== id);
          setHistoryList(updated);
          await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
          syncToCloud('history', updated);
        },
      },
    ]);
  };

  const handleClearAll = async () => {
    if (historyList.length === 0) return;
    Alert.alert('Tümünü Temizle', 'Tüm geçmiş rota hesaplamalarınız silinecektir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: async () => {
          setHistoryList([]);
          await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
          clearCloudPath('history');
        },
      },
    ]);
  };

  const handleReCalculate = (item: HistoryItem) => {
    router.push({
      pathname: '/route-details',
      params: {
        origin: item.origin,
        destination: item.destination,
        price: item.price,
        distance: item.distance,
        duration: item.duration,
        vehicleType: item.vehicleType,
        fuelType: item.fuelType,
        vehicleName: item.vehicleName || '',
        plate: item.plate || '',
        routeTitle: item.routeTitle || 'En Ekonomik',
        routeType: item.routeType || 'eco',
      },
    });
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* ÜST BAR */}
      <SafeAreaView style={[styles.topSafeArea, isDarkMode && styles.topSafeAreaDark]}>
        <View style={[styles.header, isDarkMode && styles.headerDark]}>
          <TouchableOpacity onPress={() => router.replace('/plan')} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F8FAFC' : '#1A1A1A'} />
          </TouchableOpacity>

          <View style={styles.logoRow}>
            <Ionicons name="time" size={22} color="#b85d00" />
            <Text style={[styles.headerTitle, isDarkMode && styles.textWhite]}>Rota Geçmişim</Text>
          </View>

          <View style={styles.headerRightRow}>
            <TouchableOpacity
              onPress={loadHistory}
              style={[styles.syncIconButton, isDarkMode && styles.syncIconButtonDark]}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#b85d00" />
              ) : (
                <Ionicons name="refresh-outline" size={20} color="#b85d00" />
              )}
            </TouchableOpacity>

            {historyList.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={styles.clearIconButton}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* İÇERİK */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textGray]}>SON HESAPLAMALAR</Text>
          <Text style={[styles.countBadge, isDarkMode && styles.countBadgeDark]}>{historyList.length} Rota</Text>
        </View>

        {historyList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, isDarkMode && styles.emptyIconCircleDark]}>
              <Ionicons name="map-outline" size={42} color={isDarkMode ? '#64748B' : '#9CA3AF'} />
            </View>
            <Text style={[styles.emptyTitle, isDarkMode && styles.textWhite]}>Geçmiş Rota Bulunamadı</Text>
            <Text style={[styles.emptySubtitle, isDarkMode && styles.textGray]}>
              Hesapladığınız tüm yakıt maliyetleri ve rotalar otomatik olarak burada saklanır.
            </Text>
            <TouchableOpacity
              style={styles.newRouteButton}
              onPress={() => router.replace('/plan')}
            >
              <Text style={styles.newRouteButtonText}>Yeni Rota Hesapla</Text>
            </TouchableOpacity>
          </View>
        ) : (
          historyList.map((item) => (
            <View key={item.id} style={[styles.card, isDarkMode && styles.cardDark]}>
              {/* Kart Üst Bilgisi */}
              <View style={styles.cardHeader}>
                <View style={styles.routeTextRow}>
                  <Text style={[styles.locationName, isDarkMode && styles.textWhite]}>{item.origin}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#b85d00" style={{ marginHorizontal: 6 }} />
                  <Text style={[styles.locationName, isDarkMode && styles.textWhite]}>{item.destination}</Text>
                </View>

                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                  <Ionicons name="close-circle-outline" size={20} color={isDarkMode ? '#64748B' : '#9CA3AF'} />
                </TouchableOpacity>
              </View>

              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

              {/* Detay Bilgileri */}
              <View style={styles.cardBody}>
                {item.vehicleName ? (
                  <View style={[styles.vehicleSelectedRow, isDarkMode && styles.vehicleSelectedRowDark]}>
                    <Ionicons name="car-sport" size={16} color="#b85d00" />
                    <Text style={styles.vehicleSelectedText}>
                      {item.vehicleName} {item.plate && item.plate !== 'Plaka Belirtilmedi' ? `(${item.plate})` : ''}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.infoRow}>
                  <View style={[styles.infoBadge, isDarkMode && styles.infoBadgeDark]}>
                    <Ionicons name="car-outline" size={14} color={isDarkMode ? '#94A3B8' : '#4B5563'} />
                    <Text style={[styles.infoBadgeText, isDarkMode && styles.textLightGray]}>
                      {item.vehicleType} • {item.fuelType}
                    </Text>
                  </View>

                  <Text style={[styles.dateText, isDarkMode && styles.textGray]}>{item.date}</Text>
                </View>

                <View style={[styles.statsRow, isDarkMode && styles.statsRowDark]}>
                  <View style={styles.statBlock}>
                    <Text style={[styles.statLabel, isDarkMode && styles.textGray]}>Mesafe</Text>
                    <Text style={[styles.statValue, isDarkMode && styles.textLightGray]}>{item.distance}</Text>
                  </View>

                  <View style={styles.statBlock}>
                    <Text style={[styles.statLabel, isDarkMode && styles.textGray]}>Süre</Text>
                    <Text style={[styles.statValue, isDarkMode && styles.textLightGray]}>{item.duration}</Text>
                  </View>

                  <View style={styles.priceBlock}>
                    <Text style={[styles.priceLabel, isDarkMode && styles.textGray]}>Maliyet</Text>
                    <Text style={styles.priceValue}>{item.price}</Text>
                  </View>
                </View>
              </View>

              {/* Aksiyon Butonu */}
              <TouchableOpacity
                style={[styles.detailsButton, isDarkMode && styles.detailsButtonDark]}
                activeOpacity={0.8}
                onPress={() => handleReCalculate(item)}
              >
                <Text style={styles.detailsButtonText}>Sonuçları Görüntüle</Text>
                <Ionicons name="chevron-forward" size={16} color="#b85d00" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* 🔻 SABİT ALT NAVİGASYON BAR */}
      <BottomNavBar activeTab="history" />
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  iconButton: {
    padding: 4,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncIconButton: {
    padding: 6,
    backgroundColor: '#FFF4E5',
    borderRadius: 10,
  },
  syncIconButtonDark: {
    backgroundColor: '#334155',
  },
  clearIconButton: {
    padding: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 85,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b85d00',
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeDark: {
    backgroundColor: '#334155',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  deleteButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  dividerDark: {
    backgroundColor: '#334155',
  },
  cardBody: {
    gap: 10,
  },
  vehicleSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  vehicleSelectedRowDark: {
    backgroundColor: '#334155',
  },
  vehicleSelectedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b85d00',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoBadgeDark: {
    backgroundColor: '#0F172A',
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 14,
  },
  statsRowDark: {
    backgroundColor: '#0F172A',
  },
  statBlock: {
    flex: 1,
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  priceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#b85d00',
    marginTop: 2,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 8,
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    gap: 4,
  },
  detailsButtonDark: {
    backgroundColor: '#334155',
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b85d00',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconCircleDark: {
    backgroundColor: '#1E293B',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  newRouteButton: {
    backgroundColor: '#b85d00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  newRouteButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textGray: {
    color: '#64748B',
  },
  textLightGray: {
    color: '#94A3B8',
  },
});
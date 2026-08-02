import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    DeviceEventEmitter,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import BottomNavBar from '../components/BottomNavBar';

const VEHICLES_KEY = '@rotalab_vehicles';
const HISTORY_KEY = '@rotalab_history';
const THEME_KEY = '@rotalab_theme';

export default function ProfileScreen() {
  const [vehicleCount, setVehicleCount] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);
  const [defaultVehicleName, setDefaultVehicleName] = useState('Seçilmedi');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStatsAndTheme();
    }, [])
  );

  const loadStatsAndTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      const isDark = savedTheme === 'dark';
      setIsDarkMode(isDark);

      // Garaj istatistiği
      const storedVehicles = await AsyncStorage.getItem(VEHICLES_KEY);
      if (storedVehicles) {
        const list = JSON.parse(storedVehicles);
        setVehicleCount(list.length);
        const defaultV = list.find((v: any) => v.isDefault);
        setDefaultVehicleName(defaultV ? defaultV.name : 'Seçilmedi');
      } else {
        setVehicleCount(0);
        setDefaultVehicleName('Seçilmedi');
      }

      // Geçmiş istatistiği
      const storedHistory = await AsyncStorage.getItem(HISTORY_KEY);
      if (storedHistory) {
        const hList = JSON.parse(storedHistory);
        setHistoryCount(hList.length);
      } else {
        setHistoryCount(0);
      }
    } catch (error) {
      console.log('Veri yükleme hatası:', error);
    }
  };

  const toggleDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    const newMode = value ? 'dark' : 'light';
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode);
      // Tüm alt gezinme ve diğer kısımlara anlık duyuru yap
      DeviceEventEmitter.emit('themeChanged', newMode);
    } catch (error) {
      console.log('Tema kaydetme hatası:', error);
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Uygulama Verilerini Sıfırla',
      'Kayıtlı tüm araçlarınız ve rota geçmişiniz silinecektir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Tümünü Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([VEHICLES_KEY, HISTORY_KEY]);
              setVehicleCount(0);
              setHistoryCount(0);
              setDefaultVehicleName('Seçilmedi');
              Alert.alert('Başarılı', 'Tüm yerel veriler temizlendi.');
            } catch (error) {
              Alert.alert('Hata', 'Veriler temizlenirken bir sorun oluştu.');
            }
          },
        },
      ]
    );
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
            <Ionicons name="person" size={20} color="#b85d00" />
            <Text style={[styles.headerTitle, isDarkMode && styles.textWhite]}>Profilim & Ayarlar</Text>
          </View>

          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="settings-outline" size={22} color={isDarkMode ? '#F8FAFC' : '#1A1A1A'} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* İÇERİK */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* KULLANICI KARTI */}
        <View style={[styles.profileCard, isDarkMode && styles.cardDark]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>RL</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.userName, isDarkMode && styles.textWhite]}>RotaLab Sürücüsü</Text>
            <Text style={[styles.userEmail, isDarkMode && styles.textGray]}>surucu@rotalab.app</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.proBadge, isDarkMode && styles.proBadgeDark]}>
                <Ionicons name="shield-checkmark" size={12} color="#b85d00" />
                <Text style={styles.proBadgeText}>Ücretsiz Sürüm</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ÖZET İSTATİSTİKLER KARTI */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>GENEL BAKIŞ</Text>
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, isDarkMode && styles.cardDark]}
            activeOpacity={0.7}
            onPress={() => router.replace('/vehicles')}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FFF4E5' }]}>
              <Ionicons name="car-sport" size={20} color="#b85d00" />
            </View>
            <Text style={[styles.statValue, isDarkMode && styles.textWhite]}>{vehicleCount}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.textGray]}>Garajdaki Araç</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, isDarkMode && styles.cardDark]}
            activeOpacity={0.7}
            onPress={() => router.replace('/history')}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="time" size={20} color="#2563EB" />
            </View>
            <Text style={[styles.statValue, isDarkMode && styles.textWhite]}>{historyCount}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.textGray]}>Kayıtlı Rota</Text>
          </TouchableOpacity>
        </View>

        {/* AYARLAR MENÜSÜ */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>UYGULAMA AYARLARI</Text>
        <View style={[styles.menuContainer, isDarkMode && styles.cardDark]}>
          {/* 🌙 KOYU MOD / AÇIK MOD ANAHTARI */}
          <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, isDarkMode && styles.menuIconCircleDark]}>
                <Ionicons
                  name={isDarkMode ? 'moon' : 'sunny'}
                  size={20}
                  color={isDarkMode ? '#F59E0B' : '#b85d00'}
                />
              </View>
              <View>
                <Text style={[styles.menuTitle, isDarkMode && styles.textWhite]}>Ekran Modu</Text>
                <Text style={[styles.menuSubTitle, isDarkMode && styles.textGray]}>
                  {isDarkMode ? 'Koyu Mod Aktif' : 'Açık Mod Aktif'}
                </Text>
              </View>
            </View>

            <View style={styles.switchWrapper}>
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                trackColor={{ false: '#CBD5E1', true: '#b85d00' }}
                thumbColor={isDarkMode ? '#FFFFFF' : '#FFFFFF'}
                ios_backgroundColor="#CBD5E1"
              />
            </View>
          </View>

          <View style={[styles.menuDivider, isDarkMode && styles.menuDividerDark]} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.replace('/vehicles')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, isDarkMode && styles.menuIconCircleDark]}>
                <Ionicons name="car-outline" size={20} color={isDarkMode ? '#94A3B8' : '#4B5563'} />
              </View>
              <View>
                <Text style={[styles.menuTitle, isDarkMode && styles.textWhite]}>Varsayılan Araç</Text>
                <Text style={[styles.menuSubTitle, isDarkMode && styles.textGray]}>{defaultVehicleName}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={[styles.menuDivider, isDarkMode && styles.menuDividerDark]} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Bilgi',
                'Yakıt fiyatları Türkiye ortalamasına göre günlük otomatik güncellenmektedir.'
              )
            }
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, isDarkMode && styles.menuIconCircleDark]}>
                <Ionicons name="pricetag-outline" size={20} color={isDarkMode ? '#94A3B8' : '#4B5563'} />
              </View>
              <View>
                <Text style={[styles.menuTitle, isDarkMode && styles.textWhite]}>
                  Yakıt Fiyat Güncellemesi
                </Text>
                <Text style={[styles.menuSubTitle, isDarkMode && styles.textGray]}>
                  Otomatik Güncel Fiyatlar
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={[styles.menuDivider, isDarkMode && styles.menuDividerDark]} />

          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                'Destek & İletişim',
                'Her türlü görüş ve önerileriniz için destek@rotalab.app adresinden bize ulaşabilirsiniz.'
              )
            }
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconCircle, isDarkMode && styles.menuIconCircleDark]}>
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={isDarkMode ? '#94A3B8' : '#4B5563'}
                />
              </View>
              <View>
                <Text style={[styles.menuTitle, isDarkMode && styles.textWhite]}>Yardım & Destek</Text>
                <Text style={[styles.menuSubTitle, isDarkMode && styles.textGray]}>Bize Ulaşın</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* VERİ TEMİZLEME VE ÇIKIŞ */}
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>VERİ YÖNETİMİ</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleClearAllData} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.dangerButtonText}>Tüm Verileri ve Geçmişi Temizle</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, isDarkMode && styles.textGray]}>
          RotaLab v1.0.0 (Expo SDK 54)
        </Text>
      </ScrollView>

      {/* 🔻 SABİT ALT NAVİGASYON BAR */}
      <BottomNavBar activeTab="profile" />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 85,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
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
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#b85d00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeDark: {
    backgroundColor: '#334155',
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b85d00',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitleDark: {
    color: '#64748B',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchWrapper: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconCircleDark: {
    backgroundColor: '#334155',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  menuSubTitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
  },
  menuDividerDark: {
    backgroundColor: '#334155',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 16,
    height: 48,
    marginBottom: 20,
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 10,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textGray: {
    color: '#94A3B8',
  },
});
import { fetchFromCloud, syncToCloud } from '@/services/cloudSync';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavBar from '../components/BottomNavBar';

const STORAGE_KEY = '@rotamap_vehicles';
const THEME_KEY = '@rotamap_theme';

interface Vehicle {
  id: string;
  name: string;
  plate: string;
  type: 'Binek' | 'Ticari' | 'Elektrikli';
  fuelType: 'Motorin' | 'Benzin' | 'LPG' | 'Elektrik';
  consumption: string;
  isDefault: boolean;
}

const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: '1',
    name: 'Volkswagen Passat 2.0 TDI',
    plate: '34 RTA 54',
    type: 'Binek',
    fuelType: 'Motorin',
    consumption: '6,5',
    isDefault: true,
  },
];

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Form State
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newType, setNewType] = useState<'Binek' | 'Ticari' | 'Elektrikli'>('Binek');
  const [newFuelType, setNewFuelType] = useState<'Motorin' | 'Benzin' | 'LPG' | 'Elektrik'>('Motorin');
  const [newConsumption, setNewConsumption] = useState('6,5');

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
      loadVehicles();
      loadTheme();
    }, [])
  );

  const loadVehicles = async () => {
    try {
      // Önce buluttan (Firebase) okumayı dene
      const cloudVehicles = await fetchFromCloud<Vehicle[]>('vehicles');
      if (cloudVehicles && cloudVehicles.length > 0) {
        setVehicles(cloudVehicles);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cloudVehicles));
        return;
      }

      // Buluttan veri gelmediyse (ilk giriş / çevrimdışı) yereldeki veriyi kullan
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setVehicles(parsed);
        // Bulutta hiç kayıt yoksa, mevcut yerel veriyi ilk kez buluta taşı
        if (cloudVehicles === null) syncToCloud('vehicles', parsed);
      } else {
        setVehicles(INITIAL_VEHICLES);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_VEHICLES));
        if (cloudVehicles === null) syncToCloud('vehicles', INITIAL_VEHICLES);
      }
    } catch (error) {
      console.log('Araçlar yüklenirken hata:', error);
    }
  };

  const saveVehiclesToStorage = async (updatedVehicles: Vehicle[]) => {
    setVehicles(updatedVehicles);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedVehicles));
    } catch (error) {
      console.log('Araçlar kaydedilirken hata:', error);
    }
    syncToCloud('vehicles', updatedVehicles);
  };

  const handleSetDefault = (id: string) => {
    const updated = vehicles.map((v) => ({
      ...v,
      isDefault: v.id === id,
    }));
    saveVehiclesToStorage(updated);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Araç Silinsin mi?', 'Bu aracı garajınızdan kaldırmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          const filtered = vehicles.filter((v) => v.id !== id);
          if (filtered.length > 0 && !filtered.some((v) => v.isDefault)) {
            filtered[0].isDefault = true;
          }
          saveVehiclesToStorage(filtered);
        },
      },
    ]);
  };

  const handleAddVehicle = () => {
    if (!newVehicleName.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen araç marka ve modelini girin.');
      return;
    }

    const isFirstVehicle = vehicles.length === 0;

    const newVehicle: Vehicle = {
      id: Date.now().toString(),
      name: newVehicleName.trim(),
      plate: newPlate.trim() || 'Plaka Belirtilmedi',
      type: newType,
      fuelType: newFuelType,
      consumption: newConsumption.trim() || '6,5',
      isDefault: isFirstVehicle,
    };

    const updated = [...vehicles, newVehicle];
    saveVehiclesToStorage(updated);

    setNewVehicleName('');
    setNewPlate('');
    setNewConsumption('6,5');
    setModalVisible(false);
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'Elektrikli':
        return 'flash-outline';
      case 'Ticari':
        return 'bus-outline';
      default:
        return 'car-sport-outline';
    }
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
            <Ionicons name="car" size={22} color="#b85d00" />
            <Text style={[styles.headerTitle, isDarkMode && styles.textWhite]}>Garajım & Araçlarım</Text>
          </View>

          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* İÇERİK */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textGray]}>KAYITLI ARAÇLARINIZ</Text>
          <Text style={[styles.countBadge, isDarkMode && styles.countBadgeDark]}>{vehicles.length} Araç</Text>
        </View>

        {vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, isDarkMode && styles.emptyIconCircleDark]}>
              <Ionicons name="car-outline" size={42} color={isDarkMode ? '#64748B' : '#9CA3AF'} />
            </View>
            <Text style={[styles.emptyTitle, isDarkMode && styles.textWhite]}>Garajınız Boş</Text>
            <Text style={[styles.emptySubtitle, isDarkMode && styles.textGray]}>
              Araç ekleyerek rota hesaplamalarınızı kendi aracınızın yakıt tüketimine göre otomatik yapabilirsiniz.
            </Text>
            <TouchableOpacity
              style={styles.addVehicleButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addVehicleButtonText}>Yeni Araç Ekle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          vehicles.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                isDarkMode && styles.cardDark,
                item.isDefault && (isDarkMode ? styles.cardDefaultDark : styles.cardDefault),
              ]}
            >
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Ionicons name="star" size={12} color="#FFFFFF" />
                  <Text style={styles.defaultBadgeText}>VARSAYILAN</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={[styles.vehicleIconCircle, isDarkMode && styles.vehicleIconCircleDark]}>
                  <Ionicons name={getVehicleIcon(item.type)} size={24} color="#b85d00" />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.vehicleName, isDarkMode && styles.textWhite]}>{item.name}</Text>
                  <Text style={[styles.plateText, isDarkMode && styles.textGray]}>{item.plate}</Text>
                </View>

                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={18} color={isDarkMode ? '#64748B' : '#9CA3AF'} />
                </TouchableOpacity>
              </View>

              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

              <View style={[styles.cardBody, isDarkMode && styles.cardBodyDark]}>
                <View style={styles.specBox}>
                  <Text style={[styles.specLabel, isDarkMode && styles.textGray]}>Araç Tipi</Text>
                  <Text style={[styles.specValue, isDarkMode && styles.textLightGray]}>{item.type}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={[styles.specLabel, isDarkMode && styles.textGray]}>Yakıt Türü</Text>
                  <Text style={[styles.specValue, isDarkMode && styles.textLightGray]}>{item.fuelType}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={[styles.specLabel, isDarkMode && styles.textGray]}>Ort. Tüketim</Text>
                  <Text style={styles.specValuePrice}>
                    {item.consumption}{' '}
                    <Text style={{ fontSize: 11, color: isDarkMode ? '#94A3B8' : '#64748B' }}>
                      {item.fuelType === 'Elektrik' ? 'kWh' : 'L'}/100km
                    </Text>
                  </Text>
                </View>
              </View>

              {!item.isDefault && (
                <TouchableOpacity
                  style={[styles.makeDefaultButton, isDarkMode && styles.makeDefaultButtonDark]}
                  onPress={() => handleSetDefault(item.id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#b85d00" />
                  <Text style={styles.makeDefaultText}>Varsayılan Araç Yap</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* ➕ YENİ ARAÇ EKLEME MODALI (Koyu Mod Destekli) */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => Keyboard.dismiss()}
          />
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.textWhite]}>Yeni Araç Ekle</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>Araç Marka & Model</Text>
              <TextInput
                style={[styles.modalInput, isDarkMode && styles.modalInputDark]}
                placeholder="Örn: Renault Megane 1.5 dCi"
                placeholderTextColor={isDarkMode ? '#64748B' : '#A0A0A0'}
                value={newVehicleName}
                onChangeText={setNewVehicleName}
              />

              <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>Plaka (Opsiyonel)</Text>
              <TextInput
                style={[styles.modalInput, isDarkMode && styles.modalInputDark]}
                placeholder="Örn: 34 ABC 123"
                placeholderTextColor={isDarkMode ? '#64748B' : '#A0A0A0'}
                value={newPlate}
                onChangeText={setNewPlate}
              />

              <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>Araç Tipi</Text>
              <View style={styles.typeSelectorRow}>
                {(['Binek', 'Ticari', 'Elektrikli'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeChip,
                      isDarkMode && styles.typeChipDark,
                      newType === t && styles.typeChipActive,
                    ]}
                    onPress={() => setNewType(t)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        isDarkMode && styles.textLightGray,
                        newType === t && styles.typeChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>Yakıt Türü</Text>
              <View style={styles.typeSelectorRow}>
                {(['Motorin', 'Benzin', 'LPG', 'Elektrik'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.typeChip,
                      isDarkMode && styles.typeChipDark,
                      newFuelType === f && styles.typeChipActive,
                    ]}
                    onPress={() => setNewFuelType(f)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        isDarkMode && styles.textLightGray,
                        newFuelType === f && styles.typeChipTextActive,
                      ]}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>Ortalama Tüketim (L/100km veya kWh)</Text>
              <TextInput
                style={[styles.modalInput, isDarkMode && styles.modalInputDark]}
                placeholder="6,5"
                placeholderTextColor={isDarkMode ? '#64748B' : '#A0A0A0'}
                keyboardType="numeric"
                value={newConsumption}
                onChangeText={setNewConsumption}
              />

              <TouchableOpacity style={styles.saveModalButton} onPress={handleAddVehicle}>
                <Text style={styles.saveModalButtonText}>Garaja Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🔻 SABİT ALT NAVİGASYON BAR */}
      <BottomNavBar activeTab="vehicles" />
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
  addButton: {
    backgroundColor: '#b85d00',
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    position: 'relative',
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
  cardDefault: {
    borderColor: '#b85d00',
    backgroundColor: '#FFFCF7',
  },
  cardDefaultDark: {
    borderColor: '#b85d00',
    backgroundColor: '#1E293B',
  },
  defaultBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#b85d00',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconCircleDark: {
    backgroundColor: '#334155',
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  plateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  deleteButton: {
    padding: 6,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 14,
  },
  cardBodyDark: {
    backgroundColor: '#0F172A',
  },
  specBox: {
    flex: 1,
  },
  specLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  specValuePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#b85d00',
    marginTop: 2,
  },
  makeDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE4D6',
  },
  makeDefaultButtonDark: {
    backgroundColor: '#334155',
    borderColor: '#b85d00',
  },
  makeDefaultText: {
    fontSize: 12,
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
  addVehicleButton: {
    backgroundColor: '#b85d00',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addVehicleButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
  },
  modalContentDark: {
    backgroundColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalInputDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    color: '#F8FAFC',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
  },
  typeChipDark: {
    backgroundColor: '#0F172A',
  },
  typeChipActive: {
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: '#b85d00',
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  typeChipTextActive: {
    color: '#b85d00',
    fontWeight: '800',
  },
  saveModalButton: {
    backgroundColor: '#b85d00',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  saveModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
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
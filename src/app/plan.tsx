import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  Dimensions,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import BottomNavBar from '../components/BottomNavBar';

const { width, height } = Dimensions.get('window');

const STORAGE_KEY = '@rotamap_vehicles';
const THEME_KEY = '@rotamap_theme';
const INPUT_ACCESSORY_ID = 'numericInputDoneBar';
const NAV_BAR_HEIGHT = Platform.OS === 'ios' ? 82 : 65;
const SHEET_MAX_HEIGHT = height * 0.62;
const SHEET_MIN_HEIGHT = 80;
const SNAP_THRESHOLD = 40;

const TURKEY_VIEW_BOUNDS = [
  { latitude: 44.8, longitude: 25.0 },
  { latitude: 35.2, longitude: 38.5 },
];

const geocodeAddress = async (query: string): Promise<{ latitude: number; longitude: number } | null> => {
  if (!query || query.trim().length === 0) return null;
  try {
    const searchQuery = `${query.trim()}, Türkiye`;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&countrycodes=tr&limit=1`,
      { headers: { 'User-Agent': 'RotaMapApp/1.0' } }
    );
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
  } catch (error) {
    console.log('Geocoding Hatası:', error);
  }
  return null;
};

export default function RoutePlanScreen() {
  const mapRef = useRef<MapView>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');

  const [originCoords, setOriginCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [vehicleType, setVehicleType] = useState<'binek' | 'ticari' | 'elektrikli'>('binek');
  const [fuelType, setFuelType] = useState('Motorin');
  const [consumption, setConsumption] = useState('6,5');
  const [fuelPrice, setFuelPrice] = useState('42,50');

  const [defaultVehicleName, setDefaultVehicleName] = useState('');
  const [defaultVehiclePlate, setDefaultVehiclePlate] = useState('');

  const [fuelModalVisible, setFuelModalVisible] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [mapReady, setMapReady] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const isExpandedRef = useRef(true);

  const translateY = useRef(new Animated.Value(0)).current;

  // 🌙 Tema Dinleyici
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
      console.log('Tema hatası:', e);
    }
  };

  // 🚗 Garajdan Varsayılan Aracı Yükle
  useFocusEffect(
    useCallback(() => {
      loadDefaultVehicle();
      loadTheme();
    }, [])
  );

  const loadDefaultVehicle = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const vehiclesList = JSON.parse(stored);
        const defaultVehicle = vehiclesList.find((v: any) => v.isDefault);
        if (defaultVehicle) {
          const mappedType = defaultVehicle.type.toLowerCase() as 'binek' | 'ticari' | 'elektrikli';
          setVehicleType(mappedType);
          setFuelType(defaultVehicle.fuelType);
          setConsumption(defaultVehicle.consumption);
          setDefaultVehicleName(defaultVehicle.name);
          setDefaultVehiclePlate(defaultVehicle.plate !== 'Plaka Belirtilmedi' ? defaultVehicle.plate : '');
        } else {
          setDefaultVehicleName('');
          setDefaultVehiclePlate('');
        }
      } else {
        setDefaultVehicleName('');
        setDefaultVehiclePlate('');
      }
    } catch (error) {
      console.log('Varsayılan araç bilgisi okunamadı:', error);
    }
  };

  const fitMapToPoints = (expanded = isExpandedRef.current) => {
    if (!mapRef.current) return;

    const points = [];
    if (originCoords) points.push(originCoords);
    if (destCoords) points.push(destCoords);

    const bottomPadding = expanded ? SHEET_MAX_HEIGHT + NAV_BAR_HEIGHT : SHEET_MIN_HEIGHT + NAV_BAR_HEIGHT + 20;

    if (points.length === 0) {
      mapRef.current.fitToCoordinates(TURKEY_VIEW_BOUNDS, {
        edgePadding: {
          top: Platform.OS === 'android' ? 100 : 110,
          right: 20,
          bottom: bottomPadding,
          left: 20,
        },
        animated: true,
      });
    } else if (points.length === 1) {
      mapRef.current.animateToRegion(
        {
          latitude: points[0].latitude - 0.02,
          longitude: points[0].longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.15,
        },
        500
      );
    } else if (points.length === 2) {
      mapRef.current.fitToCoordinates(points, {
        edgePadding: {
          top: Platform.OS === 'android' ? 100 : 120,
          right: 60,
          bottom: bottomPadding,
          left: 60,
        },
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (mapReady) {
      fitMapToPoints();
    }
  }, [originCoords, destCoords, mapReady]);

  const animateToState = (expand: boolean) => {
    isExpandedRef.current = expand;
    Animated.spring(translateY, {
      toValue: expand ? 0 : SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT,
      useNativeDriver: true,
      bounciness: 2,
      speed: 14,
    }).start();

    fitMapToPoints(expand);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        let newY = gestureState.dy;
        if (!isExpandedRef.current) {
          newY += SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT;
        }

        if (newY < 0) newY = 0;
        if (newY > SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT) {
          newY = SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT;
        }

        translateY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SNAP_THRESHOLD) {
          animateToState(false);
        } else if (gestureState.dy < -SNAP_THRESHOLD) {
          animateToState(true);
        } else {
          animateToState(isExpandedRef.current);
        }
      },
    })
  ).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Reddedildi', 'GPS izni vermeniz gerekmektedir.');
        setGettingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setOriginCoords(coords);
      setOrigin('Mevcut Konumunuz');
    } catch (error) {
      Alert.alert('Hata', 'Konum alınamadı.');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSwap = () => {
    const tempOriginText = origin;
    const tempOriginCoords = originCoords;

    setOrigin(destination);
    setOriginCoords(destCoords);

    setDestination(tempOriginText);
    setDestCoords(tempOriginCoords);
  };

  const handleReset = () => {
    setOrigin('');
    setDestination('');
    setOriginCoords(null);
    setDestCoords(null);
    loadDefaultVehicle();
    setFuelPrice('42,50');
    Keyboard.dismiss();

    if (mapRef.current) {
      mapRef.current.fitToCoordinates(TURKEY_VIEW_BOUNDS, {
        edgePadding: {
          top: Platform.OS === 'android' ? 100 : 110,
          right: 20,
          bottom: SHEET_MAX_HEIGHT + NAV_BAR_HEIGHT,
          left: 20,
        },
        animated: true,
      });
    }
  };

  const handleOriginBlur = async () => {
    if (origin.trim() && !originCoords) {
      const coords = await geocodeAddress(origin);
      if (coords) setOriginCoords(coords);
    }
  };

  const handleDestBlur = async () => {
    if (destination.trim() && !destCoords) {
      const coords = await geocodeAddress(destination);
      if (coords) setDestCoords(coords);
    }
  };

  const handleNumericFocus = () => {
    animateToState(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCalculate = async () => {
    if (!origin.trim() || !destination.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen hem kalkış hem de varış noktasını girin.');
      return;
    }

    Keyboard.dismiss();
    setCalculating(true);

    try {
      let finalOriginCoords = originCoords;
      if (!finalOriginCoords) {
        finalOriginCoords = await geocodeAddress(origin);
      }

      let finalDestCoords = destCoords;
      if (!finalDestCoords) {
        finalDestCoords = await geocodeAddress(destination);
      }

      if (!finalOriginCoords || !finalDestCoords) {
        Alert.alert('Konum Bulunamadı', 'Girdiğiniz konumlardan biri haritada bulunamadı.');
        setCalculating(false);
        return;
      }

      setOriginCoords(finalOriginCoords);
      setDestCoords(finalDestCoords);
      setCalculating(false);

      router.push({
        pathname: '/alternatives',
        params: {
          origin,
          destination,
          originLat: finalOriginCoords.latitude.toString(),
          originLon: finalOriginCoords.longitude.toString(),
          destLat: finalDestCoords.latitude.toString(),
          destLon: finalDestCoords.longitude.toString(),
          vehicleType,
          fuelType,
          consumption,
          fuelPrice,
          vehicleName: defaultVehicleName,
          plate: defaultVehiclePlate,
        },
      });
    } catch (error) {
      console.log('Hesaplama Hatası:', error);
      Alert.alert('Hata', 'Konum koordinatları hesaplanırken bir sorun oluştu.');
      setCalculating(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDarkMode && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* 🗺️ HARİTA */}
      <View style={styles.mapContainer}>
        {mapReady ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            onMapReady={() => fitMapToPoints()}
            showsUserLocation={true}
          >
            {originCoords && <Marker coordinate={originCoords} title="Kalkış" pinColor="#2563EB" />}
            {destCoords && <Marker coordinate={destCoords} title="Varış" pinColor="#b85d00" />}
          </MapView>
        ) : (
          <View style={[styles.map, styles.mapLoading]}>
            <ActivityIndicator size="large" color="#b85d00" />
          </View>
        )}
      </View>

      {/* ÜST LOGO BAR */}
      <SafeAreaView style={styles.topSafeArea} pointerEvents="box-none">
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
          <View style={{ width: 32 }} />
        </View>
      </SafeAreaView>

      {/* 📱 ALT KAYDIRILABİLİR PANEL */}
      <Animated.View
        style={[
          styles.sheetContainer,
          isDarkMode && styles.sheetContainerDark,
          { transform: [{ translateY }] },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragHeader}>
          <View style={[styles.sheetHandle, isDarkMode && styles.sheetHandleDark]} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* 📍 ROTA BİLGİLERİ */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeader, isDarkMode && styles.textGray]}>ROTA BİLGİLERİ</Text>

            <TouchableOpacity onPress={handleReset} style={[styles.resetButton, isDarkMode && styles.resetButtonDark]} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={14} color="#b85d00" />
              <Text style={styles.resetButtonText}>Sıfırla</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroupContainer}>
            <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>Kalkış Noktası</Text>
            <View style={[styles.inputBox, isDarkMode && styles.inputBoxDark]}>
              <Ionicons name="location-sharp" size={18} color="#2563EB" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.inputText, isDarkMode && styles.textWhite]}
                value={origin}
                onChangeText={(text) => {
                  setOrigin(text);
                  setOriginCoords(null);
                }}
                onBlur={handleOriginBlur}
                onFocus={() => animateToState(true)}
                placeholder="Kalkış noktası (Örn: İstanbul)"
                placeholderTextColor={isDarkMode ? '#64748B' : '#A0A0A0'}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <TouchableOpacity onPress={getCurrentLocation} style={styles.gpsButton}>
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#b85d00" />
                ) : (
                  <Ionicons name="locate-outline" size={18} color="#b85d00" />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray, { marginTop: 10 }]}>Varış Noktası</Text>
            <View style={[styles.inputBox, isDarkMode && styles.inputBoxDark]}>
              <Ionicons name="location-sharp" size={18} color="#b85d00" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.inputText, isDarkMode && styles.textWhite]}
                value={destination}
                onChangeText={(text) => {
                  setDestination(text);
                  setDestCoords(null);
                }}
                onBlur={handleDestBlur}
                onFocus={() => animateToState(true)}
                placeholder="Varış noktası (Örn: Eskişehir)"
                placeholderTextColor={isDarkMode ? '#64748B' : '#A0A0A0'}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <TouchableOpacity onPress={handleSwap} style={[styles.swapButton, isDarkMode && styles.swapButtonDark]} activeOpacity={0.7}>
                <Ionicons name="swap-vertical" size={20} color="#b85d00" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 🚘 ARAÇ BİLGİLERİ */}
          <View style={[styles.sectionHeaderRow, { marginTop: 10 }]}>
            <Text style={[styles.sectionHeader, isDarkMode && styles.textGray]}>ARAÇ BİLGİLERİ</Text>
            {defaultVehicleName ? (
              <View style={[styles.vehicleBadge, isDarkMode && styles.vehicleBadgeDark]}>
                <Ionicons name="car" size={12} color="#b85d00" />
                <Text style={styles.vehicleBadgeText}>
                  {defaultVehicleName} {defaultVehiclePlate ? `(${defaultVehiclePlate})` : ''}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.segmentedContainer, isDarkMode && styles.segmentedContainerDark]}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                vehicleType === 'binek' && (isDarkMode ? styles.segmentTabActiveDark : styles.segmentTabActive),
              ]}
              onPress={() => setVehicleType('binek')}
            >
              <Text style={[styles.segmentText, vehicleType === 'binek' && styles.segmentTextActive]}>
                Binek
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                vehicleType === 'ticari' && (isDarkMode ? styles.segmentTabActiveDark : styles.segmentTabActive),
              ]}
              onPress={() => setVehicleType('ticari')}
            >
              <Text style={[styles.segmentText, vehicleType === 'ticari' && styles.segmentTextActive]}>
                Ticari
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                vehicleType === 'elektrikli' && (isDarkMode ? styles.segmentTabActiveDark : styles.segmentTabActive),
              ]}
              onPress={() => setVehicleType('elektrikli')}
            >
              <Text style={[styles.segmentText, vehicleType === 'elektrikli' && styles.segmentTextActive]}>
                Elektrikli
              </Text>
            </TouchableOpacity>
          </View>

          {/* Yakıt Türü */}
          <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>Yakıt Türü</Text>
          <TouchableOpacity
            style={[styles.fuelSelectBox, isDarkMode && styles.fuelSelectBoxDark]}
            onPress={() => setFuelModalVisible(true)}
          >
            <Text style={[styles.fuelSelectText, isDarkMode && styles.fuelSelectTextDark]}>{fuelType}</Text>
            <Ionicons name="chevron-down" size={20} color={isDarkMode ? '#94A3B8' : '#4B5563'} />
          </TouchableOpacity>

          {/* Tüketim & Fiyat */}
          <View style={styles.rowInputs}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>
                Ort. Tüketim ({fuelType === 'Elektrik' ? 'kWh' : 'L'}/100km)
              </Text>
              <View style={[styles.inputBoxSmall, isDarkMode && styles.inputBoxDark]}>
                <TextInput
                  style={[styles.inputText, isDarkMode && styles.textWhite]}
                  value={consumption}
                  onChangeText={setConsumption}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  onFocus={handleNumericFocus}
                  inputAccessoryViewID={INPUT_ACCESSORY_ID}
                />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, isDarkMode && styles.textLightGray]}>
                {fuelType === 'Elektrik' ? 'Birim Fiyat (₺/kWh)' : 'Yakıt Fiyatı (₺/L)'}
              </Text>
              <View style={[styles.inputBoxSmall, isDarkMode && styles.inputBoxDark]}>
                <TextInput
                  style={[styles.inputText, isDarkMode && styles.textWhite]}
                  value={fuelPrice}
                  onChangeText={setFuelPrice}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  onFocus={handleNumericFocus}
                  inputAccessoryViewID={INPUT_ACCESSORY_ID}
                />
              </View>
            </View>
          </View>

          {/* HESAPLA BUTONU */}
          <TouchableOpacity
            style={styles.submitButton}
            activeOpacity={0.8}
            onPress={handleCalculate}
            disabled={calculating}
          >
            {calculating ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Maliyet & Rota Hesapla</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* 📱 iOS NUMERİK KLAVYE İÇİN "TAMAM" BAR ÇUBUĞU */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
          <View style={[styles.accessoryBar, isDarkMode && styles.accessoryBarDark]}>
            <TouchableOpacity onPress={Keyboard.dismiss} style={styles.accessoryDoneButton}>
              <Text style={styles.accessoryDoneText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}

      {/* ⛽ Yakıt Türü Modalı */}
      <Modal visible={fuelModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFuelModalVisible(false)}
        >
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.textWhite]}>Yakıt Türü Seçin</Text>
            {['Motorin', 'Benzin', 'LPG', 'Elektrik'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.modalOption, isDarkMode && styles.modalOptionDark]}
                onPress={() => {
                  setFuelType(item);
                  setFuelModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    isDarkMode && styles.textLightGray,
                    fuelType === item && { color: '#b85d00', fontWeight: '800' },
                  ]}
                >
                  {item}
                </Text>
                {fuelType === item && <Ionicons name="checkmark" size={22} color="#b85d00" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 🔻 SABİT ALT NAVİGASYON BAR */}
      <BottomNavBar activeTab="home" />
    </KeyboardAvoidingView>
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
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    width: width,
    height: height,
  },
  map: {
    width: width,
    height: height,
    ...StyleSheet.absoluteFillObject,
  },
  mapLoading: {
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight || 10 : 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  headerDark: {
    backgroundColor: '#1E293B',
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
  sheetContainer: {
    position: 'absolute',
    bottom: NAV_BAR_HEIGHT,
    left: 0,
    right: 0,
    height: SHEET_MAX_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  sheetContainerDark: {
    backgroundColor: '#1E293B',
  },
  dragHeader: {
    paddingTop: 14,
    paddingBottom: 8,
    alignItems: 'center',
    width: '100%',
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: '#D8C4B6',
    borderRadius: 4,
  },
  sheetHandleDark: {
    backgroundColor: '#475569',
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vehicleBadgeDark: {
    backgroundColor: '#334155',
  },
  vehicleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b85d00',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resetButtonDark: {
    backgroundColor: '#334155',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b85d00',
  },
  inputGroupContainer: {
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 6,
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  inputBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  inputBoxSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  gpsButton: {
    padding: 6,
  },
  swapButton: {
    padding: 6,
    backgroundColor: '#FFF4E5',
    borderRadius: 8,
  },
  swapButtonDark: {
    backgroundColor: '#334155',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  segmentedContainerDark: {
    backgroundColor: '#0F172A',
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentTabActiveDark: {
    backgroundColor: '#334155',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#b85d00',
    fontWeight: '800',
  },
  fuelSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  fuelSelectBoxDark: {
    backgroundColor: '#0F172A',
  },
  fuelSelectText: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '700',
  },
  fuelSelectTextDark: {
    color: '#60A5FA',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  submitButton: {
    backgroundColor: '#b85d00',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#b85d00',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  accessoryBar: {
    height: 44,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  accessoryBarDark: {
    backgroundColor: '#1E293B',
    borderTopColor: '#334155',
  },
  accessoryDoneButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  accessoryDoneText: {
    color: '#b85d00',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalContentDark: {
    backgroundColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionDark: {
    borderBottomColor: '#334155',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
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
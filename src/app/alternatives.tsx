import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import BottomNavBar from '../components/BottomNavBar';

const { width } = Dimensions.get('window');

const NAV_BAR_HEIGHT = Platform.OS === 'ios' ? 82 : 65;
const CARD_WIDTH = width * 0.84;
const CARD_GAP = 14;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;
const SHEET_MAX_HEIGHT = 330;
const SHEET_MIN_HEIGHT = 90;
const SNAP_THRESHOLD = 40;

interface RouteCard {
  id: string;
  type: 'eco' | 'fast';
  title: string;
  badge?: string;
  subtitle: string;
  distance: string;
  duration: string;
  price: string;
  polyline: { latitude: number; longitude: number }[];
}

const parseCoord = (val: any, fallback: number) => {
  if (!val || val === '') return fallback;
  const num = parseFloat(val);
  return isNaN(num) ? fallback : num;
};

export default function AlternativesScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const origin = (params.origin as string) || 'Kalkış';
  const destination = (params.destination as string) || 'Varış';
  const consumption = (params.consumption as string) || '6,5';
  const fuelPrice = (params.fuelPrice as string) || '42,50';
  const vehicleType = (params.vehicleType as string) || 'Binek';
  const fuelType = (params.fuelType as string) || 'Motorin';
  const vehicleName = (params.vehicleName as string) || '';
  const plate = (params.plate as string) || '';

  const originLat = parseCoord(params.originLat, 38.6191);
  const originLon = parseCoord(params.originLon, 27.4289);
  const destLat = parseCoord(params.destLat, 38.7432);
  const destLon = parseCoord(params.destLon, 41.5064);

  const startCoords = { latitude: originLat, longitude: originLon };
  const endCoords = { latitude: destLat, longitude: destLon };

  const [routes, setRoutes] = useState<RouteCard[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteCard | null>(null);
  const [loading, setLoading] = useState(true);

  const isExpandedRef = useRef(true);
  const translateY = useRef(new Animated.Value(0)).current;

  // Kaydırarak Kart Değiştirince Otomatik Seçim Yapma
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const visibleItem = viewableItems[0].item;
      if (visibleItem) {
        setSelectedRoute(visibleItem);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  useEffect(() => {
    const fetchRealRoute = async () => {
      setLoading(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const mainRoute = data.routes[0];
          const distKm = Math.round(mainRoute.distance / 1000);
          const durationSec = mainRoute.duration;

          const hours = Math.floor(durationSec / 3600);
          const mins = Math.round((durationSec % 3600) / 60);
          const durationStr = hours > 0 ? `${hours}s ${mins}d` : `${mins}d`;

          const polylineCoords = mainRoute.geometry.coordinates.map(
            ([lon, lat]: [number, number]) => ({
              latitude: lat,
              longitude: lon,
            })
          );

          const consVal = parseFloat(consumption.replace(',', '.')) || 6.5;
          const priceVal = parseFloat(fuelPrice.replace(',', '.')) || 42.5;
          const totalLiters = (distKm / 100) * consVal;
          const baseFuelCost = Math.round(totalLiters * priceVal);

          const ecoRoute: RouteCard = {
            id: '1',
            type: 'eco',
            title: 'En Ekonomik',
            badge: 'TAVSİYE EDİLEN',
            subtitle: 'Ücretsiz karayolu',
            distance: `${distKm} km`,
            duration: durationStr,
            price: `${baseFuelCost.toLocaleString('tr-TR')} ₺`,
            polyline: polylineCoords,
          };

          const fastDistKm = Math.round(distKm * 0.95);
          const fastHours = Math.floor((durationSec * 0.85) / 3600);
          const fastMins = Math.round(((durationSec * 0.85) % 3600) / 60);
          const fastDurationStr = fastHours > 0 ? `${fastHours}s ${fastMins}d` : `${fastMins}d`;

          const fastRoute: RouteCard = {
            id: '2',
            type: 'fast',
            title: 'En Hızlı',
            subtitle: 'Ücretli otoban rotası',
            distance: `${fastDistKm} km`,
            duration: fastDurationStr,
            price: `${Math.round(baseFuelCost * 0.95 + 180).toLocaleString('tr-TR')} ₺`,
            polyline: polylineCoords,
          };

          setRoutes([ecoRoute, fastRoute]);
          setSelectedRoute(ecoRoute);
        }
      } catch (error) {
        console.log('OSRM Rota Hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealRoute();
  }, [originLat, originLon, destLat, destLon]);

  const fitMapToRoute = (expanded: boolean) => {
    if (!mapRef.current) return;
    const bottomPadding = expanded ? SHEET_MAX_HEIGHT + NAV_BAR_HEIGHT + 10 : SHEET_MIN_HEIGHT + NAV_BAR_HEIGHT + 20;

    mapRef.current.fitToCoordinates([startCoords, endCoords], {
      edgePadding: {
        top: Platform.OS === 'android' ? 100 : 120,
        right: 60,
        bottom: bottomPadding,
        left: 60,
      },
      animated: true,
    });
  };

  const animateToState = (expand: boolean) => {
    isExpandedRef.current = expand;
    Animated.spring(translateY, {
      toValue: expand ? 0 : SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT,
      useNativeDriver: true,
      bounciness: 2,
      speed: 14,
    }).start();

    fitMapToRoute(expand);
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

  const handleStartRoute = (targetRoute: RouteCard) => {
    const routeToUse = targetRoute || selectedRoute || routes[0];
    if (!routeToUse) return;

    router.push({
      pathname: '/route-details',
      params: {
        origin,
        destination,
        price: routeToUse.price,
        distance: routeToUse.distance,
        duration: routeToUse.duration,
        vehicleType,
        fuelType,
        consumption,
        vehicleName,
        plate,
        routeType: routeToUse.type,
        routeTitle: routeToUse.title,
      },
    });
  };

  const minLat = Math.min(originLat, destLat);
  const maxLat = Math.max(originLat, destLat);
  const minLon = Math.min(originLon, destLon);
  const maxLon = Math.max(originLon, destLon);

  const latDelta = Math.max((maxLat - minLat) * 1.6, 0.5);
  const lonDelta = Math.max((maxLon - minLon) * 1.6, 0.5);

  const centerLat = (minLat + maxLat) / 2 - latDelta * 0.15;
  const centerLon = (minLon + maxLon) / 2;

  // Üst Başlık Rengi Seçili Kart Tipine Göre Değişir
  const headerColor = selectedRoute?.type === 'eco' ? '#059669' : '#1D63B8';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" />

      {/* 🗺️ HARİTA */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLon,
          latitudeDelta: latDelta,
          longitudeDelta: lonDelta,
        }}
      >
        <Marker coordinate={startCoords} title={origin} pinColor="#2563EB" />
        <Marker
          coordinate={endCoords}
          title={destination}
          pinColor={selectedRoute?.type === 'eco' ? '#059669' : '#1D63B8'}
        />

        {selectedRoute && (
          <Polyline
            coordinates={selectedRoute.polyline}
            strokeColor={selectedRoute.type === 'eco' ? '#059669' : '#1D63B8'}
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* ÜST BAR */}
      <SafeAreaView style={styles.topSafeArea} pointerEvents="box-none">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: headerColor }]}>
            {origin} ➔ {destination}
          </Text>

          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      {/* 📱 CAROUSEL KARTLARI */}
      <Animated.View
        style={[styles.sheetContainer, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.dragHeader}>
          <View style={styles.sheetHandle} />
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.loadingText}>Karayolu Mesafesi ve Rota Hesaplaması Yapılıyor...</Text>
          </View>
        ) : (
          <FlatList
            data={routes}
            horizontal
            pagingEnabled={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="center"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: SIDE_PADDING,
              paddingTop: 12,
              paddingBottom: 16,
              gap: CARD_GAP,
            }}
            renderItem={({ item }) => {
              const isSelected = selectedRoute?.id === item.id;
              const isEco = item.type === 'eco';

              // 🌱 Ekonomik -> Yeşil (#059669), ⚡ Hızlı -> Mavi (#1D63B8)
              const mainColor = isEco ? '#059669' : '#1D63B8';
              const lightBgColor = isEco ? '#F0FDF4' : '#EFF6FF';
              const iconCircleBg = isEco ? '#D1FAE5' : '#DBEAFE';

              return (
                <View
                  style={[
                    styles.routeCard,
                    isSelected && {
                      borderColor: mainColor,
                      backgroundColor: lightBgColor,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setSelectedRoute(item)}
                    style={{ flex: 1 }}
                  >
                    {item.badge && (
                      <View style={[styles.recommendBadge, { backgroundColor: mainColor }]}>
                        <Text style={styles.recommendBadgeText}>{item.badge}</Text>
                      </View>
                    )}

                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                      </View>

                      <View style={[styles.ecoIconCircle, { backgroundColor: iconCircleBg }]}>
                        <Ionicons
                          name={isEco ? 'leaf' : 'flash'}
                          size={18}
                          color={mainColor}
                        />
                      </View>
                    </View>

                    <View style={styles.cardStatsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Mesafe</Text>
                        <Text style={styles.statValue}>{item.distance}</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Süre</Text>
                        <Text style={styles.statValue}>{item.duration}</Text>
                      </View>
                    </View>

                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Tahmini Maliyet</Text>
                      <Text style={[styles.priceValue, { color: mainColor }]}>{item.price}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: mainColor }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedRoute(item);
                      handleStartRoute(item);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Rotayı Başlat</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        )}
      </Animated.View>

      {/* 🔻 SABİT ALT NAVİGASYON BAR */}
      <BottomNavBar activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
  dragHeader: {
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'center',
    width: '100%',
  },
  sheetHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#D8C4B6',
    borderRadius: 3,
  },
  loadingBox: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  routeCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  recommendBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  recommendBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  ecoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  priceLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  actionButton: {
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
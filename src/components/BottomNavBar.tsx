import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const THEME_KEY = '@rotamap_theme';

interface BottomNavBarProps {
  activeTab?: 'home' | 'history' | 'vehicles' | 'profile';
}

export default function BottomNavBar({ activeTab = 'home' }: BottomNavBarProps) {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // İlk yüklemede temayı al
    loadTheme();

    // Profil ekranındaki şalter değiştiğinde anında dinle ve güncelle
    const subscription = DeviceEventEmitter.addListener('themeChanged', (mode: string) => {
      setIsDarkMode(mode === 'dark');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_KEY);
      setIsDarkMode(savedTheme === 'dark');
    } catch (error) {
      console.log('Tema okuma hatası:', error);
    }
  };

  const handleTabPress = (tab: 'home' | 'history' | 'vehicles' | 'profile') => {
    if (tab === 'home' && pathname !== '/plan' && pathname !== '/') {
      router.replace('/plan');
    } else if (tab === 'history' && pathname !== '/history') {
      router.replace('/history');
    } else if (tab === 'vehicles' && pathname !== '/vehicles') {
      router.replace('/vehicles');
    } else if (tab === 'profile' && pathname !== '/profile') {
      router.replace('/profile');
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.6}
        onPress={() => handleTabPress('home')}
      >
        <Ionicons
          name={activeTab === 'home' ? 'compass' : 'compass-outline'}
          size={24}
          color={activeTab === 'home' ? '#b85d00' : isDarkMode ? '#64748B' : '#9CA3AF'}
        />
        <Text
          style={[
            styles.tabLabel,
            isDarkMode && styles.tabLabelDark,
            activeTab === 'home' && styles.tabLabelActive,
          ]}
        >
          Ana Sayfa
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.6}
        onPress={() => handleTabPress('history')}
      >
        <Ionicons
          name={activeTab === 'history' ? 'map' : 'map-outline'}
          size={22}
          color={activeTab === 'history' ? '#b85d00' : isDarkMode ? '#64748B' : '#9CA3AF'}
        />
        <Text
          style={[
            styles.tabLabel,
            isDarkMode && styles.tabLabelDark,
            activeTab === 'history' && styles.tabLabelActive,
          ]}
        >
          Geçmiş
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.6}
        onPress={() => handleTabPress('vehicles')}
      >
        <Ionicons
          name={activeTab === 'vehicles' ? 'car' : 'car-outline'}
          size={24}
          color={activeTab === 'vehicles' ? '#b85d00' : isDarkMode ? '#64748B' : '#9CA3AF'}
        />
        <Text
          style={[
            styles.tabLabel,
            isDarkMode && styles.tabLabelDark,
            activeTab === 'vehicles' && styles.tabLabelActive,
          ]}
        >
          Araçlarım
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        activeOpacity={0.6}
        onPress={() => handleTabPress('profile')}
      >
        <Ionicons
          name={activeTab === 'profile' ? 'person' : 'person-outline'}
          size={22}
          color={activeTab === 'profile' ? '#b85d00' : isDarkMode ? '#64748B' : '#9CA3AF'}
        />
        <Text
          style={[
            styles.tabLabel,
            isDarkMode && styles.tabLabelDark,
            activeTab === 'profile' && styles.tabLabelActive,
          ]}
        >
          Profil
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 82 : 65,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    zIndex: 99999,
    elevation: 25,
  },
  containerDark: {
    backgroundColor: '#1E293B',
    borderTopColor: '#334155',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 3,
  },
  tabLabelDark: {
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#b85d00',
    fontWeight: '800',
  },
});
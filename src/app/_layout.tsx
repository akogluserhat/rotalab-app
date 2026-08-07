import { auth } from '@/config/firebase';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Firebase'in oturum durumunu (giriş yapılmış mı?) dinliyoruz
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Oturum durumuna göre doğru sayfaya yönlendiriyoruz
  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Giriş yapmamış ve giriş ekranında değilse -> giriş ekranına gönder
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Giriş yapmış ama hâlâ giriş/kayıt ekranındaysa -> ana sayfaya gönder
      router.replace('/');
    }
  }, [user, initializing, segments, router]);

  // İlk açılışta oturum kontrol edilirken kısa bir yükleme ekranı göster
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b85d00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade', // Ekran geçişlerini yumuşak fade yapar
          animationDuration: 200,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
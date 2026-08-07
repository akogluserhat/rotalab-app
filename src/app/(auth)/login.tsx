import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { auth } from '@/config/firebase';
import { Theme } from '@/constants/Theme';
import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı.';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.';
    case 'auth/network-request-failed':
      return 'İnternet bağlantınızı kontrol edin.';
    default:
      return 'Giriş yapılamadı. Lütfen tekrar deneyin.';
  }
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Eksik Bilgi', 'Lütfen e-posta ve şifrenizi girin.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Yönlendirme, kök layout'taki oturum dinleyicisi tarafından otomatik yapılacak.
    } catch (error: any) {
      Alert.alert('Giriş Başarısız', getAuthErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Logo />
          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Hesabınıza giriş yaparak devam edin.</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="E-posta Adresi"
            placeholder="ornek@eposta.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
          
          <Input
            label="Şifre"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          <View style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
          </View>

          <Button 
            title="Giriş Yap" 
            onPress={handleLogin} 
            isLoading={loading}
            style={styles.loginButton} 
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hesabın yok mu? </Text>
          <Link href="/(auth)/register" asChild>
            <Text style={styles.footerLink}>Kayıt Ol</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: Theme.fonts.bold,
    fontSize: 28,
    color: Theme.colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Theme.fonts.regular,
    fontSize: 16,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontFamily: Theme.fonts.medium,
    fontSize: 14,
    color: Theme.colors.primary,
  },
  loginButton: {
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 24,
  },
  footerText: {
    fontFamily: Theme.fonts.regular,
    fontSize: 15,
    color: Theme.colors.textSecondary,
  },
  footerLink: {
    fontFamily: Theme.fonts.bold,
    fontSize: 15,
    color: Theme.colors.primary,
  },
});
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { auth } from '@/config/firebase';
import { Theme } from '@/constants/Theme';
import { Link } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.';
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalıdır.';
    case 'auth/network-request-failed':
      return 'İnternet bağlantınızı kontrol edin.';
    default:
      return 'Kayıt oluşturulamadı. Lütfen tekrar deneyin.';
  }
}

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Zayıf Şifre', 'Şifreniz en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Şifreler Uyuşmuyor', 'Girdiğiniz şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(userCredential.user, { displayName: fullName.trim() });
      // Yönlendirme, kök layout'taki oturum dinleyicisi tarafından otomatik yapılacak.
    } catch (error: any) {
      Alert.alert('Kayıt Başarısız', getAuthErrorMessage(error?.code));
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
          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>Aramıza katılmak için bilgilerinizi girin.</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Ad Soyad"
            placeholder="Adınız Soyadınız"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />
          
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
          
          <Input
            label="Şifre Tekrar"
            placeholder="••••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />

          <Button 
            title="Kayıt Ol" 
            onPress={handleRegister} 
            isLoading={loading}
            style={styles.registerButton} 
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Zaten hesabın var mı? </Text>
          <Link href="/(auth)/login" asChild>
            <Text style={styles.footerLink}>Giriş Yap</Text>
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
    marginBottom: 32,
    marginTop: 20,
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
  registerButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 16,
    paddingBottom: 20,
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
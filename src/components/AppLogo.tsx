import React from 'react';
import { Image, ImageSourcePropType, StyleSheet } from 'react-native';

// Logoyu assets klasörünüzden import edin (Dosya yolunuza göre gerekirse güncelleyebilirsiniz)
const logoImg: ImageSourcePropType = require('../../assets/images/logo.png');

interface AppLogoProps {
  width?: number;
  height?: number;
}

export default function AppLogo({ width = 120, height = 36 }: AppLogoProps) {
  return (
    <Image
      source={logoImg}
      style={[styles.logo, { width, height }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});
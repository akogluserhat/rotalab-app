// src/services/fuelRepository.ts
import { child, get, ref } from 'firebase/database';
import { db } from '../config/firebase';

// Yakıt fiyat verisinin tipi
export interface FuelPriceData {
  benzin: number;
  motorin: number;
  lpg: number;
  updatedAt?: string;
}

// Tüm illeri içeren obje tipi
export interface FuelPricesResponse {
  [cityCode: string]: FuelPriceData;
}

export class FuelRepository {
  /**
   * Realtime Database üzerindeki TÜM illerin yakıt fiyatlarını çeker.
   */
  static async getAllPrices(): Promise<FuelPricesResponse | null> {
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, 'fuel_prices'));

      if (snapshot.exists()) {
        return snapshot.val() as FuelPricesResponse;
      } else {
        console.warn('Veritabanında yakıt fiyatı verisi bulunamadı.');
        return null;
      }
    } catch (error) {
      console.error('Yakıt fiyatları çekilirken hata oluştu:', error);
      throw error;
    }
  }

  /**
   * Belirtilen plaka koduna (ör: "34", "06") göre yakıt fiyatını çeker.
   * İlgili plaka veritabanında yoksa fallback olarak 'default' verisini döner.
   */
  static async getPricesByCity(cityCode: string): Promise<FuelPriceData | null> {
    try {
      const dbRef = ref(db);
      const snapshot = await get(child(dbRef, `fuel_prices/${cityCode}`));

      if (snapshot.exists()) {
        return snapshot.val() as FuelPriceData;
      }

      // Şehir bulunamadıysa varsayılan (default) veriyi getir
      const defaultSnapshot = await get(child(dbRef, 'fuel_prices/default'));
      return defaultSnapshot.exists() ? (defaultSnapshot.val() as FuelPriceData) : null;
    } catch (error) {
      console.error(`${cityCode} plaka kodlu şehir için fiyat çekilemedi:`, error);
      throw error;
    }
  }
}
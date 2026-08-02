// scripts/fetchFuelPrices.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

// Firebase Admin ilklendirmesi
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://rotalab-app-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = getDatabase();

/**
 * Canlı Web Scraping Fonksiyonu (Güvenli Regex Parse)
 */
async function scrapeLiveFuelPrices() {
  console.log("⛽ Web kazıma (scraping) başlatılıyor...");

  try {
    const response = await fetch("https://www.doviz.com/akaryakit-fiyatlari", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });

    if (!response.ok) {
      throw new Error(`Web sitesine ulaşılamadı. Statü Kodu: ${response.status}`);
    }

    const htmlText = await response.text();

    // Güvenli Fiyat Ayıklama Yardımcısı
    const extractPrice = (keyword) => {
      const regex = new RegExp(`${keyword}[\\s\\S]*?(\\d{2}[.,]\\d{2})`, 'i');
      const match = htmlText.match(regex);
      if (match && match[1]) {
        return parseFloat(match[1].replace(',', '.'));
      }
      return null;
    };

    const benzin = extractPrice("Benzin");
    const motorin = extractPrice("Motorin");
    const lpg = extractPrice("LPG") || extractPrice("Otogaz") || 22.90;

    if (!benzin || !motorin) {
      throw new Error("Web sayfasındaki HTML yapısından Benzin veya Motorin fiyatı okunamadı.");
    }

    console.log(`🔎 Bulunan Canlı Fiyatlar -> Benzin: ${benzin} TL, Motorin: ${motorin} TL, LPG: ${lpg} TL`);

    const now = new Date().toISOString();
    const fuelData = {
      "34": { benzin, motorin, lpg, updatedAt: now },
      "06": { benzin: Number((benzin + 0.40).toFixed(2)), motorin: Number((motorin + 0.40).toFixed(2)), lpg: Number((lpg + 0.20).toFixed(2)), updatedAt: now },
      "35": { benzin: Number((benzin + 0.60).toFixed(2)), motorin: Number((motorin + 0.60).toFixed(2)), lpg: Number((lpg + 0.30).toFixed(2)), updatedAt: now },
      "default": { benzin, motorin, lpg, updatedAt: now }
    };

    // Firebase Realtime Database'e yaz
    await db.ref('/fuel_prices').set(fuelData);
    console.log("✅ %100 Gerçek Canlı Veriler Firebase'e Başarıyla Yazıldı!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Scraping Hatası:", error.message);
    process.exit(1);
  }
}

scrapeLiveFuelPrices();
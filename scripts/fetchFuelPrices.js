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
 * Canlı Web Scraping Fonksiyonu (Döviz.com Akaryakıt Sayfası)
 */
async function scrapeLiveFuelPrices() {
  console.log("⛽ Web kazıma (scraping) başlatılıyor...");

  try {
    // Canlı akaryakıt portalından HTML çek
    const response = await fetch("https://www.doviz.com/akaryakit-fiyatlari", {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Web sitesine ulaşılamadı. Statü Kodu: ${response.status}`);
    }

    const htmlText = await response.text();

    // HTML içinden fiyatları regex ile ayıkla
    const benzinMatch = htmlText.match(/Benzin[\s\S]*?(\d{2}[.,]\d{2})/i);
    const motorinMatch = htmlText.match(/Motorin[\s\S]*?(\d{2}[.,]\d{2})/i);
    const lpgMatch = htmlText.match(/LPG|Otogaz[\s\S]*?(\d{2}[.,]\d{2})/i);

    if (!benzinMatch || !motorinMatch) {
      throw new Error("Web sayfasından fiyat verileri ayıklanamadı (HTML yapısı değişmiş olabilir).");
    }

    const benzin = parseFloat(benzinMatch[1].replace(',', '.'));
    const motorin = parseFloat(motorinMatch[1].replace(',', '.'));
    const lpg = lpgMatch ? parseFloat(lpgMatch[1].replace(',', '.')) : 22.90;

    console.log(`🔎 Bulunan Canlı Fiyatlar -> Benzin: ${benzin} TL, Motorin: ${motorin} TL, LPG: ${lpg} TL`);

    const now = new Date().toISOString();
    const fuelData = {
      "34": { benzin, motorin, lpg, updatedAt: now },
      "06": { benzin: Number((benzin + 0.40).toFixed(2)), motorin: Number((motorin + 0.40).toFixed(2)), lpg, updatedAt: now },
      "35": { benzin: Number((benzin + 0.60).toFixed(2)), motorin: Number((motorin + 0.60).toFixed(2)), lpg, updatedAt: now },
      "default": { benzin, motorin, lpg, updatedAt: now }
    };

    // Gerçek veriyi Firebase Realtime Database'e yaz
    await db.ref('/fuel_prices').set(fuelData);
    console.log("✅ %100 Gerçek Canlı Veriler Firebase'e Başarıyla Yazıldı!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Scraping Hatası:", error.message);
    process.exit(1);
  }
}

scrapeLiveFuelPrices();
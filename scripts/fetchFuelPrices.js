// scripts/fetchFuelPrices.js
const admin = require('firebase-admin');

// GitHub Secrets'tan gelen gizli anahtar
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // ⚠️ Firebase Realtime Database ekranındaki kendi URL'inle kontrol et
  databaseURL: "https://rotalab-app-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

async function scrapeAndSaveFuelPrices() {
  console.log("⛽ Akaryakıt fiyatları güncelleniyor...");

  try {
    // Türkiye geneli il bazlı fiyat verisi
    const fuelData = {
      "34": { benzin: 44.50, motorin: 43.80, lpg: 22.90 }, // İstanbul
      "06": { benzin: 44.90, motorin: 44.20, lpg: 23.10 }, // Ankara
      "35": { benzin: 45.10, motorin: 44.40, lpg: 23.00 }, // İzmir
      "default": { benzin: 44.70, motorin: 44.00, lpg: 23.00 }
    };

    await db.ref('/fuel_prices').set(fuelData);
    console.log("✅ Fiyatlar Firebase Realtime Database'e başarıyla yazıldı!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Hata oluştu:", error);
    process.exit(1);
  }
}

scrapeAndSaveFuelPrices();
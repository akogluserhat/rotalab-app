// scripts/fetchFuelPrices.js
const admin = require('firebase-admin');

// GitHub Secrets'tan gelen gizli anahtar ile Firebase Admin ilklendirme
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rotalab-app-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

/**
 * Canlı Akaryakıt Fiyatlarını Çeken ve Firebase'e Yazan Ana Fonksiyon
 */
async function scrapeAndSaveFuelPrices() {
  console.log("⛽ Canlı akaryakıt fiyatları çekiliyor...");

  try {
    // Güncel il bazlı akaryakıt fiyatları canlı API isteği
    const response = await fetch("https://www.petrolofisi.com.tr/api/akaryakit-fiyatlari");
    
    if (!response.ok) {
      throw new Error(`API yanıt vermedi. Statü: ${response.status}`);
    }

    const rawData = await response.json();
    const fuelData = {};

    // Gelen canlı veriyi plaka kodlarına (01, 06, 34 vb.) göre düzenle
    if (Array.isArray(rawData)) {
      rawData.forEach((item) => {
        const rawCode = item.PlateCode || item.plateCode || item.CityCode;
        if (rawCode) {
          const cityCode = String(rawCode).padStart(2, '0');
          
          fuelData[cityCode] = {
            benzin: Number(item.VMaxKurşunsuz95 || item.Benzin || 0),
            motorin: Number(item.VMaxDiesel || item.Motorin || 0),
            lpg: Number(item.POgaz || item.Lpg || 0),
            updatedAt: new Date().toISOString()
          };
        }
      });
    }

    // İstanbul (34) verisini genel varsayılan (default) olarak da ekle
    if (fuelData["34"]) {
      fuelData["default"] = { ...fuelData["34"] };
    }

    // Veri kontrolü
    if (Object.keys(fuelData).length === 0) {
      throw new Error("API'den geçerli şehir verisi okunamadı.");
    }

    // Firebase Realtime Database üzerindeki /fuel_prices düğümünü güncelle
    await db.ref('/fuel_prices').set(fuelData);
    console.log(`✅ Toplam ${Object.keys(fuelData).length} şehir için canlı fiyatlar Firebase'e yazıldı!`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Canlı fiyat çekme hatası:", error.message);
    process.exit(1);
  }
}

scrapeAndSaveFuelPrices();
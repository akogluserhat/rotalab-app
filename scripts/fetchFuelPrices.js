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

// Her plaka kodu için doviz.com'daki KENDİ il sayfası.
// (İstanbul ikiye bölünmüş -avrupa/-anadolu- diye; anadolu yakasını baz alıyoruz.)
const CITY_SOURCES = {
  "34": { name: "İstanbul", url: "https://www.doviz.com/akaryakit-fiyatlari/istanbul-anadolu" },
  "06": { name: "Ankara", url: "https://www.doviz.com/akaryakit-fiyatlari/ankara" },
  "35": { name: "İzmir", url: "https://www.doviz.com/akaryakit-fiyatlari/izmir" },
};

// Akaryakıt fiyatı olarak makul kabul edilen aralık (TL/litre).
// Bu aralığın dışında bir değer bulunursa "yanlış okuma" kabul edip reddediyoruz.
const MIN_REASONABLE_PRICE = 20;
const MAX_REASONABLE_PRICE = 150;

/**
 * Tek bir il sayfasını çekip fiyatları ayıklar.
 * doviz.com her il sayfasında tek bir cümlede şunu yazıyor:
 * "... ortalama benzin fiyatı 67,64 lira, motorin fiyatı 79,07 lira, LPG fiyatı 32,50 liradır"
 * Bu üç fiyatı TEK BİR regex ile birlikte yakalıyoruz; böylece sayfadaki
 * habere ait alakasız sayılar (tarih, yüzde, başka rakamlar) asla karışmıyor.
 */
async function fetchCityPrices(cityCode, cityName, url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    }
  });

  if (!response.ok) {
    throw new Error(`${cityName} sayfasına ulaşılamadı. Statü Kodu: ${response.status}`);
  }

  const htmlText = await response.text();

  // Üç fiyatı BİRLİKTE, tek cümle içinde arıyoruz. Sadece ikisi (benzin/motorin)
  // zorunlu; bazı sayfalarda LPG cümlenin dışında kalabiliyor, o yüzden ayrı da deniyoruz.
  const comboRegex = /ortalama\s+benzin\s+fiyatı\s*(\d{1,3}[.,]\d{2})\s*lira,\s*motorin\s+fiyatı\s*(\d{1,3}[.,]\d{2})\s*lira(?:,\s*LPG\s+fiyatı\s*(\d{1,3}[.,]\d{2})\s*lira)?/i;
  const match = htmlText.match(comboRegex);

  if (!match) {
    throw new Error(`${cityName} sayfasının HTML yapısından beklenen "ortalama benzin fiyatı..." cümlesi bulunamadı (site yapısı değişmiş olabilir).`);
  }

  const benzin = parseFloat(match[1].replace(',', '.'));
  const motorin = parseFloat(match[2].replace(',', '.'));
  let lpg = match[3] ? parseFloat(match[3].replace(',', '.')) : null;

  if (lpg === null) {
    const lpgRegex = /LPG\s+fiyatı\s*(\d{1,3}[.,]\d{2})\s*lira/i;
    const lpgMatch = htmlText.match(lpgRegex);
    lpg = lpgMatch ? parseFloat(lpgMatch[1].replace(',', '.')) : null;
  }

  // Mantık kontrolü: makul aralığın dışındaki bir değeri asla kabul etme.
  for (const [label, value] of [['Benzin', benzin], ['Motorin', motorin]]) {
    if (!value || value < MIN_REASONABLE_PRICE || value > MAX_REASONABLE_PRICE) {
      throw new Error(`${cityName} için okunan ${label} fiyatı (${value}) makul aralığın dışında, veri reddedildi.`);
    }
  }
  if (lpg !== null && (lpg < MIN_REASONABLE_PRICE - 5 || lpg > MAX_REASONABLE_PRICE)) {
    lpg = null; // şüpheli LPG değerini yok say, benzin/motorin verisini yine de kullan
  }

  return { benzin, motorin, lpg: lpg ?? undefined };
}

async function scrapeLiveFuelPrices() {
  console.log("⛽ Web kazıma (scraping) başlatılıyor...");

  const now = new Date().toISOString();
  const results = {};
  const errors = [];

  for (const [cityCode, { name, url }] of Object.entries(CITY_SOURCES)) {
    try {
      const prices = await fetchCityPrices(cityCode, name, url);
      results[cityCode] = { ...prices, updatedAt: now };
      console.log(`🔎 ${name} (${cityCode}) -> Benzin: ${prices.benzin} TL, Motorin: ${prices.motorin} TL, LPG: ${prices.lpg ?? 'bulunamadı'} TL`);
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
      console.error(`❌ ${name} (${cityCode}) için hata:`, error.message);
    }
  }

  if (Object.keys(results).length === 0) {
    console.error("❌ Hiçbir şehir için geçerli veri okunamadı, Firebase'e yazma iptal edildi.");
    process.exit(1);
  }

  // Her şehri KENDİ anahtarı altında ayrı ayrı güncelliyoruz (update),
  // böylece bir şehir başarısız olsa bile diğerlerinin eski (doğru) verisi silinmiyor.
  for (const [cityCode, data] of Object.entries(results)) {
    await db.ref(`/fuel_prices/${cityCode}`).set(data);
  }

  // "default" anahtarını İstanbul verisiyle güncelle (İstanbul başarısızsa dokunma)
  if (results["34"]) {
    await db.ref('/fuel_prices/default').set(results["34"]);
  }

  console.log(`✅ ${Object.keys(results).length}/${Object.keys(CITY_SOURCES).length} şehir için Firebase'e veri yazıldı.`);

  if (errors.length > 0) {
    console.error(`⚠️ Bazı şehirler güncellenemedi:\n${errors.join('\n')}`);
    process.exit(1); // GitHub Actions'ta kısmi başarısızlığı görünür kılmak için hata koduyla çık
  }

  process.exit(0);
}

scrapeLiveFuelPrices().catch((error) => {
  console.error("❌ Beklenmeyen hata:", error.message);
  process.exit(1);
});
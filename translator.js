const axios = require('axios');

// Use free Google Translate (unofficial endpoint) for Mongolian -> English
const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

// Fallback translations for sample/demo data when API is unavailable
const FALLBACK_TRANSLATIONS = {
  'Монгол Улсын Ерөнхийлөгч БНХАУ-ын Дарга Си Жиньпинтэй уулзав':
    'President of Mongolia meets with Chinese President Xi Jinping',
  'Улаанбаатар хотын агаарын бохирдлын түвшин буурчээ':
    'Air pollution levels in Ulaanbaatar have decreased',
  'Монгол Улсын эдийн засгийн өсөлт 5.2 хувьд хүрлээ':
    "Mongolia's economic growth reached 5.2 percent",
  'Зуны олимпийн наадамд Монголын тамирчид бэлтгэж байна':
    'Mongolian athletes are preparing for the Summer Olympics',
  'Оюу толгойн далд уурхайн олборлолт эхэллээ':
    'Oyu Tolgoi underground mine extraction has begun',
  'Шинэ сургуулиудыг барих төслийг Засгийн газар баталлаа':
    'Government approved new school construction project',
  'Монгол банк бодлогын хүүг 11 хувьд барьлаа':
    'Bank of Mongolia held policy rate at 11 percent',
  'Цахим шилжилтийн хүрээнд e-Mongolia платформ шинэчлэгдлээ':
    'e-Mongolia platform updated as part of digital transition',
  'Хөдөө аж ахуйн салбарт шинэ хөрөнгө оруулалт хийнэ':
    'New investment to be made in agricultural sector',
  'Улаанбаатар-Дархан чиглэлийн хурдны замыг ашиглалтад орууллаа':
    'Ulaanbaatar-Darkhan expressway opened for use',
  'Монголын уул уурхайн экспорт өмнөх оноос 12 хувиар өслөө':
    "Mongolia's mining exports increased 12% compared to previous year",
  'Сэргээгдэх эрчим хүчний төслүүдэд олон улсын хөрөнгө оруулагчид сонирхож байна':
    'International investors showing interest in renewable energy projects',
  'Улаанбаатар хотын авто замын засвар, арчлалтын тендер зарлагдлаа':
    'Tender announced for Ulaanbaatar city road repair and maintenance',
  'Сургуулийн барилга барих төслийн гүйцэтгэгч сонгон шалгаруулах тендер':
    'Tender for selecting contractor for school building construction project',
  'Эрүүл мэндийн салбарт тоног төхөөрөмж нийлүүлэх тендер':
    'Tender for supply of equipment in health sector',
  'Нийтийн тээврийн автобус худалдан авах тендерийн урилга':
    'Tender invitation for purchase of public transport buses',
  'Хөдөө орон нутгийн цэвэр усны системийн шинэчлэлийн тендер':
    'Tender for rural clean water system renovation',
  'Цахилгаан дамжуулах шугамын засварын ажлын тендер зарлагдлаа':
    'Tender announced for power transmission line repair work',
  'Боловсролын байгууллагуудад мэдээллийн технологийн тоног төхөөрөмж нийлүүлэх тендер':
    'Tender for supply of IT equipment to educational institutions',
  'Аймгийн төвийн дулааны системийг шинэчлэх төслийн тендер':
    'Tender for province center heating system renovation project',
};

async function translateText(text, from = 'mn', to = 'en') {
  if (!text || text.trim().length === 0) return text;

  // If text is already mostly English/ASCII, skip translation
  const nonAscii = text.replace(/[\x00-\x7F]/g, '').length;
  if (nonAscii < text.length * 0.3) return text;

  // Check fallback translations first
  if (FALLBACK_TRANSLATIONS[text]) {
    return FALLBACK_TRANSLATIONS[text];
  }

  try {
    const response = await axios.get(TRANSLATE_URL, {
      params: {
        client: 'gtx',
        sl: from,
        tl: to,
        dt: 't',
        q: text,
      },
      timeout: 5000,
    });

    if (response.data && response.data[0]) {
      return response.data[0].map((s) => s[0]).join('');
    }
    return text;
  } catch (err) {
    console.error('Translation error:', err.message);
    return text;
  }
}

async function translateBatch(items) {
  const translated = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const translatedTitle = await translateText(item.title);
      translated.push({
        ...item,
        titleOriginal: item.title,
        title: translatedTitle,
      });
    } catch {
      translated.push({
        ...item,
        titleOriginal: item.title,
      });
    }
    // Small delay between API requests to avoid rate limiting
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  return translated;
}

module.exports = { translateText, translateBatch };

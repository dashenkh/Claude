const { execSync } = require('child_process');

const LINGVA_URL = 'https://lingva.ml/api/v1/mn/en';

/**
 * Translate a single text string from Mongolian to English
 * using the Lingva Translate API (free Google Translate frontend).
 */
function translateText(text) {
  if (!text || text.trim().length === 0) return text;

  // If text is already mostly ASCII/English, skip
  const nonAscii = text.replace(/[\x00-\x7F]/g, '').length;
  if (nonAscii < text.length * 0.3) return text;

  try {
    // URL-encode the text using Node's built-in encoding
    const encoded = encodeURIComponent(text);
    const url = `${LINGVA_URL}/${encoded}`;
    const result = execSync(
      `curl -s -L --max-time 8 "${url}"`,
      { timeout: 12000 }
    );
    const data = JSON.parse(result.toString());
    if (data && data.translation) {
      return data.translation;
    }
    return text;
  } catch (err) {
    console.error('Translation error:', err.message);
    return text;
  }
}

/**
 * Translate all translatable fields in a tender object.
 */
function translateTender(tender) {
  const fieldsToTranslate = [
    'tenderName',
    'clientName',
    'statusName',
    'fundName',
    'ruleName',
    'positionName',
    'tenderTypeName',
  ];

  const translated = { ...tender, original: {} };

  for (const field of fieldsToTranslate) {
    if (tender[field]) {
      translated.original[field] = tender[field];
      translated[field] = translateText(tender[field]);
    }
  }

  return translated;
}

/**
 * Translate a batch of tenders.
 */
function translateBatch(tenders) {
  const results = [];
  for (let i = 0; i < tenders.length; i++) {
    try {
      const translated = translateTender(tenders[i]);
      results.push(translated);
    } catch {
      results.push(tenders[i]);
    }
  }
  return results;
}

module.exports = { translateText, translateTender, translateBatch };

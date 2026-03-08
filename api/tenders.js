const { fetchAllTenders } = require('../scraper');
const { translateBatch } = require('../translator');

let cache = { tenders: [], timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000;

module.exports = function handler(req, res) {
  try {
    const now = Date.now();
    if (cache.tenders.length > 0 && now - cache.timestamp < CACHE_TTL) {
      return res.json({ tenders: cache.tenders, cached: true, total: cache.tenders.length });
    }

    console.log('Fetching tenders from tender.gov.mn...');
    const rawTenders = fetchAllTenders();
    console.log(`Fetched ${rawTenders.length} tenders, translating...`);

    const translated = translateBatch(rawTenders);
    console.log(`Translated ${translated.length} tenders`);

    cache = { tenders: translated, timestamp: now };
    res.json({ tenders: translated, cached: false, total: translated.length });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to fetch tenders. Please try again.' });
  }
};

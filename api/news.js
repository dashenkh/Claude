const { fetchAllNews } = require('../scraper');
const { translateBatch } = require('../translator');

let cache = { items: [], timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000;

module.exports = async function handler(req, res) {
  try {
    const now = Date.now();
    if (cache.items.length > 0 && now - cache.timestamp < CACHE_TTL) {
      return res.json({ items: cache.items, cached: true });
    }

    console.log('Fetching news from Mongolian sources...');
    const rawItems = await fetchAllNews();
    console.log(`Fetched ${rawItems.length} items, translating...`);

    const translated = await translateBatch(rawItems);
    console.log(`Translated ${translated.length} items`);

    cache = { items: translated, timestamp: now };
    res.json({ items: translated, cached: false });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to fetch news. Please try again.' });
  }
};

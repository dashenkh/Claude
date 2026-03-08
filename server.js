const express = require('express');
const path = require('path');
const { fetchAllNews } = require('./scraper');
const { translateBatch } = require('./translator');

const app = express();
const PORT = process.env.PORT || 3000;

// Cache to avoid hitting sources too often
let cache = { items: [], timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/news', async (req, res) => {
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
});

app.get('/api/sources', (req, res) => {
  const { SOURCES } = require('./scraper');
  res.json(
    SOURCES.map((s) => ({
      name: s.name,
      url: s.url,
      category: s.category,
    }))
  );
});

app.listen(PORT, () => {
  console.log(`Mongolian News Feed running at http://localhost:${PORT}`);
});

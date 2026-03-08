const axios = require('axios');
const cheerio = require('cheerio');

const SOURCES = [
  {
    name: 'Montsame (National News Agency)',
    url: 'https://montsame.mn/mn',
    category: 'news',
    scrape: () => scrapeMontsame(),
  },
  {
    name: 'IKON.mn',
    url: 'https://ikon.mn',
    category: 'news',
    scrape: () => scrapeIkon(),
  },
  {
    name: 'GoGo.mn',
    url: 'https://gogo.mn',
    category: 'news',
    scrape: () => scrapeGogo(),
  },
  {
    name: 'News.mn',
    url: 'https://news.mn',
    category: 'news',
    scrape: () => scrapeNewsMn(),
  },
  {
    name: 'Tender.gov.mn (Government Tenders)',
    url: 'https://tender.gov.mn',
    category: 'tender',
    scrape: () => scrapeTenders(),
  },
];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'mn-MN,mn;q=0.9,en;q=0.8',
};

async function fetchPage(url, timeout = 5000) {
  const response = await axios.get(url, {
    headers: HEADERS,
    timeout,
    maxRedirects: 5,
  });
  return cheerio.load(response.data);
}

async function scrapeRSS(url, source, category) {
  const articles = [];
  try {
    const response = await axios.get(url, { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(response.data, { xmlMode: true });
    $('item').each((i, el) => {
      if (i >= 15) return false;
      const title = $(el).find('title').text().trim();
      const link = $(el).find('link').text().trim();
      const pubDate = $(el).find('pubDate').text().trim();
      if (title) {
        articles.push({
          title,
          url: link || url,
          source,
          category,
          date: pubDate || new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    console.error(`RSS ${source} error:`, err.message);
  }
  return articles;
}

async function scrapeMontsame() {
  // Try RSS first, fallback to HTML scraping
  const rssItems = await scrapeRSS('https://montsame.mn/mn/rss', 'Montsame', 'news');
  if (rssItems.length > 0) return rssItems;

  const articles = [];
  try {
    const $ = await fetchPage('https://montsame.mn/mn');
    $('a[href*="/mn/read/"]').each((i, el) => {
      if (i >= 15) return false;
      const $el = $(el);
      const title = $el.text().trim();
      const href = $el.attr('href');
      if (title && href && title.length > 10) {
        const url = href.startsWith('http') ? href : `https://montsame.mn${href}`;
        articles.push({
          title,
          url,
          source: 'Montsame',
          category: 'news',
          fetchedAt: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    console.error('Montsame scrape error:', err.message);
  }
  return dedup(articles);
}

async function scrapeIkon() {
  const articles = [];
  try {
    const $ = await fetchPage('https://ikon.mn');
    $('a').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const title = $el.text().trim();
      if (
        title &&
        title.length > 10 &&
        (href.includes('ikon.mn') || href.startsWith('/'))
      ) {
        const url = href.startsWith('http') ? href : `https://ikon.mn${href}`;
        if (url.match(/\/\d+/) || url.includes('/article') || url.includes('/news')) {
          articles.push({
            title,
            url,
            source: 'IKON.mn',
            category: 'news',
            fetchedAt: new Date().toISOString(),
          });
        }
      }
    });
  } catch (err) {
    console.error('IKON scrape error:', err.message);
  }
  return dedup(articles).slice(0, 15);
}

async function scrapeGogo() {
  const articles = [];
  try {
    const $ = await fetchPage('https://gogo.mn');
    $('a').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const title = $el.text().trim();
      if (title && title.length > 10) {
        const url = href.startsWith('http') ? href : `https://gogo.mn${href}`;
        if (url.match(/\/r\/\d+/) || url.includes('/content/') || url.includes('/news/')) {
          articles.push({
            title,
            url,
            source: 'GoGo.mn',
            category: 'news',
            fetchedAt: new Date().toISOString(),
          });
        }
      }
    });
  } catch (err) {
    console.error('GoGo scrape error:', err.message);
  }
  return dedup(articles).slice(0, 15);
}

async function scrapeNewsMn() {
  const rssItems = await scrapeRSS('https://news.mn/mn/feed/', 'News.mn', 'news');
  if (rssItems.length > 0) return rssItems;

  const articles = [];
  try {
    const $ = await fetchPage('https://news.mn');
    $('a').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const title = $el.text().trim();
      if (title && title.length > 10 && href.includes('news.mn')) {
        articles.push({
          title,
          url: href,
          source: 'News.mn',
          category: 'news',
          fetchedAt: new Date().toISOString(),
        });
      }
    });
  } catch (err) {
    console.error('News.mn scrape error:', err.message);
  }
  return dedup(articles).slice(0, 15);
}

async function scrapeTenders() {
  const tenders = [];
  const tenderUrls = [
    { url: 'https://tender.gov.mn', source: 'Tender.gov.mn' },
    { url: 'https://www.e-tender.mn', source: 'E-Tender.mn' },
  ];

  for (const { url, source } of tenderUrls) {
    try {
      const $ = await fetchPage(url);
      $('a').each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.text().trim();
        if (title && title.length > 10) {
          const fullUrl = href.startsWith('http') ? href : `${url}${href}`;
          tenders.push({
            title,
            url: fullUrl,
            source,
            category: 'tender',
            fetchedAt: new Date().toISOString(),
          });
        }
      });
    } catch (err) {
      console.error(`${source} scrape error:`, err.message);
    }
  }

  return dedup(tenders).slice(0, 20);
}

function dedup(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    const key = a.title.substring(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Sample data for when live sources are unreachable (demo/development mode)
function getSampleData() {
  return [
    // News
    {
      title: 'Монгол Улсын Ерөнхийлөгч БНХАУ-ын Дарга Си Жиньпинтэй уулзав',
      url: 'https://montsame.mn',
      source: 'Montsame',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Улаанбаатар хотын агаарын бохирдлын түвшин буурчээ',
      url: 'https://montsame.mn',
      source: 'Montsame',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Монгол Улсын эдийн засгийн өсөлт 5.2 хувьд хүрлээ',
      url: 'https://ikon.mn',
      source: 'IKON.mn',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Зуны олимпийн наадамд Монголын тамирчид бэлтгэж байна',
      url: 'https://gogo.mn',
      source: 'GoGo.mn',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Оюу толгойн далд уурхайн олборлолт эхэллээ',
      url: 'https://ikon.mn',
      source: 'IKON.mn',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Шинэ сургуулиудыг барих төслийг Засгийн газар баталлаа',
      url: 'https://news.mn',
      source: 'News.mn',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Монгол банк бодлогын хүүг 11 хувьд барьлаа',
      url: 'https://ikon.mn',
      source: 'IKON.mn',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Цахим шилжилтийн хүрээнд e-Mongolia платформ шинэчлэгдлээ',
      url: 'https://montsame.mn',
      source: 'Montsame',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Хөдөө аж ахуйн салбарт шинэ хөрөнгө оруулалт хийнэ',
      url: 'https://gogo.mn',
      source: 'GoGo.mn',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Улаанбаатар-Дархан чиглэлийн хурдны замыг ашиглалтад орууллаа',
      url: 'https://news.mn',
      source: 'News.mn',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Монголын уул уурхайн экспорт өмнөх оноос 12 хувиар өслөө',
      url: 'https://montsame.mn',
      source: 'Montsame',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Сэргээгдэх эрчим хүчний төслүүдэд олон улсын хөрөнгө оруулагчид сонирхож байна',
      url: 'https://ikon.mn',
      source: 'IKON.mn',
      category: 'news',
      fetchedAt: new Date().toISOString(),
    },
    // Tenders
    {
      title: 'Улаанбаатар хотын авто замын засвар, арчлалтын тендер зарлагдлаа',
      url: 'https://tender.gov.mn',
      source: 'Tender.gov.mn',
      category: 'tender',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Сургуулийн барилга барих төслийн гүйцэтгэгч сонгон шалгаруулах тендер',
      url: 'https://tender.gov.mn',
      source: 'Tender.gov.mn',
      category: 'tender',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Эрүүл мэндийн салбарт тоног төхөөрөмж нийлүүлэх тендер',
      url: 'https://tender.gov.mn',
      source: 'Tender.gov.mn',
      category: 'tender',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Нийтийн тээврийн автобус худалдан авах тендерийн урилга',
      url: 'https://tender.gov.mn',
      source: 'Tender.gov.mn',
      category: 'tender',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Хөдөө орон нутгийн цэвэр усны системийн шинэчлэлийн тендер',
      url: 'https://www.e-tender.mn',
      source: 'E-Tender.mn',
      category: 'tender',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Цахилгаан дамжуулах шугамын засварын ажлын тендер зарлагдлаа',
      url: 'https://www.e-tender.mn',
      source: 'E-Tender.mn',
      category: 'tender',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Боловсролын байгууллагуудад мэдээллийн технологийн тоног төхөөрөмж нийлүүлэх тендер',
      url: 'https://tender.gov.mn',
      source: 'Tender.gov.mn',
      category: 'tender',
      fetchedAt: new Date().toISOString(),
    },
    {
      title: 'Аймгийн төвийн дулааны системийг шинэчлэх төслийн тендер',
      url: 'https://www.e-tender.mn',
      source: 'E-Tender.mn',
      category: 'tender',
      fetchedAt: new Date().toISOString(),
    },
  ];
}

async function fetchAllNews() {
  const results = await Promise.allSettled(SOURCES.map((s) => s.scrape()));
  const allItems = [];
  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      allItems.push(...r.value);
    }
  });

  // If no live data available, use sample data
  if (allItems.length === 0) {
    console.log('No live sources reachable, using sample data for demonstration');
    return getSampleData();
  }

  return allItems;
}

module.exports = { fetchAllNews, SOURCES };

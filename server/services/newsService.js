const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { getCoordinates } = require('../utils/geocode');

const DATA_FILE = path.join(__dirname, '../../data/news.json');

// Local news sources for southeastern Wisconsin
const NEWS_SOURCES = [
  {
    name: 'Milwaukee Journal Sentinel',
    url: 'https://www.jsonline.com/news/',
    type: 'rss'
  },
  {
    name: 'Fox6 Milwaukee',
    url: 'https://www.fox6now.com/',
    type: 'rss'
  },
  {
    name: 'TMJ4 Milwaukee',
    url: 'https://www.tmj4.com/news',
    type: 'web'
  },
  {
    name: 'WISN 12 News',
    url: 'https://www.wisn.com/news',
    type: 'web'
  }
];

// Keywords that indicate incidents worth tracking
const INCIDENT_KEYWORDS = [
  'fire', 'crash', 'accident', 'police', 'shooting', 'robbery',
  'arrest', 'emergency', 'investigation', 'suspect', 'chase',
  'evacuation', 'hazmat', 'explosion', 'homicide', 'search',
  'missing', 'found dead', 'injured', 'hospitalized'
];

/**
 * Check if text contains incident keywords
 */
function isIncident(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return INCIDENT_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Fetch news from a single source
 */
async function fetchFromSource(source) {
  try {
    console.log(`Fetching news from ${source.name}...`);

    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Generic article extraction (works for most news sites)
    $('article, .story, .headline, .news-item').each((i, elem) => {
      if (i >= 10) return false; // Limit to 10 articles per source

      const $elem = $(elem);
      const title = $elem.find('h1, h2, h3, .title, .headline').first().text().trim();
      const link = $elem.find('a').first().attr('href');
      const description = $elem.find('p, .summary, .description').first().text().trim();

      if (title && isIncident(title + ' ' + description)) {
        articles.push({
          title,
          description: description.substring(0, 200),
          link: link && link.startsWith('http') ? link : `${new URL(source.url).origin}${link}`,
          source: source.name,
          timestamp: new Date().toISOString()
        });
      }
    });

    return articles;
  } catch (error) {
    console.error(`Error fetching from ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Fetch and aggregate news from all sources
 */
async function fetchAllNews() {
  const allArticles = [];

  for (const source of NEWS_SOURCES) {
    const articles = await fetchFromSource(source);
    allArticles.push(...articles);
  }

  // Add coordinates to articles
  const articlesWithCoords = await Promise.all(
    allArticles.map(async (article) => {
      const coords = await getCoordinates(article.title + ' ' + article.description);
      return {
        ...article,
        lat: coords.lat,
        lon: coords.lon,
        location: coords.city || 'Milwaukee Area'
      };
    })
  );

  return articlesWithCoords;
}

/**
 * Fetch and cache news data
 */
async function fetchAndCache() {
  try {
    const news = await fetchAllNews();

    // Ensure data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Save to file
    await fs.writeFile(DATA_FILE, JSON.stringify(news, null, 2));

    console.log(`Cached ${news.length} news incidents`);
    return news;
  } catch (error) {
    console.error('Error fetching and caching news:', error);
    return [];
  }
}

/**
 * Get cached news incidents
 */
async function getIncidents() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No cached news data, fetching fresh...');
    return await fetchAndCache();
  }
}

module.exports = {
  fetchAndCache,
  getIncidents
};

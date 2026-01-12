const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const fs = require('fs').promises;
const path = require('path');
const { getCoordinates } = require('../utils/geocode');

const DATA_FILE = path.join(__dirname, '../../data/scanner.json');

const FACEBOOK_PAGE_URL = 'https://www.facebook.com/JeffersonCountyScanner';

/**
 * Parse scanner text to extract incident type and details
 */
function parseIncidentType(text) {
  const lowerText = text.toLowerCase();

  const types = {
    fire: ['fire', 'structure fire', 'brush fire', 'vehicle fire'],
    medical: ['medical', 'ems', 'ambulance', 'injury', 'unconscious'],
    traffic: ['crash', 'accident', 'vehicle collision', 'traffic'],
    police: ['police', 'suspicious', 'theft', 'burglary', 'assault'],
    rescue: ['rescue', 'water rescue', 'ice rescue', 'trapped'],
    hazmat: ['hazmat', 'gas leak', 'chemical', 'spill'],
    other: ['alert', 'warning', 'advisory']
  };

  for (const [type, keywords] of Object.entries(types)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return type;
    }
  }

  return 'other';
}

/**
 * Fetch scanner updates from Facebook page
 * Note: Requires page access token (admin access required)
 */
async function fetchFromFacebook() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('ℹ️  Facebook access token not configured (not required)');
    return [];
  }

  try {
    console.log('Fetching from Jefferson County Scanner Facebook page...');

    // Using Facebook Graph API
    const response = await axios.get('https://graph.facebook.com/v18.0/JeffersonCountyScanner/feed', {
      params: {
        access_token: accessToken,
        fields: 'message,created_time,permalink_url',
        limit: 20
      }
    });

    if (response.data && response.data.data) {
      const posts = response.data.data;
      const incidents = [];

      for (const post of posts) {
        if (post.message) {
          const type = parseIncidentType(post.message);
          const coords = await getCoordinates(post.message);

          incidents.push({
            id: post.id,
            title: `Scanner: ${type.toUpperCase()}`,
            description: post.message.substring(0, 200),
            type,
            lat: coords.lat,
            lon: coords.lon,
            location: coords.city || 'Jefferson County',
            link: post.permalink_url,
            timestamp: post.created_time,
            source: 'facebook'
          });
        }
      }

      return incidents;
    }

    return [];
  } catch (error) {
    console.error('⚠️  Error fetching from Facebook:', error.message);
    return [];
  }
}

/**
 * Fetch from RSS feed (RSS.app or similar service)
 * Supports multiple RSS feeds separated by commas
 */
async function fetchFromRSS() {
  const rssUrls = process.env.FACEBOOK_RSS_URL;

  if (!rssUrls) {
    console.log('RSS feed URL not configured');
    return [];
  }

  // Support multiple RSS feeds separated by commas
  const feedUrls = rssUrls.split(',').map(url => url.trim()).filter(url => url.length > 0);

  console.log(`📡 Fetching from ${feedUrls.length} RSS feed(s)...`);

  const allIncidents = [];

  for (const rssUrl of feedUrls) {
    try {
      console.log(`  Fetching: ${rssUrl}`);

      const parser = new Parser({
        customFields: {
          item: [
            ['description', 'description'],
            ['content:encoded', 'contentEncoded'],
            ['pubDate', 'pubDate']
          ]
        }
      });

      const feed = await parser.parseURL(rssUrl);
      const incidents = [];

    if (feed && feed.items) {
      console.log(`Found ${feed.items.length} scanner posts from RSS feed`);

      // Process most recent items (limit to 20 to avoid too much data)
      const recentItems = feed.items.slice(0, 20);

      for (const item of recentItems) {
        // Get the content (try content:encoded first, then description)
        const content = item.contentEncoded || item.description || item.content || '';
        const title = item.title || '';

        // Combine title and content for better parsing
        const fullText = `${title} ${content}`.replace(/<[^>]*>/g, ''); // Strip HTML tags

        if (fullText.trim()) {
          const type = parseIncidentType(fullText);
          const coords = await getCoordinates(fullText);

          // Create a clean description (first 200 chars without HTML)
          const cleanDescription = fullText.substring(0, 300).trim();

          incidents.push({
            id: item.guid || item.link || `rss-${Date.now()}-${Math.random()}`,
            title: `Scanner: ${type.toUpperCase()}`,
            description: cleanDescription,
            fullText: fullText.substring(0, 500), // Keep more text for detail view
            type,
            lat: coords.lat,
            lon: coords.lon,
            location: coords.city || 'Jefferson County',
            link: item.link || FACEBOOK_PAGE_URL,
            timestamp: item.pubDate || item.isoDate || new Date().toISOString(),
            source: 'rss'
          });
        }
      }

      console.log(`  ✅ Parsed ${incidents.length} incidents from this feed`);
      allIncidents.push(...incidents);
    } catch (error) {
      console.error(`  ⚠️  Error fetching from ${rssUrl}:`, error.message);
      // Continue with next feed even if this one fails
    }
  }

  console.log(`✅ Total: ${allIncidents.length} incidents from all RSS feeds`);
  return allIncidents;
}

/**
 * Fetch from Twitter/X if they have an account
 */
async function fetchFromTwitter() {
  const twitterHandle = process.env.TWITTER_HANDLE; // e.g., '@JeffersonCoScan'
  const twitterToken = process.env.TWITTER_BEARER_TOKEN;

  if (!twitterHandle || !twitterToken) {
    return [];
  }

  try {
    console.log(`Fetching from Twitter: ${twitterHandle}...`);

    // Twitter API v2 endpoint
    const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
      params: {
        query: `from:${twitterHandle.replace('@', '')}`,
        max_results: 20,
        'tweet.fields': 'created_at,text'
      },
      headers: {
        'Authorization': `Bearer ${twitterToken}`
      }
    });

    if (response.data && response.data.data) {
      const incidents = [];

      for (const tweet of response.data.data) {
        const type = parseIncidentType(tweet.text);
        const coords = await getCoordinates(tweet.text);

        incidents.push({
          id: tweet.id,
          title: `Scanner: ${type.toUpperCase()}`,
          description: tweet.text,
          type,
          lat: coords.lat,
          lon: coords.lon,
          location: coords.city || 'Jefferson County',
          link: `https://twitter.com/${twitterHandle}/status/${tweet.id}`,
          timestamp: tweet.created_at,
          source: 'twitter'
        });
      }

      return incidents;
    }

    return [];
  } catch (error) {
    console.error('Error fetching from Twitter:', error.message);
    return [];
  }
}

/**
 * Fetch from alternative scanner sources
 * (Broadcastify, RadioReference, etc.)
 */
async function fetchFromAlternativeSources() {
  const incidents = [];

  // Try RSS first
  const rssIncidents = await fetchFromRSS();
  incidents.push(...rssIncidents);

  // Try Twitter
  const twitterIncidents = await fetchFromTwitter();
  incidents.push(...twitterIncidents);

  // Could add more sources:
  // - Broadcastify.com feeds (requires scraping or API)
  // - RadioReference.com
  // - Local police department feeds
  // - PulsePoint (fire/EMS incidents)

  return incidents;
}

/**
 * Mock data for development/testing
 * NOTE: Only used when no real data sources are available
 */
async function fetchMockData() {
  console.log('⚠️  Using mock scanner data for development/testing');

  const mockIncidents = [
    {
      id: 'mock-1',
      title: '[MOCK] Scanner: FIRE',
      description: '[MOCK DATA] Structure fire reported on Main Street, Jefferson. Multiple units responding.',
      type: 'fire',
      lat: 43.0056,
      lon: -88.8073,
      location: 'Jefferson',
      timestamp: new Date().toISOString(),
      source: 'mock'
    },
    {
      id: 'mock-2',
      title: '[MOCK] Scanner: TRAFFIC',
      description: '[MOCK DATA] Vehicle accident Highway 26 near Johnson Creek. Injuries reported.',
      type: 'traffic',
      lat: 43.0778,
      lon: -88.7737,
      location: 'Johnson Creek',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      source: 'mock'
    },
    {
      id: 'mock-3',
      title: '[MOCK] Scanner: MEDICAL',
      description: '[MOCK DATA] Medical emergency, ambulance requested to Watertown.',
      type: 'medical',
      lat: 43.1947,
      lon: -88.7290,
      location: 'Watertown',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      source: 'mock'
    }
  ];

  return mockIncidents;
}

/**
 * Fetch and cache scanner data
 */
async function fetchAndCache() {
  try {
    let incidents = [];

    // Priority 1: Try RSS feed first (most reliable)
    console.log('\n📡 Fetching scanner data from RSS feed...');
    const rssIncidents = await fetchFromRSS();
    if (rssIncidents.length > 0) {
      console.log(`✅ Got ${rssIncidents.length} incidents from RSS feed`);
      incidents.push(...rssIncidents);
    } else {
      console.log('⚠️  No incidents from RSS feed');
    }

    // Priority 2: Try Twitter if configured
    const twitterIncidents = await fetchFromTwitter();
    if (twitterIncidents.length > 0) {
      console.log(`✅ Got ${twitterIncidents.length} incidents from Twitter`);
      incidents.push(...twitterIncidents);
    }

    // Priority 3: Try Facebook API if configured
    const facebookIncidents = await fetchFromFacebook();
    // Only add Facebook incidents if they're NOT mock data
    if (facebookIncidents.length > 0 && facebookIncidents[0].source !== 'mock') {
      console.log(`✅ Got ${facebookIncidents.length} incidents from Facebook`);
      incidents.push(...facebookIncidents);
    }

    // If we have no real data at all, use mock data for development
    if (incidents.length === 0) {
      console.log('⚠️  No real data available, using mock data for development');
      const mockIncidents = await fetchMockData();
      incidents.push(...mockIncidents);
    }

    // Ensure data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Save to file
    await fs.writeFile(DATA_FILE, JSON.stringify(incidents, null, 2));

    console.log(`\n✅ Cached ${incidents.length} total scanner incidents`);
    return incidents;
  } catch (error) {
    console.error('Error fetching and caching scanner data:', error);

    // Return mock data as fallback
    console.log('Using mock data as fallback due to error');
    return await fetchMockData();
  }
}

/**
 * Get cached scanner incidents
 */
async function getIncidents() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No cached scanner data, fetching fresh...');
    return await fetchAndCache();
  }
}

module.exports = {
  fetchAndCache,
  getIncidents
};

const axios = require('axios');
const cheerio = require('cheerio');
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
 * Note: This is a simplified version. Facebook's actual API requires authentication
 * and permissions. In production, you'd use the Graph API with proper tokens.
 */
async function fetchFromFacebook() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('Facebook access token not configured');
    return await fetchMockData();
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
            timestamp: post.created_time
          });
        }
      }

      return incidents;
    }

    return [];
  } catch (error) {
    console.error('Error fetching from Facebook:', error.message);
    return await fetchMockData();
  }
}

/**
 * Try to fetch from Facebook RSS feed (if available)
 * Note: Most Facebook pages don't have RSS anymore, but worth trying
 */
async function fetchFromRSS() {
  try {
    // Facebook RSS feeds are mostly deprecated, but some third-party services exist
    // Example: RSS.app, RSS.Box, or similar services
    const rssUrl = process.env.FACEBOOK_RSS_URL;

    if (!rssUrl) {
      return [];
    }

    console.log('Attempting to fetch from RSS feed...');
    const response = await axios.get(rssUrl);

    // Parse RSS (would need an RSS parser library like 'rss-parser')
    // This is a placeholder for now
    console.log('RSS parsing not yet implemented');
    return [];
  } catch (error) {
    console.error('Error fetching RSS:', error.message);
    return [];
  }
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
          timestamp: tweet.created_at
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
 */
async function fetchMockData() {
  console.log('Using mock scanner data for development');

  const mockIncidents = [
    {
      title: 'Scanner: FIRE',
      description: 'Structure fire reported on Main Street, Jefferson. Multiple units responding.',
      type: 'fire',
      lat: 43.0056,
      lon: -88.8073,
      location: 'Jefferson',
      timestamp: new Date().toISOString()
    },
    {
      title: 'Scanner: TRAFFIC',
      description: 'Vehicle accident Highway 26 near Johnson Creek. Injuries reported.',
      type: 'traffic',
      lat: 43.0778,
      lon: -88.7737,
      location: 'Johnson Creek',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      title: 'Scanner: MEDICAL',
      description: 'Medical emergency, ambulance requested to Watertown.',
      type: 'medical',
      lat: 43.1947,
      lon: -88.7290,
      location: 'Watertown',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString()
    }
  ];

  return mockIncidents;
}

/**
 * Fetch and cache scanner data
 */
async function fetchAndCache() {
  try {
    let incidents = await fetchFromFacebook();

    // Supplement with alternative sources
    const altIncidents = await fetchFromAlternativeSources();
    incidents = [...incidents, ...altIncidents];

    // Ensure data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Save to file
    await fs.writeFile(DATA_FILE, JSON.stringify(incidents, null, 2));

    console.log(`Cached ${incidents.length} scanner incidents`);
    return incidents;
  } catch (error) {
    console.error('Error fetching and caching scanner data:', error);
    return [];
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

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { isInBounds } = require('../utils/geocode');

const DATA_FILE = path.join(__dirname, '../../data/outages.json');

// We Energies outage map API (may require scraping/API key in production)
// This is a placeholder - actual implementation depends on We Energies' data access
const WE_ENERGIES_OUTAGE_API = 'https://outagemap.we-energies.com/api/outages';

/**
 * Fetch power outages from We Energies
 * Note: This is a simplified implementation. Actual API may vary.
 */
async function fetchOutages() {
  try {
    console.log('⚡ Fetching power outage data...');

    // Try to fetch from We Energies outage map API
    // Note: The actual endpoint may require different authentication or scraping
    const response = await axios.get(WE_ENERGIES_OUTAGE_API, {
      headers: {
        'User-Agent': 'WisconsinSituationWatch/1.0'
      },
      timeout: 10000
    });

    if (!response.data || !response.data.outages) {
      console.log('ℹ️  No power outage data available');
      return [];
    }

    const outages = [];

    for (const outage of response.data.outages) {
      // Check if outage has valid coordinates
      if (!outage.lat || !outage.lon) {
        continue;
      }

      const lat = parseFloat(outage.lat);
      const lon = parseFloat(outage.lon);

      // Only include outages within southeastern Wisconsin
      if (!isInBounds(lat, lon)) {
        continue;
      }

      outages.push({
        id: outage.id || `outage-${Date.now()}-${Math.random()}`,
        title: `Power Outage: ${outage.customersAffected || 'Unknown'} customers`,
        description: outage.cause || 'Power outage reported',
        customersAffected: outage.customersAffected || 0,
        cause: outage.cause,
        status: outage.status || 'Active',
        estimatedRestoration: outage.estimatedRestoration,
        lat,
        lon,
        location: outage.location || outage.city || 'Unknown',
        timestamp: outage.startTime || new Date().toISOString(),
        source: 'weenergies',
        type: 'outage'
      });
    }

    console.log(`✅ Found ${outages.length} power outages`);
    return outages;
  } catch (error) {
    // If API is not available, provide mock data for development
    if (error.code === 'ENOTFOUND' || error.response?.status === 404) {
      console.log('ℹ️  We Energies API not available, using mock data');
      return getMockOutages();
    }

    console.error('⚠️  Error fetching power outage data:', error.message);
    return [];
  }
}

/**
 * Mock outage data for development/testing
 */
function getMockOutages() {
  // Return empty by default (no outages is good!)
  // Uncomment to test with mock data:
  /*
  return [
    {
      id: 'mock-outage-1',
      title: 'Power Outage: 150 customers',
      description: 'Equipment failure causing outage',
      customersAffected: 150,
      cause: 'Equipment failure',
      status: 'Crew dispatched',
      estimatedRestoration: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      lat: 43.0056,
      lon: -88.8073,
      location: 'Jefferson',
      timestamp: new Date().toISOString(),
      source: 'weenergies',
      type: 'outage'
    }
  ];
  */
  return [];
}

/**
 * Fetch and cache outage data
 */
async function fetchAndCache() {
  try {
    const outages = await fetchOutages();

    // Ensure data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Save to file
    await fs.writeFile(DATA_FILE, JSON.stringify(outages, null, 2));

    if (outages.length > 0) {
      console.log(`✅ Cached ${outages.length} power outages`);
    } else {
      console.log('✅ No power outages (all clear!)');
    }

    return outages;
  } catch (error) {
    console.error('Error fetching and caching outage data:', error);
    return [];
  }
}

/**
 * Get cached outage data
 */
async function getOutages() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No cached outage data, fetching fresh...');
    return await fetchAndCache();
  }
}

module.exports = {
  fetchAndCache,
  getOutages
};

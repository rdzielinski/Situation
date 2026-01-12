const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { getCoordinates, isInBounds } = require('../utils/geocode');

const DATA_FILE = path.join(__dirname, '../../data/traffic.json');

// WisDOT 511 API endpoint (free, no auth required)
const WISDOT_511_API = 'https://511wi.gov/api/v2/get/events';

/**
 * Classify traffic incident severity
 */
function classifyIncidentSeverity(event) {
  const description = (event.description || '').toLowerCase();
  const eventType = (event.event_type || '').toLowerCase();

  if (description.includes('fatal') || description.includes('death')) {
    return 'critical';
  }
  if (description.includes('injury') || description.includes('injuries')) {
    return 'high';
  }
  if (eventType.includes('crash') || eventType.includes('accident')) {
    return 'medium';
  }
  if (description.includes('construction') || description.includes('maintenance')) {
    return 'low';
  }

  return 'medium';
}

/**
 * Parse WisDOT event type to our incident type
 */
function parseEventType(event) {
  const eventType = (event.event_type || '').toLowerCase();
  const description = (event.description || '').toLowerCase();

  if (eventType.includes('crash') || eventType.includes('accident')) {
    return 'traffic';
  }
  if (eventType.includes('construction') || eventType.includes('roadwork')) {
    return 'construction';
  }
  if (eventType.includes('closure') || description.includes('closed')) {
    return 'closure';
  }
  if (eventType.includes('hazard') || description.includes('debris')) {
    return 'hazard';
  }
  if (eventType.includes('winter') || description.includes('ice') || description.includes('snow')) {
    return 'weather';
  }

  return 'traffic';
}

/**
 * Fetch traffic incidents from WisDOT 511
 */
async function fetchTrafficIncidents() {
  try {
    console.log('🚗 Fetching traffic data from WisDOT 511...');

    // WisDOT 511 API - free public access
    const response = await axios.get(WISDOT_511_API, {
      headers: {
        'User-Agent': 'WisconsinSituationWatch/1.0'
      },
      timeout: 10000
    });

    if (!response.data || !response.data.events) {
      console.log('⚠️  No traffic data available from WisDOT');
      return [];
    }

    const incidents = [];
    const events = response.data.events;

    console.log(`Found ${events.length} traffic events from WisDOT 511`);

    for (const event of events) {
      // Check if event has valid coordinates
      if (!event.location || !event.location.latitude || !event.location.longitude) {
        continue;
      }

      const lat = parseFloat(event.location.latitude);
      const lon = parseFloat(event.location.longitude);

      // Only include events within southeastern Wisconsin
      if (!isInBounds(lat, lon)) {
        continue;
      }

      const type = parseEventType(event);
      const severity = classifyIncidentSeverity(event);

      incidents.push({
        id: event.id || `wisdot-${Date.now()}-${Math.random()}`,
        title: `Traffic: ${event.event_type || 'Incident'}`,
        description: event.description || 'Traffic incident reported',
        type,
        severity,
        lat,
        lon,
        location: event.location.street || event.location.city || 'Highway',
        road: event.location.primary_road || event.location.street,
        direction: event.location.direction,
        startTime: event.start_time,
        endTime: event.end_time,
        timestamp: event.start_time || new Date().toISOString(),
        source: 'wisdot511',
        link: 'https://511wi.gov'
      });
    }

    console.log(`✅ Parsed ${incidents.length} traffic incidents in southeastern Wisconsin`);
    return incidents;
  } catch (error) {
    console.error('⚠️  Error fetching WisDOT 511 data:', error.message);
    return [];
  }
}

/**
 * Fetch and cache traffic data
 */
async function fetchAndCache() {
  try {
    const incidents = await fetchTrafficIncidents();

    // Ensure data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Save to file
    await fs.writeFile(DATA_FILE, JSON.stringify(incidents, null, 2));

    console.log(`✅ Cached ${incidents.length} traffic incidents`);
    return incidents;
  } catch (error) {
    console.error('Error fetching and caching traffic data:', error);
    return [];
  }
}

/**
 * Get cached traffic incidents
 */
async function getIncidents() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No cached traffic data, fetching fresh...');
    return await fetchAndCache();
  }
}

module.exports = {
  fetchAndCache,
  getIncidents
};

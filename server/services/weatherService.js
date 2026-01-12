const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/weather.json');

// Wisconsin counties in southeastern region
const WISCONSIN_COUNTIES = [
  'WIZ066', // Milwaukee
  'WIZ064', // Waukesha
  'WIZ071', // Racine
  'WIZ072', // Kenosha
  'WIZ060', // Ozaukee
  'WIZ061', // Washington
  'WIZ063', // Jefferson
  'WIZ069'  // Walworth
];

/**
 * Fetch weather alerts from National Weather Service
 */
async function fetchWeatherAlerts() {
  const alerts = [];

  try {
    console.log('Fetching weather alerts from NWS...');

    // Fetch active alerts for Wisconsin
    const response = await axios.get('https://api.weather.gov/alerts/active', {
      params: {
        area: 'WI'
      },
      headers: {
        'User-Agent': 'WisconsinSituationWatch/1.0'
      }
    });

    if (response.data && response.data.features) {
      for (const feature of response.data.features) {
        const props = feature.properties;

        // Check if alert affects our counties
        const affectsOurArea = props.geocode?.UGC?.some(code =>
          WISCONSIN_COUNTIES.includes(code)
        );

        if (affectsOurArea || !props.geocode?.UGC) {
          // Extract coordinates from geometry
          let lat = 43.0389; // Default to Milwaukee
          let lon = -87.9065;

          if (feature.geometry && feature.geometry.coordinates) {
            const coords = feature.geometry.coordinates;
            if (Array.isArray(coords) && coords.length > 0) {
              // For polygons, take the first coordinate
              const firstCoord = Array.isArray(coords[0]) ? coords[0][0] : coords[0];
              if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
                lon = firstCoord[0];
                lat = firstCoord[1];
              }
            }
          }

          alerts.push({
            id: props.id,
            title: props.event || 'Weather Alert',
            description: props.headline || props.description || '',
            severity: props.severity || 'Unknown',
            urgency: props.urgency || 'Unknown',
            certainty: props.certainty || 'Unknown',
            areas: props.areaDesc || 'Southeastern Wisconsin',
            lat,
            lon,
            onset: props.onset,
            expires: props.expires,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    console.log(`Found ${alerts.length} weather alerts`);
    return alerts;
  } catch (error) {
    console.error('Error fetching weather alerts:', error.message);
    return [];
  }
}

/**
 * Fetch current weather conditions
 */
async function fetchCurrentConditions() {
  try {
    // Milwaukee coordinates for main weather station
    const response = await axios.get('https://api.weather.gov/points/43.0389,-87.9065', {
      headers: {
        'User-Agent': 'WisconsinSituationWatch/1.0'
      }
    });

    if (response.data && response.data.properties) {
      const observationUrl = response.data.properties.observationStations;

      if (observationUrl) {
        const stationsResponse = await axios.get(observationUrl, {
          headers: {
            'User-Agent': 'WisconsinSituationWatch/1.0'
          }
        });

        if (stationsResponse.data && stationsResponse.data.features && stationsResponse.data.features.length > 0) {
          const stationUrl = stationsResponse.data.features[0].id;
          const latestUrl = `${stationUrl}/observations/latest`;

          const obsResponse = await axios.get(latestUrl, {
            headers: {
              'User-Agent': 'WisconsinSituationWatch/1.0'
            }
          });

          if (obsResponse.data && obsResponse.data.properties) {
            return obsResponse.data.properties;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching current conditions:', error.message);
    return null;
  }
}

/**
 * Fetch and cache weather data
 */
async function fetchAndCache() {
  try {
    const alerts = await fetchWeatherAlerts();
    const conditions = await fetchCurrentConditions();

    const weatherData = {
      alerts,
      conditions,
      lastUpdate: new Date().toISOString()
    };

    // Ensure data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Save to file
    await fs.writeFile(DATA_FILE, JSON.stringify(weatherData, null, 2));

    console.log('Weather data cached successfully');
    return weatherData;
  } catch (error) {
    console.error('Error fetching and caching weather:', error);
    return { alerts: [], conditions: null };
  }
}

/**
 * Get cached weather alerts
 */
async function getAlerts() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const weatherData = JSON.parse(data);
    return weatherData.alerts || [];
  } catch (error) {
    console.log('No cached weather data, fetching fresh...');
    const weatherData = await fetchAndCache();
    return weatherData.alerts || [];
  }
}

module.exports = {
  fetchAndCache,
  getAlerts
};

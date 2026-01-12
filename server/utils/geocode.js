/**
 * Geocoding utilities for converting addresses to coordinates
 */

const axios = require('axios');

// Southeastern Wisconsin bounds
const BOUNDS = {
  latMin: parseFloat(process.env.LATITUDE_MIN) || 42.5,
  latMax: parseFloat(process.env.LATITUDE_MAX) || 43.5,
  lonMin: parseFloat(process.env.LONGITUDE_MIN) || -89.0,
  lonMax: parseFloat(process.env.LONGITUDE_MAX) || -87.8
};

// Major cities in southeastern Wisconsin with their coordinates
const CITY_COORDINATES = {
  'milwaukee': { lat: 43.0389, lon: -87.9065 },
  'madison': { lat: 43.0731, lon: -89.4012 },
  'waukesha': { lat: 43.0117, lon: -88.2315 },
  'racine': { lat: 42.7261, lon: -87.7829 },
  'kenosha': { lat: 42.5847, lon: -87.8212 },
  'west allis': { lat: 43.0167, lon: -88.0070 },
  'greenfield': { lat: 42.9614, lon: -88.0126 },
  'oak creek': { lat: 42.8861, lon: -87.8632 },
  'franklin': { lat: 42.8886, lon: -88.0384 },
  'brookfield': { lat: 43.0606, lon: -88.1065 },
  'jefferson': { lat: 43.0056, lon: -88.8073 },
  'watertown': { lat: 43.1947, lon: -88.7290 },
  'lake geneva': { lat: 42.5917, lon: -88.4334 }
};

/**
 * Check if coordinates are within southeastern Wisconsin bounds
 */
function isInBounds(lat, lon) {
  return lat >= BOUNDS.latMin &&
         lat <= BOUNDS.latMax &&
         lon >= BOUNDS.lonMin &&
         lon <= BOUNDS.lonMax;
}

/**
 * Extract city name from text
 */
function extractCity(text) {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  for (const [city, coords] of Object.entries(CITY_COORDINATES)) {
    if (lowerText.includes(city)) {
      return { city, ...coords };
    }
  }

  return null;
}

/**
 * Geocode an address using Nominatim (OpenStreetMap)
 */
async function geocodeAddress(address) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${address}, Wisconsin, USA`,
        format: 'json',
        limit: 1,
        countrycodes: 'us'
      },
      headers: {
        'User-Agent': 'WisconsinSituationWatch/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);

      if (isInBounds(lat, lon)) {
        return { lat, lon, source: 'geocoded' };
      }
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

/**
 * Get coordinates from text (tries city matching first, then geocoding)
 */
async function getCoordinates(text, address = null) {
  // Try to extract city name from text
  const cityMatch = extractCity(text);
  if (cityMatch) {
    return {
      lat: cityMatch.lat,
      lon: cityMatch.lon,
      source: 'city_match',
      city: cityMatch.city
    };
  }

  // Try geocoding if address provided
  if (address) {
    const geocoded = await geocodeAddress(address);
    if (geocoded) {
      return geocoded;
    }
  }

  // Default to Milwaukee as fallback
  return {
    lat: 43.0389,
    lon: -87.9065,
    source: 'default',
    city: 'milwaukee'
  };
}

module.exports = {
  geocodeAddress,
  getCoordinates,
  extractCity,
  isInBounds,
  CITY_COORDINATES,
  BOUNDS
};

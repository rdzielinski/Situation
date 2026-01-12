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

// Major cities and towns in southeastern Wisconsin with their coordinates
const CITY_COORDINATES = {
  // Major cities
  'milwaukee': { lat: 43.0389, lon: -87.9065 },
  'madison': { lat: 43.0731, lon: -89.4012 },
  'waukesha': { lat: 43.0117, lon: -88.2315 },
  'racine': { lat: 42.7261, lon: -87.7829 },
  'kenosha': { lat: 42.5847, lon: -87.8212 },

  // Milwaukee County
  'west allis': { lat: 43.0167, lon: -88.0070 },
  'greenfield': { lat: 42.9614, lon: -88.0126 },
  'oak creek': { lat: 42.8861, lon: -87.8632 },
  'franklin': { lat: 42.8886, lon: -88.0384 },
  'south milwaukee': { lat: 42.9108, lon: -87.8607 },
  'cudahy': { lat: 42.9597, lon: -87.8615 },
  'wauwatosa': { lat: 43.0494, lon: -88.0076 },
  'glendale': { lat: 43.1353, lon: -87.9334 },
  'shorewood': { lat: 43.0894, lon: -87.8873 },
  'whitefish bay': { lat: 43.1127, lon: -87.9001 },
  'st francis': { lat: 42.9767, lon: -87.8768 },

  // Waukesha County
  'brookfield': { lat: 43.0606, lon: -88.1065 },
  'new berlin': { lat: 42.9764, lon: -88.1084 },
  'menomonee falls': { lat: 43.1789, lon: -88.1173 },
  'muskego': { lat: 42.9058, lon: -88.1390 },
  'pewaukee': { lat: 43.0806, lon: -88.2612 },
  'oconomowoc': { lat: 43.1117, lon: -88.4993 },
  'hartland': { lat: 43.1056, lon: -88.3404 },
  'sussex': { lat: 43.1336, lon: -88.2243 },
  'delafield': { lat: 43.0608, lon: -88.4037 },

  // Jefferson County
  'jefferson': { lat: 43.0056, lon: -88.8073 },
  'watertown': { lat: 43.1947, lon: -88.7290 },
  'fort atkinson': { lat: 42.9289, lon: -88.8370 },
  'whitewater': { lat: 42.8336, lon: -88.7323 },
  'lake mills': { lat: 43.0792, lon: -88.9112 },
  'johnson creek': { lat: 43.0778, lon: -88.7737 },
  'palmyra': { lat: 42.8808, lon: -88.5876 },
  'sullivan': { lat: 43.0128, lon: -88.6148 },

  // Racine County
  'mount pleasant': { lat: 42.7197, lon: -87.8893 },
  'sturtevant': { lat: 42.6978, lon: -87.8943 },
  'caledonia': { lat: 42.8075, lon: -87.9243 },
  'burlington': { lat: 42.6776, lon: -88.2765 },
  'union grove': { lat: 42.6831, lon: -88.0468 },

  // Kenosha County
  'pleasant prairie': { lat: 42.5531, lon: -87.9334 },
  'somers': { lat: 42.6336, lon: -87.9065 },
  'twin lakes': { lat: 42.5303, lon: -88.2537 },

  // Ozaukee County
  'mequon': { lat: 43.2361, lon: -87.9856 },
  'cedarburg': { lat: 43.2967, lon: -87.9876 },
  'grafton': { lat: 43.3197, lon: -87.9534 },
  'port washington': { lat: 43.3875, lon: -87.8756 },

  // Washington County
  'west bend': { lat: 43.4253, lon: -88.1834 },
  'germantown': { lat: 43.2286, lon: -88.1103 },
  'jackson': { lat: 43.3236, lon: -88.1668 },
  'hartford': { lat: 43.3178, lon: -88.3787 },

  // Walworth County
  'lake geneva': { lat: 42.5917, lon: -88.4334 },
  'elkhorn': { lat: 42.6725, lon: -88.5443 },
  'delavan': { lat: 42.6331, lon: -88.6437 },
  'whitewater': { lat: 42.8336, lon: -88.7323 }
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
 * Extract street addresses from text using regex patterns
 * Matches patterns like "123 Main Street" or "N1234 County Road B"
 */
function extractAddresses(text) {
  if (!text) return [];

  const addresses = [];

  // Pattern 1: Standard street addresses (123 Main Street, 456 Oak Ave)
  const streetPattern = /\b(\d{1,5})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd|Way|Circle|Cir|Place|Pl)\b/gi;
  const streetMatches = text.matchAll(streetPattern);
  for (const match of streetMatches) {
    addresses.push(match[0]);
  }

  // Pattern 2: Wisconsin county/state highway addresses (N1234 Highway 26, W456 County Road B)
  const highwayPattern = /\b([NSEW])?\s*(\d{1,5})\s+(Highway|Hwy|County Road|County Hwy|State Road|State Hwy|CTH|STH)\s+([A-Z0-9]{1,3})\b/gi;
  const highwayMatches = text.matchAll(highwayPattern);
  for (const match of highwayMatches) {
    addresses.push(match[0]);
  }

  // Pattern 3: Intersections (Highway 26 and County Road B, Main St & Oak Ave)
  const intersectionPattern = /\b((?:Highway|Hwy|County Road|State Road|CTH|STH|[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd))\s+[A-Z0-9]{1,3})\s+(?:and|&|at)\s+((?:Highway|Hwy|County Road|State Road|CTH|STH|[A-Z][a-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd))\s+[A-Z0-9]{1,3})\b/gi;
  const intersectionMatches = text.matchAll(intersectionPattern);
  for (const match of intersectionMatches) {
    addresses.push(`${match[1]} and ${match[2]}`);
  }

  return addresses;
}

/**
 * Extract landmarks and locations from text
 * Matches patterns like "near Walmart" or "at the high school"
 */
function extractLandmarks(text) {
  if (!text) return [];

  const landmarks = [];
  const lowerText = text.toLowerCase();

  // Common landmarks and their search patterns
  const landmarkPatterns = [
    /(?:near|at|by|at the)\s+(walmart|target|pick n save|festival foods|kwik trip|speedway|shell|mobil|bp gas|mcdonald's|culver's|hospital|school|park|library|fire station|police station)/gi,
  ];

  for (const pattern of landmarkPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      landmarks.push(match[0]);
    }
  }

  return landmarks;
}

/**
 * Extract city name from text with better matching
 */
function extractCity(text) {
  if (!text) return null;

  const lowerText = text.toLowerCase();

  // Try to find city names with context (e.g., "in Jefferson" or "Jefferson, WI")
  // Sort cities by length (longest first) to match "Fort Atkinson" before "Fort"
  const sortedCities = Object.entries(CITY_COORDINATES).sort((a, b) => b[0].length - a[0].length);

  for (const [city, coords] of sortedCities) {
    // Look for city name with word boundaries to avoid partial matches
    const cityPattern = new RegExp(`\\b${city}\\b`, 'i');
    if (cityPattern.test(lowerText)) {
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
 * Get coordinates from text (uses smart parsing and geocoding)
 * Tries multiple strategies in order:
 * 1. Extract and geocode specific addresses
 * 2. Extract and geocode landmarks
 * 3. Match city names
 * 4. Fall back to default location
 */
async function getCoordinates(text, address = null) {
  if (!text) {
    text = '';
  }

  console.log(`🔍 Geocoding text: "${text.substring(0, 100)}..."`);

  // Strategy 1: Try to extract and geocode specific street addresses
  const addresses = extractAddresses(text);
  if (addresses.length > 0) {
    console.log(`  📍 Found addresses: ${addresses.join(', ')}`);

    for (const addr of addresses) {
      // Extract city from the same text for better geocoding context
      const cityMatch = extractCity(text);
      const cityContext = cityMatch ? cityMatch.city : 'Wisconsin';

      const geocoded = await geocodeAddress(`${addr}, ${cityContext}`);
      if (geocoded) {
        console.log(`  ✅ Geocoded "${addr}" to ${geocoded.lat}, ${geocoded.lon}`);
        return {
          ...geocoded,
          city: cityContext,
          address: addr
        };
      }

      // Add small delay to respect Nominatim rate limits (max 1 req/sec)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Strategy 2: Try to extract and geocode landmarks
  const landmarks = extractLandmarks(text);
  if (landmarks.length > 0) {
    console.log(`  🏢 Found landmarks: ${landmarks.join(', ')}`);

    for (const landmark of landmarks) {
      const cityMatch = extractCity(text);
      const cityContext = cityMatch ? cityMatch.city : 'Wisconsin';

      const geocoded = await geocodeAddress(`${landmark}, ${cityContext}`);
      if (geocoded) {
        console.log(`  ✅ Geocoded landmark "${landmark}" to ${geocoded.lat}, ${geocoded.lon}`);
        return {
          ...geocoded,
          city: cityContext,
          landmark
        };
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Strategy 3: Try to match city names from our database
  const cityMatch = extractCity(text);
  if (cityMatch) {
    console.log(`  ✅ Matched city "${cityMatch.city}"`);
    return {
      lat: cityMatch.lat,
      lon: cityMatch.lon,
      source: 'city_match',
      city: cityMatch.city
    };
  }

  // Strategy 4: Try geocoding if explicit address provided
  if (address) {
    console.log(`  📍 Trying explicit address: ${address}`);
    const geocoded = await geocodeAddress(address);
    if (geocoded) {
      console.log(`  ✅ Geocoded explicit address to ${geocoded.lat}, ${geocoded.lon}`);
      return geocoded;
    }
  }

  // Strategy 5: Default to Jefferson (since most scanner reports are from Jefferson County)
  console.log(`  ⚠️  No location found, defaulting to Jefferson`);
  return {
    lat: 43.0056,
    lon: -88.8073,
    source: 'default',
    city: 'jefferson'
  };
}

module.exports = {
  geocodeAddress,
  getCoordinates,
  extractCity,
  extractAddresses,
  extractLandmarks,
  isInBounds,
  CITY_COORDINATES,
  BOUNDS
};

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/flights.json');

// Southeastern Wisconsin bounds
const BOUNDS = {
  latMin: 42.5,
  latMax: 43.5,
  lonMin: -89.0,
  lonMax: -87.8
};

// Aircraft types of interest (military, medical, law enforcement)
const INTERESTING_AIRCRAFT = [
  'H60',  // Blackhawk helicopters
  'C130', // Military transport
  'EC35', // Eurocopter (medical/police)
  'AS35', // Airbus helicopters (medical/police)
  'B06',  // Bell 206 (police/medical)
  'B407', // Bell 407 (police/medical)
  'B412', // Bell 412 (police/medical)
  'EC45', // Eurocopter (medical/police)
  'BK17'  // BK-117 (medical)
];

// Known interesting registration numbers (law enforcement, medical, etc.)
const INTERESTING_REGISTRATIONS = [
  'N911', // Common police prefix
  'N1',   // Medical/life flight prefix
  'LIFE', // Life flight
  'MED',  // Medical
  'POL'   // Police
];

/**
 * Check if an aircraft is interesting based on type or registration
 */
function isInterestingAircraft(aircraft) {
  if (!aircraft) return false;

  const model = (aircraft.model || '').toUpperCase();
  const registration = (aircraft.registration || '').toUpperCase();

  // Check aircraft type
  if (INTERESTING_AIRCRAFT.some(type => model.includes(type))) {
    return true;
  }

  // Check registration
  if (INTERESTING_REGISTRATIONS.some(prefix => registration.includes(prefix))) {
    return true;
  }

  // Check if it's a helicopter
  if (model.includes('H') || model.includes('HELI') || model.includes('EC')) {
    return true;
  }

  // Check altitude (very low flying might be interesting)
  if (aircraft.altitude && aircraft.altitude < 2000) {
    return true;
  }

  return false;
}

/**
 * Fetch flights using FlightRadar24 API
 * Note: This requires an API key. Alternative: use ADS-B Exchange or OpenSky Network
 */
async function fetchFlightsFlightRadar24() {
  const apiKey = process.env.FLIGHTRADAR24_API_KEY;

  if (!apiKey) {
    console.log('FlightRadar24 API key not configured, skipping...');
    return [];
  }

  try {
    const response = await axios.get('https://api.flightradar24.com/api/live/flight-positions/full', {
      params: {
        bounds: `${BOUNDS.latMax},${BOUNDS.latMin},${BOUNDS.lonMin},${BOUNDS.lonMax}`,
        faa: 1,
        satellite: 1,
        mlat: 1,
        flarm: 1,
        adsb: 1
      },
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    return response.data || [];
  } catch (error) {
    console.error('Error fetching from FlightRadar24:', error.message);
    return [];
  }
}

/**
 * Fetch flights using OpenSky Network (free alternative)
 */
async function fetchFlightsOpenSky() {
  try {
    console.log('Fetching flights from OpenSky Network...');

    const response = await axios.get('https://opensky-network.org/api/states/all', {
      params: {
        lamin: BOUNDS.latMin,
        lamax: BOUNDS.latMax,
        lomin: BOUNDS.lonMin,
        lomax: BOUNDS.lonMax
      },
      timeout: 10000
    });

    if (!response.data || !response.data.states) {
      return [];
    }

    const flights = response.data.states.map(state => {
      // OpenSky state vector format:
      // [0] icao24, [1] callsign, [5] longitude, [6] latitude,
      // [7] baro_altitude, [9] velocity, [10] heading, [11] vertical_rate
      return {
        icao24: state[0],
        callsign: (state[1] || '').trim(),
        lon: state[5],
        lat: state[6],
        altitude: state[7] ? Math.round(state[7] * 3.28084) : null, // meters to feet
        velocity: state[9] ? Math.round(state[9] * 1.94384) : null, // m/s to knots
        heading: state[10],
        verticalRate: state[11],
        onGround: state[8],
        timestamp: state[3]
      };
    }).filter(flight => flight.lat && flight.lon);

    console.log(`Found ${flights.length} flights in area`);

    // Filter to interesting aircraft
    const interesting = flights.filter(flight =>
      isInterestingAircraft(flight) || !flight.onGround
    );

    console.log(`${interesting.length} interesting flights identified`);
    return interesting;
  } catch (error) {
    console.error('Error fetching from OpenSky:', error.message);
    return [];
  }
}

/**
 * Fetch and cache flight data
 */
async function fetchAndCache() {
  try {
    // Try FlightRadar24 first, fall back to OpenSky
    let flights = await fetchFlightsFlightRadar24();

    if (flights.length === 0) {
      flights = await fetchFlightsOpenSky();
    }

    // Ensure data directory exists
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });

    // Add metadata
    const flightData = {
      flights,
      count: flights.length,
      lastUpdate: new Date().toISOString()
    };

    // Save to file
    await fs.writeFile(DATA_FILE, JSON.stringify(flightData, null, 2));

    console.log(`Cached ${flights.length} flights`);
    return flights;
  } catch (error) {
    console.error('Error fetching and caching flights:', error);
    return [];
  }
}

/**
 * Get cached tracked flights
 */
async function getTrackedFlights() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const flightData = JSON.parse(data);
    return flightData.flights || [];
  } catch (error) {
    console.log('No cached flight data, fetching fresh...');
    return await fetchAndCache();
  }
}

module.exports = {
  fetchAndCache,
  getTrackedFlights
};

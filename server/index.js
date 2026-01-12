const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const newsService = require('./services/newsService');
const weatherService = require('./services/weatherService');
const flightsService = require('./services/flightsService');
const scannerService = require('./services/scannerService');
const trafficService = require('./services/trafficService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/incidents', async (req, res) => {
  try {
    const news = await newsService.getIncidents();
    const weather = await weatherService.getAlerts();
    const scanner = await scannerService.getIncidents();
    const traffic = await trafficService.getIncidents();

    const allIncidents = [
      ...news.map(item => ({ ...item, type: 'news' })),
      ...weather.map(item => ({ ...item, type: 'weather' })),
      ...scanner.map(item => ({ ...item, type: 'scanner' })),
      ...traffic.map(item => ({ ...item, type: 'traffic' }))
    ];

    res.json(allIncidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

app.get('/api/flights', async (req, res) => {
  try {
    const flights = await flightsService.getTrackedFlights();
    res.json(flights);
  } catch (error) {
    console.error('Error fetching flights:', error);
    res.status(500).json({ error: 'Failed to fetch flights' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Schedule data fetching jobs
const NEWS_INTERVAL = process.env.NEWS_REFRESH_INTERVAL || 15;
const WEATHER_INTERVAL = process.env.WEATHER_REFRESH_INTERVAL || 30;
const FLIGHTS_INTERVAL = process.env.FLIGHTS_REFRESH_INTERVAL || 5;
const SCANNER_INTERVAL = process.env.SCANNER_REFRESH_INTERVAL || 10;
const TRAFFIC_INTERVAL = process.env.TRAFFIC_REFRESH_INTERVAL || 10;

console.log('Setting up scheduled jobs...');

// Fetch news every N minutes
cron.schedule(`*/${NEWS_INTERVAL} * * * *`, async () => {
  console.log('Fetching news updates...');
  await newsService.fetchAndCache();
});

// Fetch weather every N minutes
cron.schedule(`*/${WEATHER_INTERVAL} * * * *`, async () => {
  console.log('Fetching weather updates...');
  await weatherService.fetchAndCache();
});

// Fetch flights every N minutes
cron.schedule(`*/${FLIGHTS_INTERVAL} * * * *`, async () => {
  console.log('Fetching flight updates...');
  await flightsService.fetchAndCache();
});

// Fetch scanner updates every N minutes
cron.schedule(`*/${SCANNER_INTERVAL} * * * *`, async () => {
  console.log('Fetching scanner updates...');
  await scannerService.fetchAndCache();
});

// Fetch traffic updates every N minutes
cron.schedule(`*/${TRAFFIC_INTERVAL} * * * *`, async () => {
  console.log('Fetching traffic updates...');
  await trafficService.fetchAndCache();
});

// Initial data fetch on startup
(async () => {
  console.log('Performing initial data fetch...');
  try {
    await Promise.all([
      newsService.fetchAndCache(),
      weatherService.fetchAndCache(),
      flightsService.fetchAndCache(),
      scannerService.fetchAndCache(),
      trafficService.fetchAndCache()
    ]);
    console.log('Initial data fetch complete');
  } catch (error) {
    console.error('Error during initial data fetch:', error);
  }
})();

app.listen(PORT, () => {
  console.log(`Wisconsin Situation Watch server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the map`);
});

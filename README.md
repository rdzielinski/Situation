# 🧀 Wisconsin Situation Watch

A real-time situation awareness platform for southeastern Wisconsin, aggregating data from local news sources, weather alerts, flight tracking, and emergency scanner feeds.

![Wisconsin Situation Watch](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Real-time Map Display** - Interactive map showing all incidents and alerts
- **Local News Aggregation** - Pulls breaking news from Milwaukee area sources
- **Weather Alerts** - National Weather Service alerts and warnings
- **Flight Tracking** - Tracks aircraft over southeastern Wisconsin using OpenSky Network
- **Scanner Feeds** - Jefferson County Scanner updates from Facebook
- **Auto-refresh** - Automatically updates data every 5-15 minutes
- **Dark Theme** - Easy-on-the-eyes dark interface

## Geographic Coverage

Southeastern Wisconsin including:
- Milwaukee County
- Waukesha County
- Racine County
- Kenosha County
- Ozaukee County
- Washington County
- Jefferson County
- Walworth County

## Tech Stack

### Backend
- Node.js + Express
- Axios for HTTP requests
- Cheerio for web scraping
- RSS Parser for scanner feeds
- node-cron for scheduled tasks

### Frontend
- Vanilla JavaScript
- Leaflet.js for maps
- OpenStreetMap tiles (dark theme)

### Data Sources
- **News**: Milwaukee Journal Sentinel, Fox6, TMJ4, WISN
- **Weather**: National Weather Service API (free, no auth required)
- **Flights**: OpenSky Network API (free tier, no auth required)
- **Scanner**: Jefferson County Scanner via RSS feed (✅ pre-configured!)

## Installation

### Prerequisites
- Node.js 16+ and npm
- Internet connection for API access

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Situation.git
   cd Situation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   ```env
   PORT=3000

   # Optional: FlightRadar24 API key for enhanced flight tracking
   FLIGHTRADAR24_API_KEY=your_api_key_here

   # Optional: Facebook access token for scanner updates
   FACEBOOK_ACCESS_TOKEN=your_token_here

   # Data refresh intervals (in minutes)
   NEWS_REFRESH_INTERVAL=15
   WEATHER_REFRESH_INTERVAL=30
   FLIGHTS_REFRESH_INTERVAL=5
   SCANNER_REFRESH_INTERVAL=10
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Development Mode

For development with auto-restart on file changes:

```bash
npm run dev
```

## API Endpoints

### GET /api/incidents
Returns all incidents (news, weather, scanner)

```json
[
  {
    "title": "Structure Fire on Main Street",
    "description": "Fire department responding...",
    "type": "news",
    "lat": 43.0389,
    "lon": -87.9065,
    "location": "Milwaukee",
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

### GET /api/flights
Returns tracked flights over the area

```json
[
  {
    "icao24": "a12345",
    "callsign": "UAL123",
    "lat": 43.05,
    "lon": -88.01,
    "altitude": 15000,
    "velocity": 450,
    "heading": 270
  }
]
```

### GET /api/health
Health check endpoint

## Configuration

### Custom Data Sources

To add additional news sources, edit `server/services/newsService.js`:

```javascript
const NEWS_SOURCES = [
  {
    name: 'Your News Source',
    url: 'https://example.com/news',
    type: 'web'
  }
];
```

### Adjusting Geographic Bounds

Edit `.env` to change the coverage area:

```env
LATITUDE_MIN=42.5
LATITUDE_MAX=43.5
LONGITUDE_MIN=-89.0
LONGITUDE_MAX=-87.8
```

### Filter Keywords

Customize incident detection keywords in `server/services/newsService.js`:

```javascript
const INCIDENT_KEYWORDS = [
  'fire', 'crash', 'accident', 'police', 'shooting'
  // Add your keywords
];
```

## Project Structure

```
Situation/
├── server/
│   ├── index.js              # Main server file
│   ├── services/
│   │   ├── newsService.js    # News aggregation
│   │   ├── weatherService.js # Weather alerts
│   │   ├── flightsService.js # Flight tracking
│   │   └── scannerService.js # Scanner feeds
│   └── utils/
│       └── geocode.js        # Geocoding utilities
├── public/
│   ├── index.html            # Frontend HTML
│   ├── styles.css            # Styles
│   └── app.js                # Frontend JavaScript
├── data/                     # Cached data (auto-generated)
├── .env.example              # Environment template
├── package.json
└── README.md
```

## Data Sources & APIs

### OpenSky Network
- **Free tier**: No API key required
- **Rate limit**: 100 requests per day for anonymous users
- **Documentation**: https://opensky-network.org/apidoc/

### National Weather Service
- **Free**: No API key required
- **Documentation**: https://www.weather.gov/documentation/services-web-api

### Scanner Data Sources

✅ **RSS Feed (CONFIGURED & WORKING!)**
- Jefferson County Scanner feed is already configured
- Uses RSS.app to pull Facebook posts: `https://rss.app/feeds/F2oLkuuCprXqkL9R.xml`
- Updates automatically every 10 minutes
- No API key or authentication required!

⚠️ **Facebook API Limitation**: Direct Facebook API requires page admin access (not possible for public pages)

**Additional Alternative Sources:**

1. **Twitter/X API**
   - Check if Jefferson County Scanner has a Twitter account
   - Free tier: https://developer.twitter.com
   - Add `TWITTER_HANDLE` and `TWITTER_BEARER_TOKEN` to `.env`

2. **Broadcastify** (Best for live scanner audio)
   - Listen to live feeds: https://www.broadcastify.com/
   - Jefferson County: https://www.broadcastify.com/listen/ctid/2625

3. **Create Your Own RSS Feeds**
   - Use RSS.app or RSS.Box to create RSS feeds from any Facebook page
   - Free tier available
   - Add custom feeds to `FACEBOOK_RSS_URL` in `.env`

### FlightRadar24 (Optional)
For enhanced flight tracking:
1. Sign up at https://www.flightradar24.com
2. Purchase API access
3. Add API key to `.env`

## Troubleshooting

### No incidents showing
- Check that services are running: `npm start`
- Verify internet connection
- Check console for errors: open browser DevTools (F12)

### Weather alerts not loading
- NWS API may be temporarily down
- Check https://api.weather.gov/alerts/active?area=WI
- Wait 30 minutes for next refresh

### Flights not appearing
- OpenSky Network has rate limits
- Free tier may have delays
- Consider upgrading to authenticated access

### Scanner data not showing / Facebook not working
- **This is expected** - Facebook API requires page admin access
- App uses mock data by default (this is normal!)
- Check if they have a Twitter account instead
- Consider using Broadcastify or other scanner sources
- Mock data updates automatically to simulate real incidents

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Future Enhancements

- [ ] Twitter/X integration for additional scanner feeds
- [ ] Broadcastify audio streams
- [ ] Historical incident database
- [ ] Mobile app version
- [ ] Email/SMS alerts for specific incidents
- [ ] User-submitted reports
- [ ] Heatmap visualization
- [ ] Traffic layer integration

## License

MIT License - See LICENSE file for details

## Disclaimer

This application aggregates publicly available information for situational awareness purposes. Always verify critical information with official sources.

- Weather alerts: https://weather.gov
- Emergency information: Call 911
- Traffic updates: https://511wi.gov

## Credits

- Map tiles by [CARTO](https://carto.com/)
- Flight data from [OpenSky Network](https://opensky-network.org/)
- Weather data from [National Weather Service](https://weather.gov)
- Built with [Leaflet.js](https://leafletjs.com/)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing issues for solutions

---

Made with ❤️ for Wisconsin

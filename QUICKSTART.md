# 🚀 Quick Start Guide

Get your Wisconsin Situation Watch up and running in 3 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

This installs all required packages including:
- Express (web server)
- RSS Parser (for Jefferson County Scanner feed)
- Leaflet (maps)
- Axios, Cheerio (data fetching)

## Step 2: Start the Server

```bash
npm start
```

You should see:
```
✅ Wisconsin Situation Watch is running
🌐 Server: http://localhost:3000
🔄 Data refresh intervals:
   - News: every 15 minutes
   - Weather: every 30 minutes
   - Flights: every 5 minutes
   - Scanner: every 10 minutes
```

## Step 3: Open Your Browser

Navigate to: **http://localhost:3000**

You should see:
- 🗺️ Interactive dark-themed map centered on Milwaukee
- 📍 Markers showing incidents from various sources
- 📋 Sidebar with filterable incident list
- 📊 Header stats showing active incidents

## What You'll See Immediately

### ✅ Working Out of the Box:

1. **Scanner Data** - Real posts from Jefferson County Scanner Facebook page via RSS feed
2. **Weather Alerts** - Live alerts from National Weather Service
3. **Flight Tracking** - Aircraft over southeastern Wisconsin from OpenSky Network
4. **Local News** - Breaking news from Milwaukee-area sources

### 🎯 No API Keys Needed!

All data sources work without authentication:
- RSS feed is pre-configured ✅
- Weather API is free ✅
- Flight data uses free tier ✅
- News scraping requires no auth ✅

## Testing the RSS Feed

Run this command to test the Jefferson County Scanner RSS feed:

```bash
node test-rss.js
```

You should see recent scanner posts with:
- Post titles
- Timestamps
- Content previews
- Direct links to Facebook

## Verifying Data Sources

### Check Scanner Data
```bash
# After the server runs for a minute, check cached data:
cat data/scanner.json
```

You should see real scanner incidents parsed from the RSS feed!

### Check Weather Data
```bash
cat data/weather.json
```

### Check All Incidents via API
```bash
curl http://localhost:3000/api/incidents | python3 -m json.tool
```

### Check Flights via API
```bash
curl http://localhost:3000/api/flights | python3 -m json.tool
```

## Using the Map Interface

1. **Click on markers** - View incident details in popup
2. **Click incidents in sidebar** - Auto-zoom to location on map
3. **Use filters** - Toggle News/Weather/Scanner/Flights on/off
4. **Click Refresh** - Manually refresh all data sources

### Filter Buttons
- 🔵 **News** - Local breaking news (blue markers)
- 🟠 **Weather** - NWS alerts and warnings (orange markers)
- 🔴 **Scanner** - Emergency scanner reports (red markers)
- 🟢 **Flights** - Tracked aircraft (green markers)

## Troubleshooting

### Server won't start?
```bash
# Check if port 3000 is already in use
lsof -i :3000

# Kill the process if needed
kill -9 <PID>

# Or use a different port
PORT=3001 npm start
```

### No scanner data showing?
- Wait 10 minutes for first data fetch
- Check console logs for RSS feed status
- Verify .env has `FACEBOOK_RSS_URL` set
- Run `node test-rss.js` to verify RSS feed

### No weather alerts?
- Weather alerts only show when active
- Try manually checking: https://api.weather.gov/alerts/active?area=WI
- Wisconsin might have no active alerts (that's good!)

### No flights showing?
- OpenSky Network has rate limits
- Flights only show when actually over the area
- Wait a few minutes and refresh

## Development Mode

For auto-restart on file changes:

```bash
npm run dev
```

This uses nodemon to watch for file changes and automatically restart the server.

## Customization

### Change Geographic Bounds

Edit `.env` to adjust coverage area:
```env
LATITUDE_MIN=42.5    # South boundary
LATITUDE_MAX=43.5    # North boundary
LONGITUDE_MIN=-89.0  # West boundary
LONGITUDE_MAX=-87.8  # East boundary
```

### Add More RSS Feeds

Create additional RSS feeds at https://rss.app and add them to `.env`:
```env
FACEBOOK_RSS_URL=https://rss.app/feeds/YOUR_FEED.xml
```

You can also modify `scannerService.js` to pull from multiple RSS feeds!

### Adjust Refresh Intervals

Edit `.env`:
```env
NEWS_REFRESH_INTERVAL=10      # Faster news updates
WEATHER_REFRESH_INTERVAL=60   # Less frequent weather checks
FLIGHTS_REFRESH_INTERVAL=3    # More frequent flight updates
SCANNER_REFRESH_INTERVAL=5    # Faster scanner updates
```

## Next Steps

1. ✅ **Monitor in Real-Time** - Leave it running and watch incidents appear
2. 🎨 **Customize Styling** - Edit `public/styles.css` for different colors/themes
3. 📱 **Mobile Access** - Access from phone using your computer's IP (e.g., http://192.168.1.100:3000)
4. 🔧 **Add Features** - See README.md for enhancement ideas
5. 🌐 **Deploy Online** - Host on Heroku, Railway, or DigitalOcean

## Need Help?

- Check the main **README.md** for detailed documentation
- Review server logs in the terminal
- Open browser DevTools (F12) to check for JavaScript errors
- Verify API endpoints: http://localhost:3000/api/health

## Success Checklist

- ✅ Dependencies installed (`node_modules/` folder exists)
- ✅ Server starts without errors
- ✅ Map loads in browser
- ✅ Sidebar shows incidents
- ✅ Can click and interact with markers
- ✅ Filters work to show/hide incident types
- ✅ RSS test shows recent scanner posts
- ✅ Data files created in `data/` folder

If all checked, you're good to go! 🎉

---

**Made with ❤️ for Wisconsin**

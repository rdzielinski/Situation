// Wisconsin Situation Watch - Main Application

let map;
let markers = [];
let allIncidents = [];
let allFlights = [];
let timeFilterHours = 1; // Default to last 1 hour
let radarLayer = null;

// Initialize map centered on Milwaukee
const CENTER_LAT = 43.0389;
const CENTER_LON = -87.9065;
const ZOOM_LEVEL = 10;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initEventListeners();
    fetchData();

    // Auto-refresh every 5 minutes
    setInterval(fetchData, 5 * 60 * 1000);
});

/**
 * Initialize the Leaflet map
 */
function initMap() {
    // Create map
    map = L.map('map').setView([CENTER_LAT, CENTER_LON], ZOOM_LEVEL);

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Add scale
    L.control.scale().addTo(map);
}

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', fetchData);

    // Type filter checkboxes
    document.getElementById('filter-news').addEventListener('change', updateDisplay);
    document.getElementById('filter-weather').addEventListener('change', updateDisplay);
    document.getElementById('filter-scanner').addEventListener('change', updateDisplay);
    document.getElementById('filter-traffic').addEventListener('change', updateDisplay);
    document.getElementById('filter-flights').addEventListener('change', updateDisplay);

    // Time filter buttons
    document.querySelectorAll('.time-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const hours = e.target.dataset.hours;
            timeFilterHours = hours === 'all' ? 'all' : parseInt(hours);
            updateDisplay();
        });
    });

    // Notifications button
    const notificationBtn = document.getElementById('enable-notifications');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', requestNotificationPermission);
        updateNotificationButtonState();
    }
}

/**
 * Fetch data from API
 */
async function fetchData() {
    console.log('Fetching data...');

    try {
        // Fetch incidents and flights in parallel
        const [incidentsRes, flightsRes] = await Promise.all([
            fetch('/api/incidents'),
            fetch('/api/flights')
        ]);

        if (incidentsRes.ok) {
            allIncidents = await incidentsRes.json();
            console.log(`Loaded ${allIncidents.length} incidents`);
        }

        if (flightsRes.ok) {
            allFlights = await flightsRes.json();
            console.log(`Loaded ${allFlights.length} flights`);
        }

        updateDisplay();
        updateLastUpdate();
        updateStats();
        checkForNewIncidents();

    } catch (error) {
        console.error('Error fetching data:', error);
        showError('Failed to fetch data. Retrying...');
        setTimeout(fetchData, 30000); // Retry after 30 seconds
    }
}

/**
 * Update the display based on current filters
 */
function updateDisplay() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Get filter states
    const showNews = document.getElementById('filter-news').checked;
    const showWeather = document.getElementById('filter-weather').checked;
    const showScanner = document.getElementById('filter-scanner').checked;
    const showTraffic = document.getElementById('filter-traffic').checked;
    const showFlights = document.getElementById('filter-flights').checked;

    // Calculate time threshold
    const now = Date.now();
    const timeThreshold = timeFilterHours === 'all' ? 0 : now - (timeFilterHours * 60 * 60 * 1000);

    // Filter incidents by type and time
    const filteredIncidents = allIncidents.filter(incident => {
        // Type filter
        if (incident.type === 'news' && !showNews) return false;
        if (incident.type === 'weather' && !showWeather) return false;
        if (incident.type === 'scanner' && !showScanner) return false;
        if (incident.type === 'traffic' && !showTraffic) return false;

        // Time filter (skip for weather alerts which don't have typical timestamps)
        if (timeFilterHours !== 'all' && incident.timestamp) {
            const incidentTime = new Date(incident.timestamp).getTime();
            if (incidentTime < timeThreshold) return false;
        }

        return true;
    });

    // Add incident markers
    filteredIncidents.forEach(incident => {
        addIncidentMarker(incident);
    });

    // Add flight markers
    if (showFlights) {
        allFlights.forEach(flight => {
            addFlightMarker(flight);
        });
    }

    // Update sidebar
    displayIncidentList(filteredIncidents);
}

/**
 * Add an incident marker to the map
 */
function addIncidentMarker(incident) {
    if (!incident.lat || !incident.lon) return;

    const icon = L.divIcon({
        className: `marker-icon ${incident.type}`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
        html: getMarkerIcon(incident.type)
    });

    const marker = L.marker([incident.lat, incident.lon], { icon })
        .bindPopup(createIncidentPopup(incident))
        .addTo(map);

    markers.push(marker);
}

/**
 * Add a flight marker to the map
 */
function addFlightMarker(flight) {
    if (!flight.lat || !flight.lon) return;

    const icon = L.divIcon({
        className: 'marker-icon flight',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
        html: '✈️'
    });

    const marker = L.marker([flight.lat, flight.lon], { icon })
        .bindPopup(createFlightPopup(flight))
        .addTo(map);

    markers.push(marker);
}

/**
 * Get marker icon based on type
 */
function getMarkerIcon(type) {
    const icons = {
        news: '📰',
        weather: '⚠️',
        scanner: '🚨',
        flight: '✈️'
    };
    return icons[type] || '📍';
}

/**
 * Create popup content for incident
 */
function createIncidentPopup(incident) {
    return `
        <div style="min-width: 200px;">
            <h3 style="margin-bottom: 0.5rem; color: #ff4444;">${incident.title}</h3>
            <p style="margin-bottom: 0.5rem;">${incident.description || 'No description available'}</p>
            <p style="font-size: 0.8rem; color: #999;">
                ${incident.location || 'Unknown location'}<br>
                ${formatTime(incident.timestamp)}
            </p>
            ${incident.link ? `<a href="${incident.link}" target="_blank" style="color: #4169e1;">View Source</a>` : ''}
        </div>
    `;
}

/**
 * Create popup content for flight
 */
function createFlightPopup(flight) {
    return `
        <div style="min-width: 200px;">
            <h3 style="margin-bottom: 0.5rem; color: #32cd32;">
                ${flight.callsign || 'Unknown Flight'}
            </h3>
            <p style="font-size: 0.9rem;">
                <strong>ICAO24:</strong> ${flight.icao24 || 'N/A'}<br>
                <strong>Altitude:</strong> ${flight.altitude ? `${flight.altitude} ft` : 'N/A'}<br>
                <strong>Speed:</strong> ${flight.velocity ? `${flight.velocity} kts` : 'N/A'}<br>
                <strong>Heading:</strong> ${flight.heading ? `${Math.round(flight.heading)}°` : 'N/A'}
            </p>
            <p style="font-size: 0.8rem; color: #999;">
                ${formatTime(flight.timestamp)}
            </p>
        </div>
    `;
}

/**
 * Display incident list in sidebar
 */
function displayIncidentList(incidents) {
    const listElement = document.getElementById('incident-list');

    if (incidents.length === 0) {
        listElement.innerHTML = '<div class="loading">No incidents to display</div>';
        return;
    }

    // Sort by timestamp (newest first)
    incidents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    listElement.innerHTML = incidents.map(incident => `
        <div class="incident-item ${incident.type}" onclick="focusIncident(${incident.lat}, ${incident.lon})">
            <div class="incident-header">
                <div class="incident-title">${incident.title}</div>
                <span class="incident-badge ${incident.type}">${incident.type}</span>
            </div>
            <div class="incident-description">${incident.description || 'No description available'}</div>
            <div class="incident-meta">
                <span>${incident.location || 'Unknown location'}</span>
                <span>${formatTime(incident.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Focus on an incident on the map
 */
function focusIncident(lat, lon) {
    map.setView([lat, lon], 14, { animate: true });
}

/**
 * Update statistics in header
 */
function updateStats() {
    const newsCount = allIncidents.filter(i => i.type === 'news').length;
    const weatherCount = allIncidents.filter(i => i.type === 'weather').length;
    const scannerCount = allIncidents.filter(i => i.type === 'scanner').length;
    const trafficCount = allIncidents.filter(i => i.type === 'traffic').length;
    const flightsCount = allFlights.length;

    document.getElementById('news-count').textContent = newsCount;
    document.getElementById('weather-count').textContent = weatherCount;
    document.getElementById('scanner-count').textContent = scannerCount;
    document.getElementById('traffic-count').textContent = trafficCount;
    document.getElementById('flights-count').textContent = flightsCount;
}

/**
 * Update last update timestamp
 */
function updateLastUpdate() {
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleString();
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp) {
    if (!timestamp) return 'Unknown time';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    // More than 24 hours
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Show error message
 */
function showError(message) {
    const listElement = document.getElementById('incident-list');
    listElement.innerHTML = `<div class="loading" style="color: #ff4444;">${message}</div>`;
}

/**
 * Browser Notifications
 */
let lastIncidentCount = 0;

async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        alert('This browser does not support desktop notifications');
        return;
    }

    const permission = await Notification.requestPermission();
    updateNotificationButtonState();

    if (permission === 'granted') {
        showNotification('Notifications Enabled', 'You will now receive alerts for new incidents');
    }
}

function updateNotificationButtonState() {
    const btn = document.getElementById('enable-notifications');
    if (!btn) return;

    if (!('Notification' in window)) {
        btn.textContent = '🔕 Not Supported';
        btn.disabled = true;
        return;
    }

    if (Notification.permission === 'granted') {
        btn.textContent = '🔔 Notifications On';
        btn.classList.add('enabled');
        btn.disabled = false;
    } else if (Notification.permission === 'denied') {
        btn.textContent = '🔕 Notifications Blocked';
        btn.disabled = true;
    } else {
        btn.textContent = '🔔 Enable Notifications';
        btn.classList.remove('enabled');
        btn.disabled = false;
    }
}

function showNotification(title, body, data = {}) {
    if (Notification.permission !== 'granted') return;

    const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: data.id || 'wisconsin-situation-watch',
        requireInteraction: false,
        ...data
    });

    notification.onclick = () => {
        window.focus();
        if (data.lat && data.lon) {
            map.setView([data.lat, data.lon], 14);
        }
        notification.close();
    };
}

function checkForNewIncidents() {
    if (Notification.permission !== 'granted') return;

    const currentCount = allIncidents.length;

    if (lastIncidentCount > 0 && currentCount > lastIncidentCount) {
        const newCount = currentCount - lastIncidentCount;
        const latestIncident = allIncidents[0]; // Assuming sorted by newest

        showNotification(
            newCount + ' New Incident' + (newCount > 1 ? 's' : ''),
            latestIncident.title + ' - ' + (latestIncident.location || 'Unknown location'),
            {
                lat: latestIncident.lat,
                lon: latestIncident.lon,
                id: latestIncident.id
            }
        );
    }

    lastIncidentCount = currentCount;
}

/**
 * Weather Radar Overlay
 */
function toggleWeatherRadar() {
    if (radarLayer) {
        map.removeLayer(radarLayer);
        radarLayer = null;
        return false;
    }

    // Add RainViewer radar overlay
    // RainViewer provides free weather radar tiles
    radarLayer = L.tileLayer('https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/2/1_1.png', {
        attribution: 'Weather data © <a href="https://rainviewer.com">RainViewer</a>',
        opacity: 0.6,
        zIndex: 500
    }).addTo(map);

    return true;
}

// Add radar toggle button to map
L.Control.RadarToggle = L.Control.extend({
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', 'radar-toggle-btn', container);

        button.innerHTML = '🌧️';
        button.href = '#';
        button.title = 'Toggle Weather Radar';
        button.style.cssText = 'font-size: 20px; width: 30px; height: 30px; line-height: 30px; text-align: center; text-decoration: none; background: white; display: block;';

        L.DomEvent.on(button, 'click', function(e) {
            L.DomEvent.preventDefault(e);
            const isActive = toggleWeatherRadar();
            button.style.background = isActive ? '#4169e1' : 'white';
            button.style.color = isActive ? 'white' : 'black';
        });

        return container;
    }
});

L.control.radarToggle = function(opts) {
    return new L.Control.RadarToggle(opts);
};

// Add radar control to map after initialization
setTimeout(() => {
    if (map) {
        L.control.radarToggle({ position: 'topright' }).addTo(map);
    }
}, 1000);

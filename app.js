document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const CONFIG = {
        weather: 'https://api.open-meteo.com/v1/forecast',
        geo: 'https://geocoding-api.open-meteo.com/v1/search',
        aqi: 'https://air-quality-api.open-meteo.com/v1/air-quality',
        archive: 'https://archive-api.open-meteo.com/v1/archive', // NEW for History
        iss: 'https://api.wheretheiss.at/v1/satellites/25544', // NEW for Cosmic
        marine: 'https://marine-api.open-meteo.com/v1/marine' // NEW for Step 7
    };



    // Initialize State with persistent Metric preference & Cache Key

    const CACHE_KEY = 'aether_last_weather';
    const STATE = {
        metric: localStorage.getItem('aether_units') !== 'false', // Default to true if null
        data: null,
        chart: null,
        timer: null,
        lightningTimer: null,
        animationId: null,
        lightningBolts: [],
        favorites: JSON.parse(localStorage.getItem('aether_favs_v12')) || ['London', 'Tokyo', 'New York'],
        timeOffset: 0, // Hours from "now"
        selectedDayIndex: 0, // 0 = Today, 1 = Tomorrow, etc.
        currentScanResults: [], // STORE SCAN RESULTS
        currentScanResults: [], // STORE SCAN RESULTS
        globe: null, // GLOBE INSTANCE
        isMapView: false,
        historyData: null, // NEW: Store history comparison
        issInterval: null, // NEW: Store ISS polling
        userLocation: null // NEW: Persist user location permission/coords
    };

    // Fallback Cities for Random Selection (Startup)
    const RANDOM_CITIES = [
        { name: "London", lat: 51.5074, lon: -0.1278 },
        { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
        { name: "New York", lat: 40.7128, lon: -74.0060 },
        { name: "Paris", lat: 48.8566, lon: 2.3522 },
        { name: "Singapore", lat: 1.3521, lon: 103.8198 },
        { name: "Sydney", lat: -33.8688, lon: 151.2093 },
        { name: "Dubai", lat: 25.2048, lon: 55.2708 },
        { name: "Reykjavik", lat: 64.1466, lon: -21.9426 }
    ];

    // --- SEGMENTED "SENTRY" DATABASE ---
    const CLIMATE_ZONES = {
        // High Latitude / High Altitude / Cold
        cryo: [
            { name: "McMurdo Stn, AQ", lat: -77.846, lon: 166.668 }, { name: "Yakutsk, RU", lat: 62.0355, lon: 129.6755 },
            { name: "Nuuk, GL", lat: 64.1814, lon: -51.6941 }, { name: "Svalbard, NO", lat: 78.2232, lon: 15.6267 },
            { name: "Anchorage, US", lat: 61.2181, lon: -149.9003 }, { name: "Harbin, CN", lat: 45.8038, lon: 126.5349 },
            { name: "Tromso, NO", lat: 69.6492, lon: 18.9553 }, { name: "Ushuaia, AR", lat: -54.8019, lon: -68.3030 },
            { name: "Yellowknife, CA", lat: 62.4540, lon: -114.3718 }, { name: "Oymyakon, RU", lat: 63.4641, lon: 142.1537 }
        ],
        // Tropical / Wet / Stormy
        tropical: [
            { name: "Singapore, SG", lat: 1.3521, lon: 103.8198 }, { name: "Manaus, BR", lat: -3.1190, lon: -60.0217 },
            { name: "Mumbai, IN", lat: 19.0760, lon: 72.8777 }, { name: "Jakarta, ID", lat: -6.2088, lon: 106.8456 },
            { name: "Kuala Lumpur, MY", lat: 3.1390, lon: 101.6869 }, { name: "Bangkok, TH", lat: 13.7563, lon: 100.5018 },
            { name: "Lagos, NG", lat: 6.5244, lon: 3.3792 }, { name: "Havana, CU", lat: 23.1136, lon: -82.3666 },
            { name: "Hilo, US", lat: 19.7297, lon: -155.0900 }, { name: "Fiji", lat: -17.7134, lon: 178.0650 }
        ],
        // Arid / Hot / Clear
        arid: [
            { name: "Dubai, AE", lat: 25.2048, lon: 55.2708 }, { name: "Cairo, EG", lat: 30.0444, lon: 31.2357 },
            { name: "Riyadh, SA", lat: 24.7136, lon: 46.6753 }, { name: "Death Valley, US", lat: 36.5323, lon: -116.9325 },
            { name: "Alice Springs, AU", lat: -23.6980, lon: 133.8807 }, { name: "Phoenix, US", lat: 33.4484, lon: -112.0740 },
            { name: "Timbuktu, ML", lat: 16.7666, lon: -3.0026 }, { name: "Las Vegas, US", lat: 36.1699, lon: -115.1398 },
            { name: "Kuwait City, KW", lat: 29.3759, lon: 47.9774 }, { name: "Baghdad, IQ", lat: 33.3152, lon: 44.3661 }
        ],
        // Variable / Temperate / Urban
        urban: [
            { name: "London, UK", lat: 51.5074, lon: -0.1278 }, { name: "New York, US", lat: 40.7128, lon: -74.0060 },
            { name: "Tokyo, JP", lat: 35.6762, lon: 139.6503 }, { name: "Paris, FR", lat: 48.8566, lon: 2.3522 },
            { name: "Sydney, AU", lat: -33.8688, lon: 151.2093 }, { name: "Cape Town, ZA", lat: -33.9249, lon: 18.4241 },
            { name: "Moscow, RU", lat: 55.7558, lon: 37.6173 }, { name: "Istanbul, TR", lat: 41.0082, lon: 28.9784 },
            { name: "Wellington, NZ", lat: -41.2866, lon: 174.7756 }, { name: "Seattle, US", lat: 47.6062, lon: -122.3321 }
        ]
    };

    // --- UI ELEMENTS ---
    const el = id => document.getElementById(id);
    const ui = {
        // Loading & Search
        dashboard: el('dashboard'), input: el('search-input'), suggestions: el('suggestions'), clearBtn: el('clear-btn'),
        gpsBtn: el('gps-btn'), refreshBtn: el('refresh-btn'), exploreBtn: el('explore-btn'), localBtn: el('local-btn'),
        btnC: el('btn-c'), btnF: el('btn-f'), unitPill: el('unit-pill'),
        micBtn: el('mic-btn'), // MIC BUTTON RE-ADDED
        favicon: el('dynamic-favicon'), statusDot: el('status-dot'), statusText: el('status-text'),
        // Explore Modal
        exploreModal: el('explore-modal'), closeExplore: el('close-explore'),
        exploreContent: el('explore-content'), exploreLoading: el('explore-loading'),
        exploreMap: el('explore-map'), // NEW
        mapBtn: el('map-btn'), // NEW BUTTON
        exploreTitle: el('explore-title'), exploreSubtitle: el('explore-subtitle'),
        rescanBtn: el('rescan-btn'), // NEW RESCAN BTN
        // Main Data
        city: el('city-name'), desc: el('weather-desc'), temp: el('temp-val'), feels: el('feels-val'),
        tempMax: el('temp-max'), tempMin: el('temp-min'), time: el('local-time'), date: el('local-date'), bgIcon: el('bg-icon'),
        favBtn: el('fav-btn'), favBar: el('fav-bar'),
        historyBadge: el('history-badge'), historyText: el('history-text'), // NEW: History UI
        // Metrics
        windVal: el('wind-val'), windIcon: el('wind-icon'), windDir: el('wind-dir'), windGusts: el('wind-gusts'),
        humidVal: el('humid-val'), dewVal: el('dew-val'), visVal: el('vis-val'), presVal: el('pres-val'),
        uvVal: el('uv-val'), uvBar: el('uv-bar'), aqiBadge: el('aqi-badge'),
        pm25: el('pm25-val'), no2: el('no2-val'), o3: el('o3-val'),
        // Assistant
        aiTitle: el('ai-title'), aiText: el('ai-text'), aiIcon: el('ai-icon'), aiTags: el('ai-tags'),
        gearText: el('gear-text'), gearMsg: el('gear-msg'),
        actRun: el('act-run'), actDrive: el('act-drive'), actOut: el('act-out'), actHealth: el('act-health'),
        // Survival & Logs
        riskCold: el('risk-cold'), riskWater: el('risk-water'),
        solarVal: el('solar-val'), solarBar: el('solar-bar'), survAdvice: el('survival-advice'),
        logFeed: el('ai-log-feed'),
        // Astro & Charts
        sunrise: el('sunrise-val'), sunset: el('sunset-val'), solarMarker: el('solar-marker'), markerSun: el('marker-sun'), markerMoon: el('marker-moon'),
        moonUI: el('moon-ui-container'), moonText: el('moon-text'),
        issLocation: el('iss-location'), issDistance: el('iss-distance'), issMarker: el('iss-marker'), // NEW: Cosmic UI
        forecast: el('forecast-list'), chartCanvas: el('chart-canvas'), radar: el('radar-frame'),
        // Visuals
        sky: el('sky-gradient'), starCanvas: el('star-canvas'), aurora: el('aurora-layer'), celestial: el('celestial-container'),
        cloudsBack: el('cloud-layer-back'), cloudsFront: el('cloud-layer-front'), mist: el('mist-layer'),
        precipCanvas: el('precip-canvas'), lightning: el('lightning'),
        // Chronosphere
        timeSlider: el('time-slider'), chronoLabel: el('chrono-label'), simBadge: el('sim-badge'), feedStatusLabel: el('feed-status-label'),
        sliderTooltip: el('slider-tooltip'), resetDayBtn: el('reset-day-btn'),
        // Dynamic Avatar Container (Will be found in init)
        avatarIcon: null
    };

    // Initialize UI based on persistent state
    if (!STATE.metric) { ui.unitPill.style.transform = 'translateX(100%)'; ui.btnC.style.color = '#6b7280'; ui.btnF.style.color = '#fff'; }



    function logAI(msg) {
        if (!ui.logFeed) return;
        const div = document.createElement('div');
        div.className = "border-l-2 border-cyan-500/30 pl-2 mb-1 opacity-80 hover:opacity-100 transition-opacity";
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        div.innerHTML = `<span class="text-cyan-600 font-bold mr-2">[${time}]</span> ${msg}`;
        ui.logFeed.prepend(div);
        if (ui.logFeed.children.length > 20) ui.logFeed.lastElementChild.remove();
    }

    function logAI(msg) {
        if (!ui.logFeed) return;
        const div = document.createElement('div');
        div.className = "border-l-2 border-cyan-500/30 pl-2 mb-1 opacity-80 hover:opacity-100 transition-opacity";
        const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        div.innerHTML = `<span class="text-cyan-600 font-bold mr-2">[${time}]</span> ${msg}`;
        ui.logFeed.prepend(div);
        if (ui.logFeed.children.length > 20) ui.logFeed.lastElementChild.remove();
    }

    // --- SURVIVAL LOGIC ---
    function updateSurvivalMetrics(temp, wind, cloud, isDay) {
        if (!ui.riskCold) return; // Safety check

        // 1. Wind Chill / Heat Index
        let riskText = "Stable";
        let riskColor = "text-green-400";

        // Convert to Celsius for calculation standard
        const tC = STATE.metric ? temp : (temp - 32) * 5 / 9;
        const wKm = wind;

        // Hypothermia Risk (Wind Chill)
        // Formula: 13.12 + 0.6215T - 11.37V^0.16 + 0.3965TV^0.16
        // Only valid if T < 10C and V > 4.8km/h
        let chill = tC;
        if (tC < 10 && wKm > 4.8) {
            chill = 13.12 + 0.6215 * tC - 11.37 * Math.pow(wKm, 0.16) + 0.3965 * tC * Math.pow(wKm, 0.16);
        }

        // Risk Calculation
        let coldRisk = 0; // 0-100%
        if (chill < 0) coldRisk = Math.min(100, Math.abs(chill) * 2);
        else if (chill < 10) coldRisk = (10 - chill) * 2;

        ui.riskCold.textContent = Math.round(coldRisk) + "%";
        ui.riskCold.style.color = coldRisk > 50 ? "#ef4444" : (coldRisk > 20 ? "#fcd34d" : "#fff");

        // Dehydration (Simple proxy based on Temp)
        let water = "Low";
        if (tC > 25) water = "Med";
        if (tC > 30) water = "High";
        if (tC > 35) water = "CRITICAL";
        ui.riskWater.textContent = water;
        ui.riskWater.className = `text-lg font-bold ${water === 'CRITICAL' ? 'text-red-500 animate-pulse' : (water === 'High' ? 'text-orange-400' : 'text-white')}`;

        // Solar Output (Inverse of Cloud Cover)
        // We don't have direct cloud cover % in simple API, use weather code proxy
        let cloudCover = 0;
        const c = STATE.data?.current?.weather_code || 0;
        if (c < 2) cloudCover = 0; // Clear
        else if (c < 48) cloudCover = 50; // Partly
        else cloudCover = 100; // Overcast/Rain

        if (!isDay) cloudCover = 100; // No sun at night

        const solar = 100 - cloudCover;
        ui.solarVal.textContent = solar + "%";
        ui.solarBar.style.width = solar + "%";

        // AI Advice
        let advice = "Atmospheric conditions nominal. Continue mission.";
        if (coldRisk > 60) advice = "WARNING: Core temp drop imminent. Seek shelter.";
        if (water === "CRITICAL") advice = "ALERT: Hydration levels critical. Conserve water.";
        if (solar < 20 && isDay) advice = "Energy collection inefficient. Conserve power.";
        if (c >= 95) advice = "Storm front active. Secure all external assets.";

        ui.survAdvice.textContent = advice;

        // Log Critical Events
        if (coldRisk > 70 || water === "High" || c >= 95) {
            logAI(`CRITICAL: ${advice}`);
        }
    }


    // --- IDEA 5: IMPROVED CHRONOSPHERE LOGIC (TOOLTIP) ---
    function updateSliderTooltip() {
        const val = parseInt(ui.timeSlider.value);
        const max = parseInt(ui.timeSlider.max);

        // Calculate Position
        // The thumb width is approx 24px, we want the center
        const percent = (val / max);
        // We need to account for the thumb width to center it perfectly
        // (Position * AvailableWidth)
        // Simple approx: left: percentage%
        ui.sliderTooltip.style.left = `${percent * 100}%`;

        // Calculate Time Text
        const now = new Date();
        const baseDate = new Date();
        baseDate.setDate(now.getDate() + STATE.selectedDayIndex);
        const targetTime = new Date(baseDate.getTime() + val * 3600000); // Add hours

        const hour = targetTime.getHours();
        const minutes = targetTime.getMinutes();
        const str = `${hour.toString().padStart(2, '0')}:00`;

        // Add Day Name if simulating future days
        let dayStr = "";
        if (STATE.selectedDayIndex > 0) {
            dayStr = targetTime.toLocaleDateString('en-US', { weekday: 'short' }) + " ";
        } else if (val > 24) {
            dayStr = "+1d ";
        }

        ui.sliderTooltip.innerHTML = `
            ${dayStr}${str}
            <div class="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-600 rotate-45 border-r border-b border-cyan-400/50"></div>
        `;

        ui.sliderTooltip.style.opacity = '1';
    }

    ui.timeSlider.addEventListener('input', (e) => {
        STATE.timeOffset = parseInt(e.target.value);
        updateSliderTooltip(); // Move tooltip
        updateSimulationState();
        renderUI(); // Re-render everything with new time offset
    });

    // Hide tooltip when not interacting (optional, or keep it visible on hover via CSS)
    // We added opacity transition in CSS, let's use mouse events to show/hide if needed
    // But CSS group-hover on the container handles most of it.
    // We force opacity 1 during drag
    ui.timeSlider.addEventListener('mousedown', () => ui.sliderTooltip.style.opacity = '1');
    ui.timeSlider.addEventListener('touchstart', () => ui.sliderTooltip.style.opacity = '1');


    // Helper to update text/badges based on time/day
    function updateSimulationState() {
        // Calculate the future time based on SELECTED DAY + SLIDER OFFSET
        const now = new Date();
        const baseDate = new Date();
        baseDate.setDate(now.getDate() + STATE.selectedDayIndex);
        const futureTime = new Date(baseDate.getTime() + STATE.timeOffset * 60 * 60 * 1000);

        // Is it "Live"? (Today, 0 offset)
        const isLive = STATE.selectedDayIndex === 0 && STATE.timeOffset === 0;

        if (isLive) {
            ui.chronoLabel.textContent = "Live Feed";
            ui.chronoLabel.className = "text-xs font-bold tracking-widest uppercase text-cyan-400 mb-1";
            ui.simBadge.classList.add('hidden');
            ui.resetDayBtn.classList.add('hidden');
            ui.feedStatusLabel.textContent = "LIVE FEED";
            ui.feedStatusLabel.className = "text-[10px] text-cyan-400 font-mono font-bold animate-pulse";
            document.body.classList.remove('simulation-active');
        } else {
            // Build simulation label
            let label = "";
            if (STATE.selectedDayIndex > 0) {
                const dayName = futureTime.toLocaleDateString('en-US', { weekday: 'long' });
                label = `Sim: ${dayName}`; // Shortened for mobile
                ui.resetDayBtn.classList.remove('hidden');
            } else {
                label = `Sim: +${STATE.timeOffset}h`;
            }

            ui.chronoLabel.textContent = label;
            ui.chronoLabel.className = "text-xs font-bold tracking-widest uppercase text-purple-400 mb-1 animate-pulse";
            ui.simBadge.classList.remove('hidden');
            ui.simBadge.textContent = STATE.selectedDayIndex > 0 ? "Forecast Sim" : "Future Sim";

            ui.feedStatusLabel.textContent = "SIMULATION";
            ui.feedStatusLabel.className = "text-[10px] text-purple-400 font-mono font-bold";

            document.body.classList.add('simulation-active');
        }
    }

    // --- MODAL LOGIC (GLOBAL & LOCAL) ---
    ui.exploreBtn.onclick = () => {
        ui.exploreTitle.textContent = "Global Sentry";
        ui.exploreSubtitle.textContent = "Targeted Atmospheric Scan";
        ui.exploreModal.classList.add('open');
        scanGlobalWeather();
        toggleMapView(false);
    };

    ui.rescanBtn.onclick = () => {
        // Simple animation feedback
        ui.rescanBtn.firstElementChild.classList.add('animate-spin');
        setTimeout(() => ui.rescanBtn.firstElementChild.classList.remove('animate-spin'), 1000);

        if (ui.exploreTitle.textContent.includes("Global")) {
            scanGlobalWeather();
        } else {
            // Re-trigger local scan if that was active
            ui.localBtn.click();
        }
    };

    ui.localBtn.onclick = () => {
        if (navigator.geolocation) {
            ui.exploreTitle.textContent = "Local Sector Scan";
            ui.exploreSubtitle.textContent = "Scanning Immediate Atmosphere (20km Radius)";
            ui.exploreModal.classList.add('open');

            navigator.geolocation.getCurrentPosition(
                (p) => scanLocalWeather(p.coords.latitude, p.coords.longitude),
                (e) => { alert("GPS Denied. Cannot scan local sectors."); ui.exploreModal.classList.remove('open'); }
            );
        } else {
            alert("GPS not supported.");
        }
        toggleMapView(false);
    };

    ui.closeExplore.onclick = () => ui.exploreModal.classList.remove('open');

    // --- 3D GLOBE LOGIC (GLOBE.GL) ---
    function initGlobe() {
        if (STATE.globe) return;

        const elem = document.getElementById('explore-map');

        // High-Def / Tile Mode
        STATE.globe = Globe()
            (elem)
            // Use Blue Marble High-Res for reliable Satellite look
            .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
            .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
            .backgroundColor('rgba(0,0,0,0)')

            // 1. 3D Beacons (The "Models")
            .objectsData([])
            .objectLat('lat')
            .objectLng('lng')
            .objectAltitude(0.01)
            .customThreeObject(d => {
                // Group to hold Mesh + Glow
                const group = new THREE.Group();

                let mesh, color;
                // BasicMaterial = Self-Illuminated (Glows)
                if (d.weatherType === 'clear' && d.isDay) {
                    color = '#fcd34d';
                    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshBasicMaterial({ color: color }));
                } else if (d.weatherType === 'rain' || d.weatherType === 'drizzle') {
                    color = '#3b82f6';
                    mesh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.0, 8), new THREE.MeshBasicMaterial({ color: color }));
                    mesh.rotation.x = Math.PI;
                } else if (d.weatherType === 'snow') {
                    color = '#cffafe';
                    mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: color }));
                } else if (d.weatherType === 'storm') {
                    color = '#a855f7';
                    mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), new THREE.MeshBasicMaterial({ color: color }));
                } else {
                    color = '#9ca3af';
                    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 }));
                }

                group.add(mesh);

                // Add "Glow Halo" Sprite
                // Create a soft gradient texture programmatically
                const canvas = document.createElement('canvas');
                canvas.width = 32; canvas.height = 32;
                const context = canvas.getContext('2d');
                const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');
                context.fillStyle = gradient;
                context.fillRect(0, 0, 32, 32);

                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.6, depthWrite: false });
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.scale.set(2, 2, 2); // Halo is larger than the mesh
                group.add(sprite);

                return group;
            })
            .onObjectClick(d => loadFromExplore(d.lat, d.lng, d.name))

            // 2. HTML Labels (The "Place Markers" - Reliable)
            .htmlElementsData([])
            .htmlLat('lat')
            .htmlLng('lng')
            .htmlAltitude(0.25) // Floating above the 3D model
            .htmlElement(d => {
                const el = document.createElement('div');
                // Use a cleaner, sci-fi glass badge with animation and specific glowing borders
                let borderColor = 'border-white/20';
                let shadowColor = 'rgba(255,255,255,0.2)';

                if (d.weatherType === 'clear' && d.isDay) { borderColor = 'border-yellow-400/50'; shadowColor = 'rgba(250, 204, 21, 0.5)'; }
                if (d.weatherType === 'rain') { borderColor = 'border-blue-400/50'; shadowColor = 'rgba(59, 130, 246, 0.5)'; }
                if (d.weatherType === 'snow') { borderColor = 'border-cyan-200/50'; shadowColor = 'rgba(34, 211, 238, 0.5)'; }
                if (d.weatherType === 'storm') { borderColor = 'border-purple-500/50'; shadowColor = 'rgba(168, 85, 247, 0.5)'; }

                el.className = `glass px-3 py-1.5 rounded-full text-[11px] font-bold text-white border ${borderColor} flex items-center gap-1.5 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 group`;
                el.style.boxShadow = `0 0 15px ${shadowColor}`;
                el.style.whiteSpace = 'nowrap';

                // Add icon based on generic type
                let icon = 'cloud';
                let colorClass = 'text-gray-300';
                if (d.weatherType === 'clear' && d.isDay) { icon = 'sunny'; colorClass = 'text-yellow-400'; }
                else if (d.weatherType === 'clear' && !d.isDay) { icon = 'clear_night'; colorClass = 'text-blue-200'; }
                if (d.weatherType === 'rain') { icon = 'rainy'; colorClass = 'text-blue-400'; }
                if (d.weatherType === 'snow') { icon = 'ac_unit'; colorClass = 'text-cyan-100'; }
                if (d.weatherType === 'storm') { icon = 'thunderstorm'; colorClass = 'text-purple-400'; }

                el.innerHTML = `<span class="material-symbols-rounded text-[14px] ${colorClass} filter drop-shadow-[0_0_5px_currentColor]">${icon}</span> <span class="tracking-wide">${d.name}</span>`;
                return el;
            });

        // Initial Zoom/Pos
        STATE.globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

        // CONTROLS & ZOOM
        const controls = STATE.globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        controls.enableZoom = true;
        controls.minDistance = 100.1; // Extreme close zoom
        controls.maxDistance = 400;

        // Stop rotation on interaction
        controls.addEventListener('start', () => { controls.autoRotate = false; });
    }

    function renderGlobePoints() {
        if (!STATE.globe) return;

        // Map scan results to Globe points
        const points = STATE.currentScanResults.map(p => {
            const temp = Math.round(STATE.metric ? p.temperature_2m : p.temperature_2m * 1.8 + 32);
            const code = p.weather_code;
            // Determine Type for visual model
            let type = 'cloud';
            if (code <= 1) type = 'clear';
            if (code >= 51 && code <= 67) type = 'rain';
            if (code >= 71 && code <= 86) type = 'snow';
            if (code >= 95) type = 'storm';

            // Color for Rings/Fallback
            let c = '#9ca3af';
            if (type === 'clear') c = '#fbbf24';
            if (type === 'rain') c = '#3b82f6';
            if (type === 'snow') c = '#cffafe';
            if (type === 'storm') c = '#a855f7';

            return {
                lat: p.lat,
                lng: p.lon,
                name: `${p.name} (${temp}°)`,
                weatherType: type,
                isDay: p.is_day === 1,
                color: c
            };
        });

        STATE.globe.objectsData([]); // Clear prev
        STATE.globe.objectsData(points);

        // Pass data to HTML layer for labels
        STATE.globe.htmlElementsData([]);
        STATE.globe.htmlElementsData(points);

        // Add rings for visual flair
        STATE.globe.ringsData(points.map(p => ({ lat: p.lat, lng: p.lng, color: p.color })));
    }

    ui.mapBtn.onclick = () => {
        toggleMapView(!STATE.isMapView);
    };

    function toggleMapView(showMap) {
        STATE.isMapView = showMap;
        if (showMap) {
            ui.exploreContent.classList.add('hidden');
            ui.exploreMap.classList.remove('hidden');
            ui.mapBtn.classList.remove('bg-white/5', 'text-gray-300');
            ui.mapBtn.classList.add('bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/30');

            // Initialize
            if (!STATE.globe) initGlobe();

            // Render Points
            setTimeout(renderGlobePoints, 100);

        } else {
            ui.exploreContent.classList.remove('hidden');
            ui.exploreMap.classList.add('hidden');
            ui.mapBtn.classList.add('bg-white/5', 'text-gray-300');
            ui.mapBtn.classList.remove('bg-cyan-500/20', 'text-cyan-400', 'border-cyan-500/30');
        }
    }

    function getMarkerIconName(code, isDay) {
        if (code === 0 || code === 1) return isDay ? 'sunny' : 'clear_night';
        if (code === 2 || code === 3) return isDay ? 'partly_cloudy_day' : 'partly_cloudy_night';
        if (code === 45 || code === 48) return 'foggy';
        if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return 'rainy';
        if (code >= 71 && code <= 77 || code === 85 || code === 86) return 'weather_snowy';
        if (code >= 95) return 'thunderstorm';
        return 'cloud'; // Default overcast/cloudy
    }

    function renderMapMarkers() {
        if (!STATE.map) return;

        // Clear existing markers
        STATE.mapMarkers.forEach(m => STATE.map.removeLayer(m));
        STATE.mapMarkers = [];

        if (STATE.currentScanResults.length > 0) {
            const bounds = L.latLngBounds();

            STATE.currentScanResults.forEach(place => {
                const temp = Math.round(STATE.metric ? place.temperature_2m : place.temperature_2m * 1.8 + 32);
                const isDay = place.is_day === 1;
                const iconName = getMarkerIconName(place.weather_code, isDay);
                const markerColor = getMarkerColor(place.weather_code);

                // UPDATED: Icon-based Marker
                const markerHtml = `
                    <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg ${markerColor} text-white">
                        <span class="material-symbols-rounded text-[18px]">${iconName}</span>
                    </div>
                `;

                const icon = L.divIcon({
                    className: 'custom-map-marker',
                    html: markerHtml,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                const marker = L.marker([place.lat, place.lon], { icon: icon })
                    .addTo(STATE.map)
                    .bindPopup(`
                        <div class="text-center">
                            <h3 class="font-bold text-lg text-white mb-1">${place.name}</h3>
                            <div class="text-cyan-400 font-mono text-xl font-bold mb-2">${temp}°${STATE.metric ? 'C' : 'F'}</div>
                            <button onclick="loadFromExplore(${place.lat}, ${place.lon}, '${place.name}')" class="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-1 px-3 rounded-full transition-colors w-full">
                                ANALYZE SECTOR
                            </button>
                        </div>
                    `);

                STATE.mapMarkers.push(marker);
                bounds.extend([place.lat, place.lon]);
            });

            // Fit map to markers if we have any
            if (STATE.mapMarkers.length > 0) {
                STATE.map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }

    function getMarkerColor(code) {
        if (code === 0 || code === 1) return 'bg-yellow-500';
        if (code === 2 || code === 3 || code === 45 || code === 48) return 'bg-gray-500';
        if (code >= 51 && code <= 67 || code >= 80 && code <= 82) return 'bg-blue-500';
        if (code >= 71 && code <= 77 || code === 85 || code === 86) return 'bg-cyan-400';
        if (code >= 95) return 'bg-purple-600';
        return 'bg-gray-500';
    }

    // SMART SAMPLING SCAN (UPDATED)
    async function scanGlobalWeather() {
        ui.exploreLoading.classList.remove('hidden');
        ui.exploreLoading.innerHTML = '<div class="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div><p class="text-sm text-gray-400 font-mono animate-pulse">Scanning Climate Sectors...</p>';
        ui.exploreContent.classList.add('hidden');
        ui.exploreContent.innerHTML = '';
        ui.exploreMap.classList.add('hidden'); // Hide map while loading

        // Helper to pick N random items from an array
        const pickRandom = (arr, n) => [...arr].sort(() => 0.5 - Math.random()).slice(0, n);

        try {
            // Pick 4 from EACH climate zone to guarantee diversity
            const selection = [
                ...pickRandom(CLIMATE_ZONES.cryo, 4),
                ...pickRandom(CLIMATE_ZONES.tropical, 4),
                ...pickRandom(CLIMATE_ZONES.arid, 4),
                ...pickRandom(CLIMATE_ZONES.urban, 4)
            ];

            const promises = selection.map(city => {
                // Jitter: Random offset between -1.5 and +1.5 degrees (approx 150km radius)
                // This creates a "Search" effect around the known climate hub
                const lat = city.lat + (Math.random() - 0.5) * 3;
                const lon = city.lon + (Math.random() - 0.5) * 3;

                return fetch(`${CONFIG.weather}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`)
                    .then(r => r.json())
                    .then(data => ({
                        ...city,
                        name: `${city.name}`, // Use original name but updated data
                        lat: lat, // Update lat for the click handler
                        lon: lon, // Update lon
                        ...data.current
                    }))
            });
            const results = await Promise.all(promises);
            STATE.currentScanResults = results;
            renderExploreGrid(results);
            if (STATE.isMapView) renderGlobePoints();
        } catch (e) { console.error(e); }
    }

    // LOCAL SCAN
    async function scanLocalWeather(lat, lon) {
        ui.exploreLoading.classList.remove('hidden');
        ui.exploreLoading.innerHTML = '<div class="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div><p class="text-sm text-gray-400 font-mono animate-pulse">Scanning Local Sectors...</p>';
        ui.exploreContent.classList.add('hidden');
        ui.exploreContent.innerHTML = '';
        ui.exploreMap.classList.add('hidden');

        // Generate 8 points around user (simulated "Regional" scan for visibility)
        // 1.5 deg lat ~= 160km radius (Visual spread)
        const offset = 1.5;
        const sectors = [
            { name: "Sector North", lat: lat + offset, lon: lon },
            { name: "Sector North-East", lat: lat + offset, lon: lon + offset },
            { name: "Sector East", lat: lat, lon: lon + offset },
            { name: "Sector South-East", lat: lat - offset, lon: lon + offset },
            { name: "Sector South", lat: lat - offset, lon: lon },
            { name: "Sector South-West", lat: lat - offset, lon: lon - offset },
            { name: "Sector West", lat: lat, lon: lon - offset },
            { name: "Sector North-West", lat: lat + offset, lon: lon - offset },
        ];

        try {
            const promises = sectors.map(sec =>
                fetch(`${CONFIG.weather}?latitude=${sec.lat}&longitude=${sec.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`)
                    .then(r => r.json())
                    .then(data => ({ ...sec, ...data.current }))
            );
            const results = await Promise.all(promises);
            STATE.currentScanResults = results;
            renderExploreGrid(results);
            if (STATE.isMapView) renderGlobePoints();
        } catch (e) { console.error(e); }
    }

    function renderExploreGrid(results) {
        const buckets = { 'Clear': [], 'Cloudy': [], 'Rain': [], 'Snow': [], 'Storm': [] };

        results.forEach(r => {
            const c = r.weather_code;
            let cat = 'Cloudy';
            if (c === 0 || c === 1) cat = 'Clear';
            else if (c === 2 || c === 3 || c === 45 || c === 48) cat = 'Cloudy';
            else if (c >= 51 && c <= 67 || c >= 80 && c <= 82) cat = 'Rain';
            else if (c >= 71 && c <= 77 || c === 85 || c === 86) cat = 'Snow';
            else if (c >= 95) cat = 'Storm';
            buckets[cat].push(r);
        });

        const icons = { 'Clear': 'sunny', 'Cloudy': 'cloud', 'Rain': 'rainy', 'Snow': 'weather_snowy', 'Storm': 'thunderstorm' };
        const colors = { 'Clear': 'text-yellow-400', 'Cloudy': 'text-gray-400', 'Rain': 'text-blue-400', 'Snow': 'text-cyan-200', 'Storm': 'text-purple-400' };

        Object.keys(buckets).forEach(cat => {
            if (buckets[cat].length > 0) {
                const section = document.createElement('div');
                section.innerHTML = `
                    <div class="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                        <span class="material-symbols-rounded ${colors[cat]}">${icons[cat]}</span>
                        <h3 class="text-sm font-bold text-white uppercase tracking-widest">${cat} Sectors</h3>
                    </div>
                    <div class="grid grid-cols-1 gap-2">
                        ${buckets[cat].map(place => {
                    let temp = place.temperature_2m;
                    if (!STATE.metric) temp = temp * 1.8 + 32;
                    return `
                            <div class="explore-card flex justify-between items-center" onclick="loadFromExplore(${place.lat}, ${place.lon}, '${place.name}')">
                                <span class="text-sm font-medium text-gray-200">${place.name}</span>
                                <span class="text-xs font-bold font-mono text-cyan-400">${Math.round(temp)}°</span>
                            </div>`;
                }).join('')}
                    </div>
                `;
                ui.exploreContent.appendChild(section);
            }
        });

        ui.exploreLoading.classList.add('hidden');
        if (!STATE.isMapView) ui.exploreContent.classList.remove('hidden');
        if (!STATE.isMapView) ui.exploreContent.classList.remove('hidden');
        else ui.exploreMap.classList.remove('hidden');
    }

    // Exposed function for onclick in HTML string
    window.loadFromExplore = (lat, lon, name) => {
        ui.exploreModal.classList.remove('open');
        fetchWeather(lat, lon, name);
    };

    // --- STATUS INDICATOR ---
    function setStatus(mode) {
        if (mode === 'sync') {
            ui.statusDot.className = "w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse";
            ui.statusText.textContent = "Synced";
            ui.statusText.className = "text-[10px] text-cyan-200 tracking-[0.2em] uppercase font-mono";
        } else {
            ui.statusDot.className = "w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping";
            ui.statusText.textContent = "Updating";
            ui.statusText.className = "text-[10px] text-yellow-200 tracking-[0.2em] uppercase font-mono";
        }
    }

    // --- MOON PHASE ENGINE ---
    function getMoonPhase(date) {
        const synodic = 29.53058867;
        const knownNewMoon = new Date('2000-01-06T18:14:00Z');
        const diff = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
        let phase = (diff % synodic) / synodic;
        if (phase < 0) phase += 1;
        return phase;
    }

    function createMoonSVG(phase, size = 100, color = "#e2e8f0") {
        const r = size / 2, cx = size / 2, cy = size / 2;
        const isWaxing = phase <= 0.5;
        let progress = isWaxing ? phase / 0.5 : (phase - 0.5) / 0.5;
        let tr = Math.abs((progress - 0.5) * 2) * r;
        let outerDir = isWaxing ? 1 : 0;
        let innerDir = 0;
        if (isWaxing) innerDir = progress < 0.5 ? 0 : 1;
        else innerDir = progress < 0.5 ? 1 : 0;

        let d = "";
        if (phase > 0.48 && phase < 0.52) {
            d = `M ${cx},0 A ${r},${r} 0 1,1 ${cx},${size} A ${r},${r} 0 1,1 ${cx},0`;
        } else if (phase < 0.02 || phase > 0.98) { d = ""; }
        else { d = `M ${cx},0 A ${r},${r} 0 0,${outerDir} ${cx},${size} A ${tr},${r} 0 0,${innerDir} ${cx},0`; }

        return `
        <svg viewBox="0 0 ${size} ${size}" class="moon-svg">
            <defs><filter id="glow-${size}"><feGaussianBlur stdDeviation="2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0f172a" opacity="0.6"/>
            <path d="${d}" fill="${color}" filter="url(#glow-${size})"/>
        </svg>`;
    }

    function updateCelestial(isDay) {
        const container = ui.celestial;
        if (!container) return; // Guard
        container.innerHTML = '';
        if (isDay) {
            const sun = document.createElement('div');
            sun.className = 'sun-orb';
            container.appendChild(sun);
            container.style.filter = 'none';
        } else {
            const phase = getMoonPhase(new Date());
            container.innerHTML = createMoonSVG(phase, 160, "#f8fafc");
            container.style.filter = 'drop-shadow(0 0 30px rgba(255,255,255,0.3))';
        }
    }

    function updateMoonWidget(phase) {
        if (!ui.moonUI) return; // Guard
        ui.moonUI.innerHTML = createMoonSVG(phase, 40, "#ffffff");
        let name = "New Moon";
        if (phase > 0.035 && phase < 0.215) name = "Waxing Crescent";
        else if (phase >= 0.215 && phase < 0.285) name = "First Quarter";
        else if (phase >= 0.285 && phase < 0.465) name = "Waxing Gibbous";
        else if (phase >= 0.465 && phase < 0.535) name = "Full Moon";
        else if (phase >= 0.535 && phase < 0.715) name = "Waning Gibbous";
        else if (phase >= 0.715 && phase < 0.785) name = "Third Quarter";
        else if (phase >= 0.785 && phase < 0.965) name = "Waning Crescent";
        ui.moonText.textContent = name;
    }

    // --- VISUAL ENGINE ---
    const canvasS = ui.starCanvas.getContext('2d');
    const canvasP = ui.precipCanvas.getContext('2d');
    let w, h, stars = [], particles = [];

    function resize() {
        w = window.innerWidth; h = window.innerHeight;
        ui.starCanvas.width = ui.precipCanvas.width = w;
        ui.starCanvas.height = ui.precipCanvas.height = h;
        if (stars.length === 0) initStars();
    }
    window.addEventListener('resize', resize);

    function initStars() { stars = []; for (let i = 0; i < 150; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, s: Math.random() * 1.5, a: Math.random() }); }

    function loop() {
        canvasS.clearRect(0, 0, w, h); canvasP.clearRect(0, 0, w, h);

        // Stars
        if (ui.starCanvas.style.opacity === '1') {
            canvasS.fillStyle = "#fff";
            stars.forEach(s => { canvasS.globalAlpha = s.a; canvasS.beginPath(); canvasS.arc(s.x, s.y, s.s, 0, Math.PI * 2); canvasS.fill(); if (Math.random() > 0.99) s.a = Math.random(); });
        }

        // Lightning Bolts (Storm Engine)
        if (STATE.lightningBolts.length > 0) {
            STATE.lightningBolts.forEach((bolt, index) => {
                canvasP.strokeStyle = `rgba(255, 255, 255, ${bolt.opacity})`;
                canvasP.lineWidth = 2;
                canvasP.shadowBlur = 20;
                canvasP.shadowColor = "#a855f7"; // Purple glow
                canvasP.beginPath();
                canvasP.moveTo(bolt.segments[0].x, bolt.segments[0].y);
                for (let i = 1; i < bolt.segments.length; i++) {
                    canvasP.lineTo(bolt.segments[i].x, bolt.segments[i].y);
                }
                canvasP.stroke();
                canvasP.shadowBlur = 0; // Reset

                bolt.opacity -= 0.05; // Fade out
                if (bolt.opacity <= 0) STATE.lightningBolts.splice(index, 1);
            });
        }

        // Depth-Aware Precipitation
        particles.forEach(p => {
            // Z-Motion
            p.z -= 10;
            if (p.z <= 0) p.z = 1000;

            // Scale based on Z (1000 = far, 0 = near)
            const depthScale = 0.5 + ((1000 - p.z) / 1000) * 1.5; // 0.5x to 2.0x

            p.y += p.vy * depthScale; // Move faster when closer
            p.x += (p.vx || 0) * depthScale;

            if (p.type === 'snow') p.x += Math.sin(p.y * 0.01) * depthScale;
            if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
            if (p.x > w) p.x = 0;
            if (p.x < 0) p.x = w;

            canvasP.beginPath();
            if (p.type === 'rain') {
                canvasP.strokeStyle = `rgba(200,230,255,${0.3 * depthScale})`;
                canvasP.lineWidth = 1 * depthScale;
                canvasP.moveTo(p.x, p.y);
                canvasP.lineTo(p.x - (p.vx || 0) * depthScale, p.y + p.len * depthScale);
                canvasP.stroke();
            }
            else {
                canvasP.fillStyle = `rgba(255,255,255,${0.6 * depthScale})`;
                canvasP.arc(p.x, p.y, p.s * depthScale, 0, Math.PI * 2);
                canvasP.fill();
            }
        });
        STATE.animationId = requestAnimationFrame(loop);
    }

    // Voice Briefing
    window.speakBriefing = () => {
        const text = `Commander, Aether Station reports ${ui.desc.textContent}, temperature ${ui.temp.textContent}. Wind speed ${ui.windVal.textContent} kilometers per hour. ${ui.survAdvice.textContent}`;
        const u = new SpeechSynthesisUtterance(text);
        u.pitch = 0.8; // Lower pitch for "AI" feel
        u.rate = 1.1;
        window.speechSynthesis.speak(u);
        logAI("Audio Briefing Initiated");
    };
    // Add Click listener to AI Icon for briefing
    ui.aiIcon.style.cursor = "pointer";
    ui.aiIcon.onclick = window.speakBriefing;

    document.addEventListener("visibilitychange", () => { if (document.hidden) { if (STATE.animationId) cancelAnimationFrame(STATE.animationId); } else { loop(); } });
    resize(); loop();

    const weatherMeta = {
        0: { type: 'clear', day: ['#0ea5e9', '#93c5fd'], night: ['#020617', '#1e1b4b'] },
        1: { type: 'clear', day: ['#38bdf8', '#bae6fd'], night: ['#0f172a', '#172554'] },
        2: { type: 'cloudy', day: ['#475569', '#94a3b8'], night: ['#1e293b', '#334155'] },
        3: { type: 'overcast', day: ['#334155', '#64748b'], night: ['#0f172a', '#1e293b'] },
        45: { type: 'fog', day: ['#6b7280', '#9ca3af'], night: ['#1f2937', '#374151'] }, 48: { type: 'fog', day: ['#6b7280', '#9ca3af'], night: ['#1f2937', '#374151'] },
        51: { type: 'rain', day: ['#2563eb', '#60a5fa'], night: ['#172554', '#1e40af'] }, 53: { type: 'rain', day: ['#2563eb', '#60a5fa'], night: ['#172554', '#1e40af'] },
        55: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] }, 56: { type: 'rain', day: ['#2563eb', '#60a5fa'], night: ['#172554', '#1e40af'] },
        57: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] }, // Add missing
        61: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] }, 63: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] },
        65: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] }, // Add missing
        66: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] }, // Add missing
        67: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] }, // Add missing
        71: { type: 'snow', day: ['#bae6fd', '#e0f2fe'], night: ['#1e293b', '#334155'] }, 73: { type: 'snow', day: ['#bae6fd', '#e0f2fe'], night: ['#1e293b', '#334155'] },
        75: { type: 'snow', day: ['#bae6fd', '#e0f2fe'], night: ['#1e293b', '#334155'] }, // Add missing
        77: { type: 'snow', day: ['#bae6fd', '#e0f2fe'], night: ['#1e293b', '#334155'] }, // Add missing
        80: { type: 'rain', day: ['#2563eb', '#60a5fa'], night: ['#172554', '#1e40af'] }, 81: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] },
        82: { type: 'rain', day: ['#1d4ed8', '#3b82f6'], night: ['#172554', '#1e3a8a'] }, // Add missing
        85: { type: 'snow', day: ['#bae6fd', '#e0f2fe'], night: ['#1e293b', '#334155'] }, // Add missing
        86: { type: 'snow', day: ['#bae6fd', '#e0f2fe'], night: ['#1e293b', '#334155'] }, // Add missing
        95: { type: 'storm', day: ['#4c1d95', '#6d28d9'], night: ['#2e1065', '#581c87'] }, 96: { type: 'storm', day: ['#4c1d95', '#6d28d9'], night: ['#2e1065', '#581c87'] },
        99: { type: 'storm', day: ['#4c1d95', '#6d28d9'], night: ['#2e1065', '#581c87'] } // Add missing
    };

    function setAtmosphere(code, isDay) {
        // Stop lightning loop if not storm
        if (STATE.lightningTimer) clearTimeout(STATE.lightningTimer);

        const meta = weatherMeta[code] || weatherMeta[0];
        const type = meta.type;
        const c = isDay ? meta.day : meta.night;

        if (ui.sky) ui.sky.style.background = `linear-gradient(to bottom, ${c[0]}, ${c[1]})`;

        // Update Favicon based on weather
        let iconName = 'sunny';
        if (type === 'cloudy') iconName = 'partly_cloudy_day';
        if (type === 'overcast') iconName = 'cloud';
        if (type === 'rain') iconName = 'rainy';
        if (type === 'snow') iconName = 'weather_snowy';
        if (type === 'storm') iconName = 'thunderstorm';
        if (!isDay && type === 'clear') iconName = 'clear_night';
        if (ui.favicon) ui.favicon.href = `https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsrounded/${iconName}/default/24px.svg`;

        if (ui.aurora) {
            ui.aurora.innerHTML = '';
            let color = isDay ? (type === 'storm' ? 'bg-purple-500' : 'bg-cyan-400') : (type === 'storm' ? 'bg-purple-900' : 'bg-blue-900');
            ui.aurora.innerHTML = `<div class="aurora-blob ${color} w-[600px] h-[600px] top-[-20%] left-[-10%]"></div>`;
        }

        updateCelestial(isDay);
        if (ui.celestial) ui.celestial.style.opacity = (type === 'overcast' || type === 'storm' || type === 'fog') ? '0.2' : '1';
        if (ui.starCanvas) ui.starCanvas.style.opacity = (!isDay && type === 'clear') ? '1' : '0';
        if (ui.mist) ui.mist.style.opacity = type === 'fog' ? '1' : '0';
        if (ui.cloudsBack) ui.cloudsBack.style.opacity = (type === 'cloudy' || type === 'overcast' || type === 'storm') ? '0.6' : '0';
        if (ui.cloudsFront) ui.cloudsFront.style.opacity = (type === 'overcast' || type === 'storm') ? '0.8' : '0';

        if (ui.cloudsBack) ui.cloudsBack.innerHTML = '';
        if (ui.cloudsFront) ui.cloudsFront.innerHTML = '';

        if ((type.includes('cloud') || type === 'overcast' || type === 'storm') && ui.cloudsBack && ui.cloudsFront) {
            const count = type === 'cloudy' ? 5 : 12;
            for (let i = 0; i < count; i++) {
                const cl = document.createElement('div'); cl.className = 'cloud';
                const s = Math.random() * 300 + 150; cl.style.width = s + 'px'; cl.style.height = s + 'px';
                cl.style.top = Math.random() * 60 + '%'; cl.style.left = Math.random() * 100 + 'vw';
                cl.style.animationDuration = (Math.random() * 60 + 60) + 's';
                if (i % 2 === 0) ui.cloudsBack.appendChild(cl); else ui.cloudsFront.appendChild(cl);
            }
        }
        particles = [];
        if (type === 'rain' || type === 'storm') {
            // Dynamic Intensity based on REAL data
            const precip = STATE.data?.current?.precipitation || 0;
            const isHeavy = type === 'storm' || precip > 5;

            // Calculate particles: 200 base + up to 1000 more based on precip amount
            let count = 200 + Math.min(precip * 100, 1000);
            let speedBase = 15 + Math.min(precip * 2, 20); // Faster rain for heavier precip
            let wind = (STATE.data?.current?.wind_speed_10m || 0) / 5; // Wind affects rain angle

            // Force storm values if code is 95/96
            if (type === 'storm') { count = Math.max(count, 800); speedBase = 25; }

            for (let i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    z: Math.random() * 1000, // Z-Depth
                    vy: Math.random() * 15 + speedBase,
                    vx: wind,
                    len: 15 + Math.min(precip, 15), // Longer streaks for heavy rain
                    type: 'rain'
                });
            }
        }
        if (type === 'snow') for (let i = 0; i < 200; i++) particles.push({ x: Math.random() * w, y: Math.random() * h, z: Math.random() * 1000, vy: Math.random() * 2 + 1, s: Math.random() * 3 + 1, type: 'snow' });

        if (type === 'storm') triggerLightning();
    }

    function triggerLightning() {
        // 1. Sheet Lightning (Flash)
        const f = document.createElement('div');
        f.className = 'flash-anim';

        // Randomize flash position/style for sheet lightning feel
        const x = Math.random() * 100;
        const y = Math.random() * 50; // Upper half of screen
        f.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255, 255, 255, 0.8) 0%, transparent 60%)`;

        if (ui.lightning) {
            ui.lightning.appendChild(f);
            setTimeout(() => f.remove(), 300);
        }

        // 2. Bolt Generation (Canvas)
        if (Math.random() > 0.4) { // 60% chance of visible bolt
            const startX = Math.random() * w;
            const segments = [{ x: startX, y: -50 }];
            let currentX = startX;
            let currentY = -50;

            while (currentY < h * 0.8) {
                currentX += (Math.random() - 0.5) * 50; // Jitter X
                currentY += Math.random() * 30 + 10; // Move Down
                segments.push({ x: currentX, y: currentY });
            }

            STATE.lightningBolts.push({ segments: segments, opacity: 1 });
        }

        // Loop with random delay
        STATE.lightningTimer = setTimeout(triggerLightning, Math.random() * 2000 + 500);
    }

    // --- LOGIC ---
    function toggleSkeleton(loading) {
        document.body.classList.toggle('loaded', !loading);
        setStatus(loading ? 'update' : 'sync');
    }

    // --- IDEA 10 REVISED: "SENTRY AI NODE" AVATAR ---
    function updateAvatar(code, tempC, isDay) {
        if (!ui.avatarIcon) return; // Safety check

        // 1. Determine State
        let mood = 'normal';
        let mainColor = '#22d3ee'; // Cyan (Normal)
        let iconType = 'sun'; // Default icon center

        if (code >= 95) {
            mood = 'storm';
            mainColor = '#a855f7'; // Purple
            iconType = 'bolt';
        } else if (code >= 51 && code <= 67 || code >= 80 && code <= 82) {
            mood = 'rain';
            mainColor = '#3b82f6'; // Blue
            iconType = 'drop';
        } else if (tempC < 10) {
            mood = 'cold';
            mainColor = '#e0f2fe'; // Ice White
            iconType = 'snowflake';
        } else if (tempC > 25 && isDay) {
            mood = 'hot';
            mainColor = '#f97316'; // Orange
            iconType = 'flame';
        } else if (!isDay) {
            mood = 'night';
            mainColor = '#6366f1'; // Indigo
            iconType = 'moon';
        }

        // 2. Generate SVG for "AI Node"
        // - Core: Central glowing circle
        // - HUD: Rotating rings (SVG Animation)
        // - Icon: Central status symbol

        // Define Icon Paths
        const icons = {
            sun: '<circle cx="24" cy="24" r="6" fill="white"/>',
            bolt: '<path d="M26 14l-6 10h4l-4 10" stroke="white" stroke-width="3" fill="none" transform="translate(2, -6)"/>',
            drop: '<path d="M24 14c0 0-6 8-6 11s2.5 6 6 6 6-3 6-6-6-11-6-11z" fill="white"/>',
            snowflake: '<path d="M24 16v16M16 24h16M18 18l12 12M30 18L18 30" stroke="white" stroke-width="2" stroke-linecap="round"/>',
            flame: '<path d="M24 14c-3 0-5 3-5 7s3 7 5 7 5-3 5-7-2-7-5-7z" fill="white"/>', // simplified
            moon: '<path d="M28 18a8 8 0 1 1-8 8 6 6 0 0 0 8-8z" fill="white"/>'
        };

        const svgContent = `
        <svg viewBox="0 0 48 48" class="w-12 h-12">
            <defs>
                <filter id="glow-${mood}" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                </filter>
                <linearGradient id="grad-${mood}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${mainColor}" stop-opacity="0.8"/>
                    <stop offset="100%" stop-color="${mainColor}" stop-opacity="0.1"/>
                </linearGradient>
            </defs>
            
            <!-- Rotating Outer Ring (HUD) -->
            <g transform-origin="24 24">
                <circle cx="24" cy="24" r="22" stroke="${mainColor}" stroke-width="1" fill="none" stroke-dasharray="10 20" opacity="0.5"/>
                <circle cx="24" cy="24" r="18" stroke="${mainColor}" stroke-width="0.5" fill="none" stroke-dasharray="60 60" opacity="0.3"/>
                <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="10s" repeatCount="indefinite"/>
            </g>

            <!-- Counter-Rotating Inner Ring -->
            <g transform-origin="24 24">
                <path d="M24 10 A 14 14 0 0 1 38 24" stroke="${mainColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
                <path d="M24 38 A 14 14 0 0 1 10 24" stroke="${mainColor}" stroke-width="2" fill="none" stroke-linecap="round"/>
                <animateTransform attributeName="transform" type="rotate" from="360 24 24" to="0 24 24" dur="5s" repeatCount="indefinite"/>
            </g>

            <!-- Core Glow -->
            <circle cx="24" cy="24" r="8" fill="url(#grad-${mood})" filter="url(#glow-${mood})">
                <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite"/>
            </circle>
            
            <!-- Central Icon (Fixed) -->
            <g transform="scale(0.6) translate(16,16)">
                ${icons[iconType] || icons.sun}
            </g>
        </svg>
        `;

        ui.avatarIcon.innerHTML = svgContent;
        ui.avatarIcon.classList.remove('material-symbols-rounded'); // Remove font icon class
    }

    async function fetchWeather(lat, lon, name) {
        toggleSkeleton(true);
        // Reset slider on new fetch
        ui.timeSlider.value = 0;
        STATE.timeOffset = 0;
        STATE.selectedDayIndex = 0; // Reset selected day to Today
        updateSimulationState(); // Reset UI state

        try {
            // UPDATED FETCH URL: Added 'is_day', 'wind_speed_10m', 'relative_humidity_2m' to hourly for simulation
            // NOTE: forecast_days=8 is crucial for the 7-day selection feature
            // NEW: Added soil temp and soil moisture to current
            const [w, a] = await Promise.all([
                fetch(`${CONFIG.weather}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,visibility,uv_index,dew_point_2m,rain,showers,snowfall,soil_temperature_0cm,soil_moisture_0_to_1cm&hourly=temperature_2m,weather_code,precipitation_probability,is_day,wind_speed_10m,wind_direction_10m,relative_humidity_2m,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto&forecast_days=8`).then(r => r.json()),
                // NEW: Added pollen to AQI fetch
                fetch(`${CONFIG.aqi}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,nitrogen_dioxide,ozone,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen`).then(r => r.json())
            ]);

            // IDEA 7: FETCH MARINE DATA (Only works if location is near sea)
            // We fetch it gracefully; if it returns null (land), we ignore it.
            const m = await fetch(`${CONFIG.marine}?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period&daily=wave_height_max&timezone=auto`)
                .then(r => {
                    if (!r.ok) return null;
                    return r.json();
                })
                .catch(() => null);

            // Store it in STATE
            STATE.data = {
                ...w,
                aqi: a.current,
                marine: (m && m.current && m.current.wave_height !== null) ? m : null, // Store only if valid wave data
                cityName: name,
                lat,
                lon,
                timestamp: Date.now()
            };

            // FETCH NEW MODULES
            fetchHistory(lat, lon, w.timezone); // Trigger Chrono-Log
            fetchISS(lat, lon); // Trigger Cosmic Radar

            // SAVE TO CACHE
            localStorage.setItem(CACHE_KEY, JSON.stringify(STATE.data));

            // Simulate minimal network delay for skeleton effect demonstration
            setTimeout(() => { renderUI(); toggleSkeleton(false); }, 600);
        } catch (e) { console.error(e); ui.city.textContent = "Error"; setStatus('update'); }
    }

    // --- NEW FEATURE 1: CHRONO-LOG (History) ---
    async function fetchHistory(lat, lon, timezone) {
        ui.historyBadge.classList.add('hidden'); // Reset state

        // Calculate "Today Last Year"
        const today = new Date();
        const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        const dateStr = lastYear.toISOString().split('T')[0]; // YYYY-MM-DD

        try {
            const url = `${CONFIG.archive}?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_mean&timezone=${timezone}`;
            const res = await fetch(url).then(r => r.json());

            if (res.daily && res.daily.temperature_2m_mean && res.daily.temperature_2m_mean.length > 0) {
                const histTemp = res.daily.temperature_2m_mean[0];
                STATE.historyData = { date: dateStr, temp: histTemp };
                updateHistoryUI();
            }
        } catch (e) { console.log("History Fetch Failed", e); }
    }

    function updateHistoryUI() {
        if (!STATE.historyData || !STATE.data) return;

        const currentTemp = STATE.data.current.temperature_2m;
        const histTemp = STATE.historyData.temp;
        const diff = currentTemp - histTemp;

        let diffVal = Math.abs(Math.round(diff));
        if (!STATE.metric) diffVal = Math.round(diffVal * 1.8); // Convert delta F

        if (Math.abs(diff) < 1) {
            // Ignore minor changes
            return;
        }

        ui.historyText.textContent = `${diff > 0 ? 'Warmer' : 'Colder'} than last year (+${diffVal}°)`;
        ui.historyBadge.className = `history-badge ${diff > 0 ? 'warmer' : 'colder'} ml-2 animate-pulse`;
        ui.historyBadge.classList.remove('hidden');
    }

    // --- NEW FEATURE 2: COSMIC RADAR (ISS) ---
    function fetchISS(userLat, userLon) {
        if (STATE.issInterval) clearInterval(STATE.issInterval);

        const updateISS = async () => {
            try {
                const data = await fetch(CONFIG.iss).then(r => r.json());
                const issLat = data.latitude;
                const issLon = data.longitude;

                // Calculate Distance (Haversine approximation)
                const R = 6371; // Earth Radius km
                const dLat = (issLat - userLat) * Math.PI / 180;
                const dLon = (issLon - userLon) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(userLat * Math.PI / 180) * Math.cos(issLat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const dist = Math.round(R * c);

                ui.issDistance.textContent = `${dist.toLocaleString()} km away`;
                ui.issLocation.textContent = `LAT ${issLat.toFixed(2)}  LON ${issLon.toFixed(2)}`;

                // Visual Radar Position (Scaled to radar div)
                const scale = 60 / 10000; // 60px radius / 10000km
                const y = Math.sin(dLon) * Math.cos(issLat * Math.PI / 180);
                const x = Math.cos(userLat * Math.PI / 180) * Math.sin(issLat * Math.PI / 180) -
                    Math.sin(userLat * Math.PI / 180) * Math.cos(issLat * Math.PI / 180) * Math.cos(dLon);
                const bearing = Math.atan2(y, x);

                const r = Math.min(dist * scale, 60); // Cap at edge
                const cssX = 50 + (r / 64 * 50) * Math.sin(bearing); // %
                const cssY = 50 - (r / 64 * 50) * Math.cos(bearing); // %

                ui.issMarker.style.top = `${cssY}%`;
                ui.issMarker.style.left = `${cssX}%`;
                ui.issMarker.classList.remove('opacity-0');

            } catch (e) { console.log("ISS Fetch Failed"); }
        };

        updateISS();
        STATE.issInterval = setInterval(updateISS, 5000); // Poll every 5s
    }

    // New helper to get the data frame (Current vs Simulated)
    function getRenderData() {
        if (!STATE.data) return null;

        // If viewing Today (Live) and offset is 0
        if (STATE.timeOffset === 0 && STATE.selectedDayIndex === 0) return STATE.data.current;

        // Simulation Mode (Future Hour OR Future Day)

        // 1. Determine Target Time
        // Offset for days: selectedDayIndex * 24 hours
        // Offset for slider: timeOffset hours
        const hourOffsetTotal = (STATE.selectedDayIndex * 24) + STATE.timeOffset;

        const now = new Date();
        const targetTime = new Date(now.getTime() + hourOffsetTotal * 3600000);

        // 2. Find closest index in STATE.data.hourly.time
        let targetIndex = 0;
        let minDiff = Infinity;

        // We assume hourly data covers enough range (192 hours)
        STATE.data.hourly.time.forEach((t, i) => {
            const diff = Math.abs(new Date(t).getTime() - targetTime.getTime());
            if (diff < minDiff) {
                minDiff = diff;
                targetIndex = i;
            }
        });

        const h = STATE.data.hourly;

        return {
            temperature_2m: h.temperature_2m[targetIndex],
            relative_humidity_2m: h.relative_humidity_2m[targetIndex] || STATE.data.current.relative_humidity_2m,
            apparent_temperature: h.temperature_2m[targetIndex], // Approx
            is_day: h.is_day[targetIndex],
            precipitation: h.precipitation_probability[targetIndex] > 30 ? 1 : 0, // Approx logic
            weather_code: h.weather_code[targetIndex],
            wind_speed_10m: h.wind_speed_10m[targetIndex] || STATE.data.current.wind_speed_10m,
            wind_direction_10m: h.wind_direction_10m[targetIndex] || STATE.data.current.wind_direction_10m,
            wind_gusts_10m: STATE.data.current.wind_gusts_10m, // Hourly doesn't always have gusts in basic query
            surface_pressure: STATE.data.current.surface_pressure,
            visibility: h.visibility ? h.visibility[targetIndex] : STATE.data.current.visibility,
            uv_index: STATE.data.current.uv_index, // Keep current for simplicity or approximate
            _isSimulated: true,
            _targetTime: targetTime,
            _targetIndex: targetIndex // Helpful for charts
        };
    }

    // SOLAR TRACKER LOGIC (UPDATED FOR GOLDEN/BLUE HOUR)
    function updateSolarTracker(sunriseStr, sunsetStr, timezone, customTimeDate) {
        const now = customTimeDate || new Date();
        const sunrise = new Date(sunriseStr);
        const sunset = new Date(sunsetStr);
        const nowTime = now.getTime();
        const riseTime = sunrise.getTime();
        const setTime = sunset.getTime();

        ui.sunrise.textContent = sunrise.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
        ui.sunset.textContent = sunset.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });

        // 1. Position Logic
        let pct = 0;
        const isDay = nowTime >= riseTime && nowTime <= setTime;

        if (isDay) {
            pct = (nowTime - riseTime) / (setTime - riseTime);
            ui.markerSun.classList.remove('opacity-0');
            ui.markerMoon.classList.add('opacity-0');
        } else {
            ui.markerSun.classList.add('opacity-0');
            ui.markerMoon.classList.remove('opacity-0');
            const prevSunset = setTime - 86400000;
            const nextSunrise = riseTime + 86400000;
            if (nowTime > setTime) {
                pct = (nowTime - setTime) / (nextSunrise - setTime);
            } else {
                pct = (nowTime - (riseTime - 43200000)) / 43200000;
            }
        }
        pct = Math.max(0, Math.min(1, pct));
        const angle = Math.PI - (pct * Math.PI);
        const r = 90;
        const cx = 100;
        const cy = 90;
        const x = cx + r * Math.cos(angle);
        const y = cy - r * Math.sin(angle);
        ui.solarMarker.style.transform = `translate(${x}px, ${y}px)`;

        // 2. VISUALIZATION ZONES (Golden/Blue Hour)
        // We modify the SVG in ui.celestial-tracker
        const svg = document.querySelector('#celestial-tracker svg');
        // Clear old overlays (keep track and markers)
        const oldZones = svg.querySelectorAll('.sun-zone');
        oldZones.forEach(z => z.remove());

        // Helper to draw arc segment
        // The arc is 180 degrees (PI). M 10 90 A 90 90 0 0 1 190 90
        // 0% is at (10,90), 100% is at (190,90). 
        // Logic: Arc length is based on time. 
        // Golden Hour Morning: Sunrise to +1h
        // Golden Hour Evening: Sunset -1h to Sunset
        // Blue Hour: -30min to Sunrise, Sunset to +30min

        // Since we map 0% (Sunrise) to 100% (Sunset) on the main arc for DAYTIME,
        // we can overlay the Day Golden Hours easily.
        // Duration of day:
        const dayDuration = setTime - riseTime;
        const oneHour = 3600000;
        const gStartPct = 0;
        const gEndPct = (oneHour / dayDuration); // e.g. 0.08
        const g2StartPct = 1 - (oneHour / dayDuration);
        const g2EndPct = 1;

        // Draw Arc Segment function
        const createArc = (startPct, endPct, color) => {
            const r = 90, cx = 100, cy = 90;
            // Convert percent to angle (0% = PI, 100% = 0)
            const startAngle = Math.PI * (1 - startPct);
            const endAngle = Math.PI * (1 - endPct);

            const x1 = cx + r * Math.cos(startAngle);
            const y1 = cy - r * Math.sin(startAngle);
            const x2 = cx + r * Math.cos(endAngle);
            const y2 = cy - r * Math.sin(endAngle);

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`);
            path.setAttribute("stroke", color);
            path.setAttribute("stroke-width", "4");
            path.setAttribute("fill", "none");
            path.setAttribute("class", "sun-zone opacity-50");
            return path;
        };

        // Morning Golden Hour (Orange)
        if (dayDuration > 0) {
            svg.insertBefore(createArc(0, Math.min(0.15, oneHour / dayDuration), '#f59e0b'), svg.firstChild);
            // Evening Golden Hour (Orange)
            svg.insertBefore(createArc(Math.max(0.85, 1 - oneHour / dayDuration), 1, '#f59e0b'), svg.firstChild);

            // Blue Hour (Indigo) - approximated as narrow bands just inside/outside horizon
            // For simplicity, we visualise them as the tips of the twilight
            // Just add small blue tips at ends
            svg.insertBefore(createArc(-0.05, 0, '#6366f1'), svg.firstChild); // Morning Blue
            svg.insertBefore(createArc(1, 1.05, '#6366f1'), svg.firstChild); // Evening Blue
        }
    }

    function renderChart(hourly) {
        if (STATE.chart) STATE.chart.destroy();
        const ctx = ui.chartCanvas.getContext('2d');

        // Calculate Start Hour for the Chart
        // Ideally starts at the beginning of the SELECTED DAY + Current Time
        const now = new Date().getHours();
        const startOffset = now + (STATE.selectedDayIndex * 24);

        const labels = [], data = [], rain = [];
        let sumTemp = 0;

        // Show 24 hours from the start point
        for (let i = 0; i < 24; i++) {
            const idx = startOffset + i;
            if (idx >= hourly.time.length) break; // Safety check

            // Format label: Hour:00
            const hour = new Date(hourly.time[idx]).getHours();
            labels.push(`${hour}:00`);

            let t = hourly.temperature_2m[idx];
            if (!STATE.metric) t = t * 1.8 + 32;
            data.push(t); sumTemp += t;
            rain.push(hourly.precipitation_probability[idx]);
        }
        const avg = sumTemp / 24; const isHot = STATE.metric ? avg > 25 : avg > 77;
        const color = isHot ? '#f97316' : '#22d3ee';

        STATE.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels, datasets: [
                    { label: 'Temp', data, borderColor: color, backgroundColor: (c) => { const g = c.chart.ctx.createLinearGradient(0, 0, 0, 200); g.addColorStop(0, isHot ? 'rgba(249,115,22,0.3)' : 'rgba(34,211,238,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); return g; }, borderWidth: 2, tension: 0.4, fill: true, yAxisID: 'y' },
                    { label: 'Rain %', data: rain, borderColor: '#3b82f6', borderDash: [5, 5], borderWidth: 1, pointRadius: 0, fill: false, yAxisID: 'y1' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(10, 14, 24, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#cbd5e1',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += Math.round(context.parsed.y);
                                    if (context.dataset.yAxisID === 'y') label += STATE.metric ? '°C' : '°F';
                                    else label += '%';
                                }
                                return label;
                            }
                        }
                    },
                    // SIMULATION LINE
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: STATE.timeOffset, // Match slider value relative to the start of the chart
                                xMax: STATE.timeOffset,
                                borderColor: 'white',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: 'NOW',
                                    display: true,
                                    position: 'start'
                                }
                            }
                        }
                    }
                },
                scales: { x: { display: false }, y: { display: false }, y1: { display: false, min: 0, max: 100 } }
            },
            plugins: [{
                id: 'simLine',
                afterDraw: (chart) => {
                    // Only draw if within 24h range
                    if (STATE.timeOffset >= 0 && STATE.timeOffset < 24) {
                        const ctx = chart.ctx;
                        const xAxis = chart.scales.x;
                        const yAxis = chart.scales.y;
                        const x = xAxis.getPixelForValue(STATE.timeOffset); // Slider value matches chart index 0-23

                        if (x) {
                            ctx.save();
                            ctx.beginPath();
                            ctx.moveTo(x, yAxis.top);
                            ctx.lineTo(x, yAxis.bottom);
                            ctx.lineWidth = 2;
                            ctx.strokeStyle = '#a855f7';
                            ctx.setLineDash([5, 5]);
                            ctx.stroke();
                            ctx.restore();
                        }
                    }
                }
            }]
        });
    }

    // Handle clicking a day in the 7-day list
    window.selectDay = (index) => {
        STATE.selectedDayIndex = index;
        STATE.timeOffset = 0; // Reset slider to "Current Time" of that day
        ui.timeSlider.value = 0;
        updateSliderTooltip(); // Reset tooltip pos
        updateSimulationState();
        renderUI();
    };

    // Reset button logic
    ui.resetDayBtn.onclick = () => {
        window.selectDay(0);
    };

    // --- NEW FUNCTION: Show Full Environmental Scan ---
    window.showFullEnvScan = () => {
        const d = STATE.data;
        if (!d) return;

        ui.exploreTitle.textContent = "Environmental Scan";
        ui.exploreSubtitle.textContent = "Full Sensor Readout";
        ui.exploreContent.innerHTML = ''; // Clear previous
        ui.exploreContent.classList.remove('hidden');
        ui.exploreLoading.classList.add('hidden'); // Fix: Ensure loading is hidden
        ui.exploreMap.classList.add('hidden');

        // Helper to create cards
        const createCard = (icon, title, value, sub, color) => {
            return `
            <div class="glass p-4 border border-white/10 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-${color}-500/20 flex items-center justify-center text-${color}-400">
                        <span class="material-symbols-rounded">${icon}</span>
                    </div>
                    <div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wider font-bold">${title}</div>
                        <div class="text-lg font-bold text-white">${value}</div>
                    </div>
                </div>
                <div class="text-xs text-gray-500 text-right">${sub}</div>
            </div>`;
        };

        let html = '<div class="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

        // Atmosphere
        html += createCard('compress', 'Pressure', `${Math.round(d.current.surface_pressure)} hPa`, 'Atmospheric', 'purple');
        html += createCard('visibility', 'Visibility', `${(d.current.visibility / 1000).toFixed(1)} km`, 'Optical Range', 'yellow');
        html += createCard('water_drop', 'Humidity', `${d.current.relative_humidity_2m}%`, `Dew: ${d.current.dew_point_2m}°`, 'blue');

        // Terrain
        if (d.current.soil_temperature_0cm !== undefined) {
            let sTemp = d.current.soil_temperature_0cm;
            if (!STATE.metric) sTemp = sTemp * 1.8 + 32;
            html += createCard('landscape', 'Soil Temp', `${Math.round(sTemp)}°`, `Moist: ${d.current.soil_moisture_0_to_1cm} m³/m³`, 'green');
        }

        // Marine
        if (d.marine && d.marine.current && d.marine.current.wave_height !== null) {
            html += createCard('waves', 'Wave Height', `${d.marine.current.wave_height} m`, `${d.marine.current.wave_direction}° Dir`, 'cyan');
        }

        // Pollen (Bio)
        const aqi = d.aqi;
        if (aqi) {
            const pollens = [
                { n: 'Grass', v: aqi.grass_pollen }, { n: 'Birch', v: aqi.birch_pollen },
                { n: 'Ragweed', v: aqi.ragweed_pollen }, { n: 'Olive', v: aqi.olive_pollen }
            ];
            pollens.forEach(p => {
                if (p.v !== null) html += createCard('local_florist', `${p.n} Pollen`, `${p.v}`, 'µg/m³', 'pink');
            });
            html += createCard('air', 'PM 2.5', `${aqi.pm2_5}`, 'µg/m³', 'gray');
        }

        html += '</div>';

        ui.exploreContent.innerHTML = html;
        ui.exploreModal.classList.add('open');
    };

    function renderUI() {
        const d = STATE.data;
        if (!d) return;

        const cur = getRenderData();
        const isDay = cur.is_day === 1;

        // Moon Phase
        const phase = getMoonPhase(new Date());
        updateMoonWidget(phase);

        setAtmosphere(cur.weather_code, isDay);
        updateHistoryUI();

        // IDEA 10: UPDATE AVATAR
        updateAvatar(cur.weather_code, cur.temperature_2m, isDay);

        // Update Audio & Survival

        if (updateSurvivalMetrics) updateSurvivalMetrics(cur.temperature_2m, cur.wind_speed_10m || 0, 0, isDay);


        // Main Icon update
        const meta = weatherMeta[cur.weather_code] || weatherMeta[0];
        ui.desc.textContent = meta.type.toUpperCase();
        ui.bgIcon.textContent = meta.type === 'clear' ? (isDay ? 'sunny' : 'clear_night') : meta.type === 'cloudy' ? 'partly_cloudy_day' : meta.type === 'overcast' ? 'cloud' : meta.type === 'rain' ? 'rainy' : meta.type === 'snow' ? 'weather_snowy' : 'thunderstorm';

        // Main
        ui.city.textContent = d.cityName;

        // Temps
        let t = cur.temperature_2m, fl = cur.apparent_temperature;

        // For Min/Max, we need to grab from daily array based on selectedDayIndex
        let mx = d.daily.temperature_2m_max[STATE.selectedDayIndex];
        let mn = d.daily.temperature_2m_min[STATE.selectedDayIndex];

        if (!STATE.metric) { const f = c => c * 1.8 + 32; t = f(t); fl = f(fl); mx = f(mx); mn = f(mn); }
        ui.temp.textContent = Math.round(t); ui.feels.textContent = Math.round(fl) + '°';
        ui.tempMax.textContent = Math.round(mx) + '°'; ui.tempMin.textContent = Math.round(mn) + '°';
        document.title = `${d.cityName} • ${Math.round(t)}° | Aether`;

        // Clock
        if (STATE.timer) clearInterval(STATE.timer);

        const updateClockVisuals = () => {
            const baseTime = (cur._isSimulated && cur._targetTime) ? cur._targetTime : new Date();
            ui.time.textContent = baseTime.toLocaleTimeString('en-US', { timeZone: d.timezone, hour: '2-digit', minute: '2-digit', hour12: false });

            // Update sunrise/set for the selected day
            ui.date.textContent = baseTime.toLocaleDateString('en-US', { timeZone: d.timezone, weekday: 'short', month: 'short', day: 'numeric' });

            updateSolarTracker(
                d.daily.sunrise[STATE.selectedDayIndex],
                d.daily.sunset[STATE.selectedDayIndex],
                d.timezone,
                baseTime
            );
        };

        if (cur._isSimulated) {
            updateClockVisuals();
        } else {
            const tick = () => {
                const now = new Date();
                ui.time.textContent = now.toLocaleTimeString('en-US', { timeZone: d.timezone, hour: '2-digit', minute: '2-digit', hour12: false });
                ui.date.textContent = now.toLocaleDateString('en-US', { timeZone: d.timezone, weekday: 'short', month: 'short', day: 'numeric' });
                updateSolarTracker(d.daily.sunrise[0], d.daily.sunset[0], d.timezone, now);
            };
            tick();
            STATE.timer = setInterval(tick, 1000);
        }

        // GEAR ADVISOR LOGIC
        let gear = "Standard kit. Conditions normal.";
        const c = cur.weather_code;
        if (c >= 95) gear = "Hazard suit. Stay indoors.";
        else if (c >= 71) gear = "Thermal layers & heavy coat required.";
        else if (c >= 51 || cur.precipitation > 0) gear = "Waterproof shell & umbrella advised.";
        else if (cur.wind_speed_10m > 30) gear = "Windbreaker recommended.";
        else if (t < (STATE.metric ? 5 : 41)) gear = "Warm coat & gloves needed.";
        else if (t > (STATE.metric ? 25 : 77)) gear = "Breathable fabrics & sunglasses.";
        else if (cur.uv_index > 6) gear = "Sun protection required.";
        ui.gearMsg.textContent = gear;

        // Assistant Risk
        let tags = [], risk = 0;
        if (cur.weather_code >= 95) { tags.push("STORM"); risk = 2; }
        if (cur.precipitation > 0) { tags.push("RAIN"); risk = 1; }
        if (cur.uv_index > 6) { tags.push("HIGH UV"); risk = 1; }
        if (t < (STATE.metric ? 5 : 41)) { tags.push("FREEZING"); risk = 1; }

        ui.aiTitle.textContent = risk === 2 ? "Hazardous" : risk === 1 ? "Caution" : "Optimal";
        ui.aiText.textContent = risk === 2 ? "Severe weather. Seek shelter." : risk === 1 ? "Atmosphere unstable. Prepare accordingly." : "Conditions are stable. Proceed with operations.";
        ui.aiIcon.textContent = risk === 2 ? "warning" : risk === 1 ? "info" : "check_circle";
        ui.aiTags.innerHTML = tags.map(t => `<span class="px-2 py-0.5 rounded bg-cyan-500/20 text-[10px] font-bold text-cyan-200 border border-cyan-500/30">${t}</span>`).join('');

        // Metrics
        ui.windVal.textContent = Math.round(cur.wind_speed_10m);
        ui.windGusts.textContent = `Gusts: ${Math.round(cur.wind_gusts_10m)}`;
        ui.windIcon.style.transform = `rotate(${cur.wind_direction_10m}deg)`;
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        ui.windDir.textContent = dirs[Math.round(cur.wind_direction_10m / 45) % 8] || 'N';

        ui.humidVal.textContent = cur.relative_humidity_2m;
        ui.visVal.textContent = (cur.visibility / 1000).toFixed(1);
        ui.presVal.textContent = Math.round(cur.surface_pressure);
        ui.uvVal.textContent = cur.uv_index.toFixed(1);
        ui.uvBar.style.width = Math.min((cur.uv_index / 11) * 100, 100) + '%';

        // Update Survival & AI Logs
        updateSurvivalMetrics(cur.temperature_2m, cur.wind_speed_10m, cur.weather_code, cur.is_day === 1);
        updateAvatar(cur.weather_code, cur.temperature_2m, cur.is_day === 1);

        // --- IDEA 7 & 8: CONTEXT AWARE DATA SWAP (Marine > Pollen > Terrain > Pressure) ---

        const card = ui.presVal.closest('.glass');
        if (card) {
            // Check for Bio-Scan (Pollen) - High Pollen Trigger
            const aqi = d.aqi;
            const highPollen = (aqi && (aqi.alder_pollen > 10 || aqi.birch_pollen > 10 || aqi.grass_pollen > 10 || aqi.mugwort_pollen > 10 || aqi.olive_pollen > 10 || aqi.ragweed_pollen > 10));

            // Shared "View All" Button HTML
            // New (Bigger, more visible)
            const viewAllBtn = `<button onclick="showFullEnvScan()" class="absolute top-2 right-2 p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all group shadow-lg" title="View Full Scan"><span class="material-symbols-rounded text-lg group-hover:scale-110 transition-transform">open_in_full</span></button>`;

            // PRIORITY 1: MARINE (Waves)
            if (d.marine && d.marine.current && d.marine.current.wave_height > 0) {
                const waveH = d.marine.current.wave_height;
                const waveDir = d.marine.current.wave_direction;
                card.innerHTML = `
                    ${viewAllBtn}
                    <span class="text-[10px] font-bold text-cyan-300 uppercase tracking-widest animate-pulse">Marine</span>
                    <span class="material-symbols-rounded text-blue-400 text-2xl">waves</span>
                    <div class="leading-none"><span class="text-lg font-bold text-white">${waveH.toFixed(1)}</span> <span class="text-[10px] text-gray-400">m</span></div>
                    <div class="text-[9px] text-gray-500 mt-1">${Math.round(waveDir)}° Direction</div>
                `;
            }
            // PRIORITY 2: BIO-SENTRY (High Pollen Alert)
            else if (highPollen) {
                // Find highest pollen source
                let maxP = 0; let name = "General";
                if (aqi.grass_pollen > maxP) { maxP = aqi.grass_pollen; name = "Grass"; }
                if (aqi.birch_pollen > maxP) { maxP = aqi.birch_pollen; name = "Birch"; }
                if (aqi.ragweed_pollen > maxP) { maxP = aqi.ragweed_pollen; name = "Ragweed"; }

                card.innerHTML = `
                    ${viewAllBtn}
                    <span class="text-[10px] font-bold text-yellow-300 uppercase tracking-widest animate-pulse">Bio-Scan</span>
                    <span class="material-symbols-rounded text-yellow-400 text-2xl">local_florist</span>
                    <div class="leading-none"><span class="text-lg font-bold text-white">${maxP}</span> <span class="text-[10px] text-gray-400">µg/m³</span></div>
                    <div class="text-[9px] text-gray-500 mt-1">High: ${name}</div>
                `;
            }
            // PRIORITY 3: TERRAIN SCAN (Soil Data - Default Land)
            else if (cur.soil_temperature_0cm !== undefined) {
                let sTemp = cur.soil_temperature_0cm;
                if (!STATE.metric) sTemp = sTemp * 1.8 + 32;
                const sMoist = cur.soil_moisture_0_to_1cm;

                card.innerHTML = `
                    ${viewAllBtn}
                    <span class="text-[10px] font-bold text-green-400 uppercase tracking-widest">Terrain</span>
                    <span class="material-symbols-rounded text-green-600 text-2xl">landscape</span>
                    <div class="leading-none"><span class="text-lg font-bold text-white">${Math.round(sTemp)}°</span> <span class="text-[10px] text-gray-400">Soil</span></div>
                    <div class="text-[9px] text-gray-500 mt-1">Moist: ${sMoist.toFixed(2)} m³/m³</div>
                `;
            }
            // PRIORITY 4: FALLBACK (Pressure)
            else {
                // Check if we need to reset innerHTML (if swapped previously)
                // Or if it was already pressure, we just update value. 
                // Since we replace innerHTML completely above, we must rebuild it if falling back.
                // We add relative positioning to container just in case via class (it has glass which has relative)
                card.innerHTML = `
                    ${viewAllBtn}
                    <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pressure</span>
                    <span class="material-symbols-rounded text-purple-300 text-2xl">compress</span>
                    <div class="leading-none"><span class="text-lg font-bold text-white skeleton" id="pres-val">${Math.round(cur.surface_pressure)}</span> <span class="text-[10px] text-gray-400">hPa</span></div>
                 `;
                ui.presVal = document.getElementById('pres-val'); // Re-bind
            }
        }

        ui.aqiBadge.textContent = d.aqi.us_aqi <= 50 ? 'Good' : d.aqi.us_aqi <= 100 ? 'Moderate' : 'Poor';
        ui.aqiBadge.className = `text-xs font-bold px-2 py-1 rounded bg-${d.aqi.us_aqi <= 50 ? 'green' : d.aqi.us_aqi <= 100 ? 'yellow' : 'red'}-500/20 text-${d.aqi.us_aqi <= 50 ? 'green' : d.aqi.us_aqi <= 100 ? 'yellow' : 'red'}-400`;
        ui.pm25.textContent = d.aqi.pm2_5; ui.no2.textContent = d.aqi.nitrogen_dioxide; ui.o3.textContent = d.aqi.ozone;

        // Activity Logic
        const setActivity = (id, score, text, colorClass) => {
            ui[id].textContent = text;
            ui[id].className = `text-sm font-bold ${colorClass}`;
        };

        // Running (Ideal: 10-20C, No Rain, Low Wind)
        let runScore = "Good"; let runColor = "text-green-400";
        if (cur.precipitation > 0 || cur.wind_speed_10m > 30 || cur.temperature_2m > 30 || cur.temperature_2m < 5) { runScore = "Poor"; runColor = "text-red-400"; }
        else if (cur.temperature_2m >= 10 && cur.temperature_2m <= 22) { runScore = "Ideal"; runColor = "text-cyan-400"; }
        setActivity('actRun', runScore, runScore, runColor);

        // Driving (Vis < 2000m, Rain/Snow codes)
        let driveScore = "Good"; let driveColor = "text-green-400";
        if (cur.visibility < 2000 || cur.weather_code >= 71) { driveScore = "Hazardous"; driveColor = "text-red-400"; }
        else if (cur.precipitation > 2 || cur.weather_code >= 51) { driveScore = "Caution"; driveColor = "text-yellow-400"; }
        setActivity('actDrive', driveScore, driveScore, driveColor);

        // Outdoor (UV, AQI, Rain)
        let outScore = "Great"; let outColor = "text-green-400";
        if (d.aqi.us_aqi > 150 || cur.precipitation > 0 || cur.uv_index >= 8) { outScore = "Limit"; outColor = "text-red-400"; }
        else if (d.aqi.us_aqi > 100 || cur.uv_index >= 6) { outScore = "Moderate"; outColor = "text-yellow-400"; }
        setActivity('actOut', outScore, outScore, outColor);

        // Health (AQI, Extreme Temps)
        let healthScore = "Good"; let healthColor = "text-green-400";
        if (d.aqi.us_aqi > 150 || cur.temperature_2m > 35 || cur.temperature_2m < -10) { healthScore = "Risk"; healthColor = "text-red-400"; }
        else if (d.aqi.us_aqi > 100) { healthScore = "Fair"; healthColor = "text-yellow-400"; }
        setActivity('actHealth', healthScore, healthScore, healthColor);

        // Forecast List
        ui.forecast.innerHTML = '';
        // Only show 0 to 7. 0 is Today.
        for (let i = 0; i < 8; i++) {
            const code = d.daily.weather_code[i];
            const m = weatherMeta[code] || weatherMeta[0];
            let mx = d.daily.temperature_2m_max[i], mn = d.daily.temperature_2m_min[i];
            if (!STATE.metric) { mx = mx * 1.8 + 32; mn = mn * 1.8 + 32; }
            const dateObj = new Date(d.daily.time[i]);
            let day = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            if (i === 0) day = "Today";

            const pop = d.daily.precipitation_probability_max[i];

            // Interaction: Check if selected
            const isActive = i === STATE.selectedDayIndex;
            const activeClass = isActive ? 'active-day bg-cyan-500/10 border-cyan-500/30' : 'bg-white/5 hover:bg-white/10 border-white/5';

            const row = document.createElement('div');
            row.className = `forecast-row flex items-center justify-between p-3 rounded-xl transition-colors border ${activeClass}`;
            row.onclick = () => window.selectDay(i);

            row.innerHTML = `<div class="w-16"><div class="font-bold text-gray-300 text-sm">${day}</div>${pop > 20 ? `<div class="text-[9px] text-blue-400 font-bold">${pop}% Rain</div>` : ''}</div>
            <span class="material-symbols-rounded text-cyan-400 text-xl">${m.type === 'clear' ? 'sunny' : m.type === 'rain' ? 'rainy' : m.type === 'cloudy' ? 'partly_cloudy_day' : 'cloud'}</span>
            <div class="text-sm font-mono font-bold text-right"><span class="text-white">${Math.round(mx)}°</span> <span class="text-gray-500">/ ${Math.round(mn)}°</span></div>`;
            ui.forecast.appendChild(row);
        }

        renderChart(d.hourly);
        ui.radar.src = `https://embed.windy.com/embed.html?lat=${d.latitude}&lon=${d.longitude}&zoom=7&overlay=rain&menu=&metricWind=${STATE.metric ? 'kmh' : 'kt'}&metricTemp=${STATE.metric ? '°C' : '°F'}&isolines=false`;
        renderFavs();
    }

    // Interaction
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
        t.onclick = () => {
            // Handle Cosmic Tab Switching
            if (t.dataset.tab === 'celestial-tracker' || t.dataset.tab === 'cosmic-radar') {
                const tracker = el('celestial-tracker');
                const radar = el('cosmic-radar');
                const btns = t.parentElement.querySelectorAll('.tab-btn');

                btns.forEach(b => b.classList.remove('active', 'text-white'));
                t.classList.add('active', 'text-white');

                if (t.dataset.tab === 'celestial-tracker') {
                    tracker.style.opacity = '1'; tracker.style.pointerEvents = 'auto';
                    radar.style.opacity = '0'; radar.style.pointerEvents = 'none';
                } else {
                    tracker.style.opacity = '0'; tracker.style.pointerEvents = 'none';
                    radar.style.opacity = '1'; radar.style.pointerEvents = 'auto';
                }
                return;
            }

            // Handle Assistant Tab Switching
            tabs.forEach(b => {
                // Only remove active from assistant tabs
                if (!b.parentElement.classList.contains('bg-black/20')) b.classList.remove('active');
            });

            if (!t.parentElement.classList.contains('bg-black/20')) t.classList.add('active');

            ['tab-overview', 'tab-health', 'tab-survival', 'tab-logs', 'tab-activity'].forEach(id => {
                const p = el(id);
                if (p) {
                    if (id === t.dataset.tab) { p.style.opacity = '1'; p.style.pointerEvents = 'auto'; } else { p.style.opacity = '0'; p.style.pointerEvents = 'none'; }
                }
            });
        };
    });

    let debounce;
    ui.input.addEventListener('input', e => {
        const q = e.target.value;
        if (q.length > 0) ui.clearBtn.classList.remove('hidden'); else ui.clearBtn.classList.add('hidden');
        clearTimeout(debounce);
        debounce = setTimeout(async () => {
            if (q.length < 3) { ui.suggestions.classList.add('hidden'); return; }
            const r = await fetch(`${CONFIG.geo}?name=${q}&count=5`).then(res => res.json());
            ui.suggestions.innerHTML = '';
            if (r.results) {
                r.results.forEach(p => {
                    const d = document.createElement('div'); d.className = "px-5 py-3 hover:bg-cyan-500/20 cursor-pointer text-sm text-white border-b border-white/5 flex justify-between";
                    d.innerHTML = `<span>${p.name}</span><span class="text-xs text-gray-500 font-bold uppercase">${p.country}</span>`;
                    d.onclick = () => { fetchWeather(p.latitude, p.longitude, p.name); ui.input.value = ''; ui.clearBtn.classList.add('hidden'); ui.suggestions.classList.add('hidden'); };
                    ui.suggestions.appendChild(d);
                }); ui.suggestions.classList.remove('hidden');
            }
        }, 300);
    });
    ui.input.addEventListener('keydown', e => { if (e.key === 'Enter' && ui.suggestions.children.length > 0) { ui.suggestions.children[0].click(); ui.input.blur(); } });
    ui.clearBtn.onclick = () => { ui.input.value = ''; ui.clearBtn.classList.add('hidden'); ui.suggestions.classList.add('hidden'); ui.input.focus(); };

    // MIC LOGIC (Web Speech API)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        ui.micBtn.onclick = () => {
            if (ui.micBtn.classList.contains('listening')) {
                recognition.stop();
            } else {
                recognition.start();
            }
        };

        recognition.onstart = () => {
            ui.micBtn.classList.add('listening', 'text-red-400', 'animate-pulse');
            ui.micBtn.classList.remove('text-gray-500');
        };

        recognition.onend = () => {
            ui.micBtn.classList.remove('listening', 'text-red-400', 'animate-pulse');
            ui.micBtn.classList.add('text-gray-500');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            ui.input.value = transcript;
            ui.input.focus();
            // Trigger input event manually to show suggestions
            ui.input.dispatchEvent(new Event('input'));
        };
    } else {
        ui.micBtn.style.display = 'none';
    }

    const setUnit = (m) => {
        STATE.metric = m;
        localStorage.setItem('aether_units', m); // Save preference
        ui.unitPill.style.transform = m ? 'translateX(0)' : 'translateX(100%)';
        ui.btnC.style.color = m ? '#fff' : '#6b7280';
        ui.btnF.style.color = !m ? '#fff' : '#6b7280';
        renderUI();
    };
    ui.btnC.onclick = () => setUnit(true); ui.btnF.onclick = () => setUnit(false);

    // IDEA 6: GEOLOCATION FALLBACK (PERSISTENT PERMISSION)
    ui.gpsBtn.onclick = () => {
        // 1. Check if we already have permission/location
        if (STATE.userLocation) {
            ui.gpsBtn.classList.add('animate-pulse');
            fetchWeather(STATE.userLocation.lat, STATE.userLocation.lon, "My Location");
            setTimeout(() => ui.gpsBtn.classList.remove('animate-pulse'), 500);
            return;
        }

        // 2. If not, ask for it (and save it if granted)
        if (!navigator.geolocation) {
            alert("GPS not supported.");
            return;
        }

        // Show loading state
        ui.gpsBtn.classList.add('animate-pulse');

        navigator.geolocation.getCurrentPosition(
            (p) => {
                STATE.userLocation = { lat: p.coords.latitude, lon: p.coords.longitude }; // CACHE IT
                fetchWeather(p.coords.latitude, p.coords.longitude, "My Location");
                ui.gpsBtn.classList.remove('animate-pulse');
            },
            (e) => {
                console.log("GPS Denied/Error", e);
                ui.gpsBtn.classList.remove('animate-pulse');

                // Show a non-blocking notification (custom UI) or just fallback logic
                // For now, we reuse the explore modal to show a message or just load default

                // Create a temporary toast
                const toast = document.createElement('div');
                toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm font-bold z-[100] backdrop-blur';
                toast.textContent = "GPS Signal Lost. Switching to backup link.";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);

                loadRandomCity();
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    // Manual Refresh
    ui.refreshBtn.onclick = () => {
        if (STATE.data && STATE.data.lat && STATE.data.lon) {
            fetchWeather(STATE.data.lat, STATE.data.lon, STATE.data.cityName);
        }
    };

    // Close menus on click outside
    document.addEventListener('click', e => {
        if (!el('search-input').contains(e.target) && !ui.clearBtn.contains(e.target)) ui.suggestions.classList.add('hidden');
    });

    function renderFavs() {
        ui.favBar.innerHTML = ''; ui.favBar.classList.remove('opacity-0');
        const isFav = STATE.favorites.includes(STATE.data.cityName);
        ui.favBtn.style.color = isFav ? '#ec4899' : 'rgba(255,255,255,0.4)';
        STATE.favorites.forEach(c => {
            const b = document.createElement('button');
            b.className = "px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-cyan-500/20 transition-all shadow-lg";
            b.textContent = c;
            b.onclick = async () => { const r = await fetch(`${CONFIG.geo}?name=${c}&count=1`).then(res => res.json()); if (r.results) fetchWeather(r.results[0].latitude, r.results[0].longitude, r.results[0].name); };
            ui.favBar.appendChild(b);
        });
    }
    ui.favBtn.onclick = () => {
        const n = STATE.data.cityName;
        if (STATE.favorites.includes(n)) STATE.favorites = STATE.favorites.filter(c => c !== n); else STATE.favorites.push(n);
        localStorage.setItem('aether_favs_v12', JSON.stringify(STATE.favorites)); renderFavs();
    };

    // --- STARTUP LOGIC ---
    function initApp() {
        // FIND AVATAR CONTAINER DYNAMICALLY (For Idea 10)
        // We look for the smart_toy icon in the material symbols spans
        const spans = document.querySelectorAll('.material-symbols-rounded');
        for (let s of spans) {
            if (s.textContent.trim() === 'smart_toy') {
                ui.avatarIcon = s;
                break;
            }
        }

        // CHECK CACHE FIRST
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                STATE.data = JSON.parse(cached);
                renderUI();
                setStatus('sync');
            } catch (e) { console.log("Cache invalid"); }
        }

        // THEN FETCH FRESH
        // Updated Startup Logic: Try GPS, but fail silently to default city if rejected
        // Persist storage: If successful, we save to STATE.userLocation for future use
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (p) => {
                    STATE.userLocation = { lat: p.coords.latitude, lon: p.coords.longitude }; // CACHE IT
                    fetchWeather(p.coords.latitude, p.coords.longitude, "My Location");
                },
                (e) => {
                    console.log("GPS denied on startup, loading random.");
                    if (!STATE.data) loadRandomCity(); // Only load random if no cache
                },
                { timeout: 5000 }
            );
        } else {
            if (!STATE.data) loadRandomCity();
        }
    }

    function loadRandomCity() {
        const c = RANDOM_CITIES[Math.floor(Math.random() * RANDOM_CITIES.length)];
        fetchWeather(c.lat, c.lon, c.name);
    }

    // Start
    initApp();

});

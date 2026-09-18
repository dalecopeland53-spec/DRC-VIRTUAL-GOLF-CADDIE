// ==========================================
// DRC VIRTUAL GOLF CADDIE — ADVANCED CORE ENGINE
// ==========================================

// 1. Immutable Course Data (Extended with Pin Coordinates for Live GPS Mapping)
const HOLES = [
    { hole: 1,  par: 5, si: 5,  front: 480, centre: 498, back: 512, lat: -27.12345, lon: 153.01234 },
    { hole: 2,  par: 4, si: 11, front: 356, centre: 369, back: 382, lat: -27.12456, lon: 153.01345 },
    { hole: 3,  par: 3, si: 15, front: 142, centre: 151, back: 160, lat: -27.12567, lon: 153.01456 },
    { hole: 4,  par: 4, si: 1,  front: 396, centre: 410, back: 423, lat: -27.12678, lon: 153.01567 },
    { hole: 5,  par: 5, si: 7,  front: 475, centre: 491, back: 506, lat: -27.12789, lon: 153.01678 },
    { hole: 6,  par: 3, si: 17, front: 128, centre: 139, back: 150, lat: -27.12890, lon: 153.01789 },
    { hole: 7,  par: 4, si: 9,  front: 348, centre: 361, back: 374, lat: -27.12901, lon: 153.01890 },
    { hole: 8,  par: 4, si: 3,  front: 382, centre: 397, back: 410, lat: -27.13012, lon: 153.01901 },
    { hole: 9,  par: 4, si: 13, front: 335, centre: 349, back: 362, lat: -27.13123, lon: 153.02012 },
    { hole: 10, par: 4, si: 6,  front: 368, centre: 381, back: 394, lat: -27.13234, lon: 153.02123 },
    { hole: 11, par: 5, si: 4,  front: 492, centre: 508, back: 523, lat: -27.13345, lon: 153.02234 },
    { hole: 12, par: 3, si: 16, front: 151, centre: 162, back: 173, lat: -27.13456, lon: 153.02345 },
    { hole: 13, par: 4, si: 10, front: 346, centre: 360, back: 373, lat: -27.13567, lon: 153.02456 },
    { hole: 14, par: 4, si: 2,  front: 401, centre: 416, back: 429, lat: -27.13678, lon: 153.02567 },
    { hole: 15, par: 5, si: 8,  front: 485, centre: 501, back: 517, lat: -27.13789, lon: 153.02678 },
    { hole: 16, par: 3, si: 18, front: 121, centre: 132, back: 143, lat: -27.13890, lon: 153.02789 },
    { hole: 17, par: 4, si: 12, front: 355, centre: 369, back: 382, lat: -27.13901, lon: 153.02890 },
    { hole: 18, par: 4, si: 14, front: 361, centre: 375, back: 389, lat: -27.14012, lon: 153.02901 }
];

// 2. Compass Angle Map for True Crosswind/Headwind Decomposition
const COMPASS_BEARINGS = { N: 0, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 };

// 3. Centralised Reactive App State Object
const state = {
    bag: JSON.parse(localStorage.getItem('drcBag')) || {'Driver':230,'3 Wood':210,'5 Wood':195,'4 Iron':180,'5 Iron':170,'6 Iron':160,'7 Iron':150,'8 Iron':140,'9 Iron':130,'PW':115,'GW':100,'SW':85,'LW':70},
    settings: JSON.parse(localStorage.getItem('drcSettings')) || {player:'Dale', caddie:'Pete', hcp:18, units:'m'},
    scores: JSON.parse(localStorage.getItem('drcScores')) || {},
    currentHole: 0,
    gps: { lat: null, lon: null, acc: null, alt: null, live: false },
    weather: { temp: 20, windSpd: 0, windDir: 'N' },
    calcModifiers: { windDir: 'N', elev: 0, lie: 'fairway' },
    bagUnits: 'm',
    practiceData: { good: 0, left: 0, right: 0, short: 0, long: 0 },
    warmupState: Array(8).fill(false),
    routineState: Array(8).fill(false),
    recognition: null
};

// ==========================================
// ADVANCED MATHEMATICS & GEOLOCATION EXTENSIONS
// ==========================================

/**
 * Calculates high-accuracy distance between two GPS coordinates using the Haversine formula.
 * @returns {number} Distance in metres
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in metres
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

/**
 * Advanced Physics-Based Plays-Like Calculation Engine
 * Accounts for density altitude, true vector crosswind components, slope adjustments, and lie penalties.
 */
function getAdvancedPlaysLike(baseDist, windSpd, temp, alt, windDir, slopeDeg, lie) {
    let playsLike = baseDist;

    // 1. Slope & Elevation Adjustment
    // Dynamic rule: Every degree of slope changes plays-like by roughly 1% per 100 meters
    playsLike += (slopeDeg * (baseDist / 100) * 1.15);

    // 2. Air Density (Temperature & Altitude tracking)
    // Cold air is denser (ball travels shorter); hot air/high altitude is thinner (ball travels further)
    const tempDeviation = temp - 15; // 15°C is standard baseline
    playsLike -= (tempDeviation * 0.001 * baseDist); 
    if (alt > 0) playsLike -= ((alt / 1000) * 0.02 * baseDist); 

    // 3. True Vector Wind Component Mapping
    // Assumes shot target line is roughly toward the default hole vector
    const windAngleRad = (COMPASS_BEARINGS[windDir] || 0) * Math.PI / 180;
    const headwindComponent = Math.cos(windAngleRad) * windSpd;
    const crosswindComponent = Math.sin(windAngleRad) * windSpd;

    // Headwind hurts more than a tailwind helps due to drag profiles
    if (headwindComponent >= 0) {
        playsLike += (headwindComponent * 0.55); // Headwind penalty
    } else {
        playsLike += (headwindComponent * 0.38); // Tailwind assistance (negative addition)
    }

    // 4. Lie Penalty Multipliers
    const multipliers = { fairway: 1.0, rough: 1.05, deep_rough: 1.12, bunker: 1.08 };
    playsLike *= (multipliers[lie] || 1.0);

    // 5. Crosswind drift tracking metadata (exported for advanced interfaces)
    const driftEst = Math.abs(crosswindComponent * (baseDist / 100) * 0.6);

    return {
        finalPlaysLike: Math.max(10, Math.round(playsLike)),
        drift: Math.round(driftEst),
        crosswind: Math.round(crosswindComponent)
    };
}

// ==========================================
// CORE REFACTORED APPLICATION HOOKS
// ==========================================

function startGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(p => {
        state.gps.lat = p.coords.latitude;
        state.gps.lon = p.coords.longitude;
        state.gps.acc = p.coords.accuracy;
        state.gps.alt = p.coords.altitude;
        state.gps.live = true;

        const currentHoleTarget = HOLES[state.currentHole];
        
        // Dynamically recalculate remaining distance if live tracking on the course
        if(currentHoleTarget.lat && currentHoleTarget.lon) {
            const distanceToPin = calculateHaversineDistance(state.gps.lat, state.gps.lon, currentHoleTarget.lat, currentHoleTarget.lon);
            const liveBadge = document.getElementById('gpsBadge');
            if (liveBadge) {
                liveBadge.textContent = `📡 LIVE · PIN DIST: ${Math.round(distanceToPin)}m (±${Math.round(state.gps.acc)}m)`;
            }
            // Populate calculator baseline instantly with precise live tracking
            const calcDistInput = document.getElementById('calcDist');
            if(calcDistInput && document.activeElement !== calcDistInput) {
                calcDistInput.value = Math.round(distanceToPin);
            }
        }
        updateGPSInfo();
    }, () => {
        state.gps.live = false;
        const b = document.getElementById('gpsBadge');
        if (b) b.textContent = '📡 GPS SIGNAL SEARCHING / UNAVAILABLE';
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 });
}

function calcShot() {
    const d = Number(document.getElementById('calcDist').value) || 150;
    const w = Number(document.getElementById('calcWind').value) || state.weather.windSpd;
    const t = Number(document.getElementById('calcTemp').value) || state.weather.temp;
    const a = Number(document.getElementById('calcAlt').value) || state.gps.alt || 0;
    
    const assessment = getAdvancedPlaysLike(d, w, t, a, state.calcModifiers.windDir, state.calcModifiers.elev, state.calcModifiers.lie);
    const club = nearestClub(assessment.finalPlaysLike);

    const resultCard = document.getElementById('calcResult');
    if (resultCard) {
        resultCard.style.display = 'block';
        document.getElementById('calcResultDist').textContent = `${assessment.finalPlaysLike} ${unitLabel()}`;
        document.getElementById('calcResultClub').textContent = club;
        
        let driftWarning = assessment.drift > 3 ? ` | Watch ${assessment.drift}m drift from crosswind.` : '';
        document.getElementById('calcResultAdvice').textContent = `Plays like ${assessment.finalPlaysLike}m from the ${state.calcModifiers.lie}.${driftWarning} Trust Pete and commit to your ${club}.`;
    }
    return { plays: assessment.finalPlaysLike, club };
}

// Baseline state functions preserve legacy mapping but direct to state object wrapper
function unitDist(m) { return state.settings.units === 'y' ? Math.round(m * 1.094) : Math.round(m); }
function unitLabel() { return state.settings.units === 'y' ? 'y' : 'm'; }

function nearestClub(d) {
    let best = 'Driver', gap = Infinity;
    Object.entries(state.bag).forEach(([n, x]) => {
        let g = Math.abs(x - d);
        if (g < gap) { gap = g; best = n; }
    });
    return best;
}


const qs = (sel, root = document) => root.querySelector(sel);
const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const safeGetById = (id) => document.getElementById(id) || document.querySelector(`[id="${id}"]`) || document.querySelector(`[id^="${id}"]`);

const iconPath = (name) => `/assets/images/${name}`;

const weatherCodeMap = {
 0: 'icon-sunny.webp',
  1: 'icon-partly-cloudy.webp',
  2: 'icon-partly-cloudy.webp',
  3: 'icon-overcast.webp',
  45: 'icon-fog.webp',
  48: 'icon-fog.webp',
  51: 'icon-rain.webp',
  53: 'icon-rain.webp',
  55: 'icon-rain.webp',
  61: 'icon-rain.webp',
  63: 'icon-rain.webp',
  65: 'icon-rain.webp',
  71: 'icon-snow.webp',
  73: 'icon-snow.webp',
  75: 'icon-snow.webp',
  77: 'icon-snow.webp',
  80: 'icon-rain.webp',
  81: 'icon-rain.webp',
  82: 'icon-rain.webp',
  85: 'icon-snow.webp',
  86: 'icon-snow.webp',
  95: 'icon-storm.webp',
  96: 'icon-storm.webp',
  99: 'icon-storm.webp',
  default: 'icon-partly-cloudy.webp'
};
const getWeatherIcon = (code) => weatherCodeMap[code] || weatherCodeMap.default;


const API_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const GEO_API_URL  = 'https://geocoding-api.open-meteo.com/v1/search';

let state = {
  currentLat: 52.52,
  currentLon: 13.40,
  currentCityName: 'Berlin, Germany',
  isMetric: true 
};

const searchBarEl = qs('#searchBar');
const searchButtonEl = safeGetById('searchButton') || qs('button[onclick="searchButton()"]') || (() => {

  const btn = qs('.search-bar button');
  return btn;
})();
const header = document.querySelector(".header-container");
const main = document.getElementById("main");
const originalMainContent = main.innerHTML;
const body = document.getElementById("body");
const unitTypeEl = qs('#unitType');
const cityDisplayEl = qs('.top-wrapper .city-name') || qs('.city-name'); 
const dateFieldEl = qs('.date-field');

const weatherIconEl = qs('#weatherIcon') || qs('.image-wrapper img');
const currentWeatherEl = qs('#currentWeather');
const feelsLikeEl = qs('#feelsLikeTemp');
const humidityEl = qs('#humidityValue');
const windEl = qs('#windvalue') || qs('#windValue') || qs('.wind'); 
const precipitationEl = qs('#precipitationValue');
const loadingOverlay = qs('.loading-verlay')

const dailyForecastContainer = qs('.daily-forecast');
const hourlyForecastContainer = qs('.hourly-forecast');

const dropdownCityItems = qsa('.search-wrapper .dropdown-menu .city-name');

const metricChecks = qsa('.metric-check');
const imperialChecks = qsa('.imperial-check');

function showUnitChecks(isMetric) {
  metricChecks.forEach(el => el.style.display = isMetric ? 'inline-block' : 'none');
  imperialChecks.forEach(el => el.style.display = isMetric ? 'none' : 'inline-block');
  if (unitTypeEl) unitTypeEl.textContent = isMetric ? 'Imperial' : 'Metric';
}

function safeTextSet(el, text) {
  if (!el) return;
  el.textContent = text;
}

function safeHtmlSet(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

function hideSearchDropdown() {
  try {
    const wrapper = qs('.search-wrapper.dropdown');
    if (!wrapper) return;
    const dr = bootstrap.Dropdown.getOrCreateInstance(wrapper);
    dr.hide();
  } catch (e) {
    // ignore if bootstrap not available
  }
}

async function getCoordinates(cityName) {
  if (!cityName) return null;
  const params = new URLSearchParams({
    name: cityName,
    count: 1,
    language: 'en'
  });
  const url = `${GEO_API_URL}?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding fetch failed');
    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;
    const r = data.results[0];
    return {
      lat: r.latitude,
      lon: r.longitude,
      name: `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}${r.country ? ', ' + r.country : ''}`
    };
  } catch (err) {
    console.error('getCoordinates error', err);
    return null;
  }
}


async function fetchWeatherData(lat, lon, cityName) {
  if (!lat || !lon) {
    console.warn('Missing lat/lon for fetchWeatherData');
    return;
  }

  state.currentLat = lat;
  state.currentLon = lon;
  if (cityName) state.currentCityName = cityName;

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weathercode',
    daily: 'weathercode,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: 7,
    temperature_unit: state.isMetric ? 'celsius' : 'fahrenheit',
    wind_speed_unit: state.isMetric ? 'kmh' : 'mph',
    precipitation_unit: state.isMetric ? 'mm' : 'inch'
  });

  const url = `${API_BASE_URL}?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();

    if (!data.hourly || !data.hourly.time) throw new Error('Incomplete weather data');

    // pick current hour index: find nearest match to now in the returned timezone (api returned times are ISO strings)
    const now = new Date();
    let currentHourIndex = data.hourly.time.findIndex(t => {
      const d = new Date(t);
      return d.getHours() === now.getHours() && d.getDate() === now.getDate();
    });
    if (currentHourIndex === -1) {

      currentHourIndex = 0;
    }

    renderCurrentWeather(data.hourly, currentHourIndex, data.daily);
    renderDailyForecast(data.daily);
    renderHourlyForecast(data.hourly, currentHourIndex);
  } catch (err) {
    console.error('fetchWeatherData error', err);
    apiError();
  }
}

const weekdayDropdownItems = qsa('.weekday');

weekdayDropdownItems.forEach((item, dayIndex) => {
  item.addEventListener('click', async () => {

    const dropdownBtn = qs('#weekdayName');
    if (dropdownBtn) dropdownBtn.textContent = item.textContent;


    const lat = state.currentLat;
    const lon = state.currentLon;

    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        hourly: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,weathercode',
        daily: 'weathercode,temperature_2m_max,temperature_2m_min',
        timezone: 'auto',
        forecast_days: 7,
        temperature_unit: state.isMetric ? 'celsius' : 'fahrenheit',
        wind_speed_unit: state.isMetric ? 'kmh' : 'mph',
        precipitation_unit: state.isMetric ? 'mm' : 'inch'
      });
      const url = `${API_BASE_URL}?${params.toString()}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.hourly || !data.hourly.time) return;


      const selectedDay = new Date(data.daily.time[dayIndex]);
      const hourIndex = data.hourly.time.findIndex(t => {
        const d = new Date(t);
        return d.getDate() === selectedDay.getDate() &&
               d.getMonth() === selectedDay.getMonth() &&
               d.getFullYear() === selectedDay.getFullYear();
      });

      if (hourIndex !== -1) renderHourlyForecast(data.hourly, hourIndex);

    } catch (err) {
      console.error('Failed to update hourly forecast', err);
    }
  });
});



function renderCurrentWeather(hourly, hourIndex, daily) {

  const temp = hourly.temperature_2m && hourly.temperature_2m[hourIndex] != null ? Math.round(hourly.temperature_2m[hourIndex]) : '--';
  const apparent = hourly.apparent_temperature && hourly.apparent_temperature[hourIndex] != null ? Math.round(hourly.apparent_temperature[hourIndex]) : '--';
  const humidity = hourly.relative_humidity_2m && hourly.relative_humidity_2m[hourIndex] != null ? Math.round(hourly.relative_humidity_2m[hourIndex]) : '--';
  const wind = hourly.wind_speed_10m && hourly.wind_speed_10m[hourIndex] != null ? Math.round(hourly.wind_speed_10m[hourIndex]) : '--';
  const prec = hourly.precipitation && hourly.precipitation[hourIndex] != null ? hourly.precipitation[hourIndex] : '--';
  const code = hourly.weathercode && hourly.weathercode[hourIndex] != null ? hourly.weathercode[hourIndex] : null;

  const tempUnit = state.isMetric ? '°' : '°';
  const windUnit = state.isMetric ? 'km/h' : 'mph';
  const precUnit = state.isMetric ? 'mm' : 'in';


  safeTextSet(cityDisplayEl, state.currentCityName || 'Unknown location');

  if (daily && daily.time && daily.time[0]) {
    const date = new Date(daily.time[0]);
    safeTextSet(dateFieldEl, date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }));
  } else {
    safeTextSet(dateFieldEl, new Date().toLocaleDateString());
  }

  // icon
  if (weatherIconEl && code != null) {
    const file = getWeatherIcon(code);
    weatherIconEl.src = iconPath(file);
    weatherIconEl.alt = `weather ${code}`;
  }

  safeHtmlSet(currentWeatherEl, `${temp}${tempUnit}`);
  safeHtmlSet(feelsLikeEl, `${apparent}${tempUnit}`);
  safeTextSet(humidityEl, `${humidity}%`);
  safeTextSet(windEl, wind === '--' ? '--' : `${wind} ${windUnit}`);
  safeTextSet(precipitationEl, prec === '--' ? '--' : `${prec} ${precUnit}`);
}

function renderDailyForecast(daily) {
  if (!daily || !daily.time) return;
  dailyForecastContainer.innerHTML = ''; 

  const days = Math.min(daily.time.length, 7);
  for (let i = 0; i < days; i++) {
    const dayDate = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Today' : dayDate.toLocaleDateString('en-US', { weekday: 'short' });
    const hi = daily.temperature_2m_max && daily.temperature_2m_max[i] != null ? Math.round(daily.temperature_2m_max[i]) : '--';
    const lo = daily.temperature_2m_min && daily.temperature_2m_min[i] != null ? Math.round(daily.temperature_2m_min[i]) : '--';
    const code = daily.weathercode && daily.weathercode[i] != null ? daily.weathercode[i] : null;
    const icon = getWeatherIcon(code);

    const dayEl = document.createElement('div');
    dayEl.className = 'p-3 rounded-3 bg-neutral-800 text-center';
    dayEl.style.cssText = 'border: 1px solid #8d8d8d4d; minHeight: 162px';
    dayEl.innerHTML = `
      <h4 class="fw-light fs-200 m-0">${dayName}</h4>
      <img src="${iconPath(icon)}" alt="icon" class="w-75 mx-auto py-3" />
      <span class="d-flex justify-content-between">
        <h4 class="fw-light fs-200 m-0">${hi}°</h4>
        <h4 class="fw-light fs-200 m-0 opacity-50">${lo}°</h4>
      </span>
    `;
    dailyForecastContainer.appendChild(dayEl);
  }
}

function renderHourlyForecast(hourly, currentHourIndex) {
  if (!hourly || !hourly.time) return;
  hourlyForecastContainer.innerHTML = '';

  const start = currentHourIndex;
  const maxHours = 8;
  for (let i = 0; i < maxHours; i++) {
    const idx = start + i;
    if (idx >= hourly.time.length) break;

    const d = new Date(hourly.time[idx]);
    const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    const temp = hourly.temperature_2m && hourly.temperature_2m[idx] != null ? Math.round(hourly.temperature_2m[idx]) : '--';
    const code = hourly.weathercode && hourly.weathercode[idx] != null ? hourly.weathercode[idx] : null;
    const icon = getWeatherIcon(code);

    const hourEl = document.createElement('div');
    hourEl.className = 'd-flex justify-content-between align-items-center p-2 bg-neutral-700 rounded-3';
    hourEl.style.cssText = 'height: 65px; border: 1px solid rgba(116,116,116,0.2);';
    hourEl.innerHTML = `
      <div style="flex:1" class="d-flex gap-3 align-items-center">
        <img src="${iconPath(icon)}" alt="icon" style="width:50px" />
        <h2 class="m-0 fs-400">${timeLabel}</h2>
      </div>
      <span><h4 class="fs-300 m-0">${temp}°</h4></span>
    `;
    hourlyForecastContainer.appendChild(hourEl);
  }
}



dropdownCityItems.forEach(item => {
  item.addEventListener('click', (e) => {
    const txt = item.textContent.trim();
    if (searchBarEl) {
      searchBarEl.value = txt;
    }
    hideSearchDropdown();
  });
});


if (searchButtonEl) {

  const doSearch = async () => {
  if (!searchBarEl) return;
  const cityName = searchBarEl.value.trim();
  if (!cityName) return enterCity();

  searchBarEl.disabled = true;
  if (searchButtonEl) {
    searchButtonEl.dataset.prevText = searchButtonEl.textContent;
    searchButtonEl.textContent = 'Searching...';
    searchButtonEl.disabled = true;
  }

  searchInProgress(true);
  loadingState(true);

  try {
    const coords = await getCoordinates(cityName);
    if (coords) {
      await fetchWeatherData(coords.lat, coords.lon, coords.name);
    } else {
      noResultFound();
    }
  } catch (err) {
    console.error('Search failed:', err);
    return;
  } finally {
    searchBarEl.disabled = false;
    if (searchButtonEl) {
      searchButtonEl.textContent = searchButtonEl.dataset.prevText || 'Search';
      searchButtonEl.disabled = false;
    }
    searchInProgress(false);
    loadingState(false);
  }
};

  searchButtonEl.addEventListener('click', doSearch);
  window.searchButton = doSearch;
} else {
  console.warn('Search button not found — falling back to Enter key on input.');
  window.searchButton = async () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
  };
}

if (searchBarEl) {
  searchBarEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (typeof window.searchButton === 'function') window.searchButton();
    }
  });
}

window.switchBtn = function() {
  state.isMetric = !state.isMetric;
  showUnitChecks(state.isMetric);
  fetchWeatherData(state.currentLat, state.currentLon, state.currentCityName);
};
let retryCount = 0;
let maxEntries = 5;

function noResultFound() {
  main.innerHTML = `
      <div class="container py-4">
    <h2 class="text-center ff-secondary">No search results found!</h2>
</div>`

      
}
function enterCity() {
  main.innerHTML = `
   
      <div class="container py-4">
    <h2 class="text-center ff-secondary">Please enter a city!</h2>
</div>`
      
}

function searchInProgress(show = true) {
  const searchDropdown = document.getElementById('searchInProgess');

  if (show) {
    searchDropdown.innerHTML = `
      <li class="d-flex align-items-center justify-content-center p-3">
        <img src="/public/assets/images/icon-loading.svg" alt="Loading" style="width: 24px; height: 24px; margin-right: 0.5rem;">
        <span>Search in progress</span>
      </li>
    `;
  } else {
    searchDropdown.innerHTML = `
      <li><span class="dropdown-item city-name clr-neutral-0 w-100">Berlin</span></li>
      <li><span class="dropdown-item city-name clr-neutral-0 w-100">Lagos</span></li>
      <li><span class="dropdown-item city-name clr-neutral-0 w-100">Beirut</span></li>
      <li><span class="dropdown-item city-name clr-neutral-0 w-100">Sofia</span></li>
      <li><span class="dropdown-item city-name clr-neutral-0 w-100">Copenhagen</span></li>
    `;
  }
}

function loadingState(isLoading = true) {
  if (isLoading) {
    imageWrapper.classList.add("loading"); 
    loadingOverlay.classList.add('visible'); 

    feelsLikeEl.textContent = "-";
    humidityEl.textContent = "-";
    windEl.textContent = "-";
    precipitationEl.textContent = "-";

    dailyContainer.forEach((el) => el.innerHTML = "");
    hourlyContainer.forEach((el) => el.innerHTML = "");
  } else {
    imageWrapper.classList.remove("loading");
    loadingOverlay.classList.remove('visible');
  }
}





function apiError() {
    document.getElementById("searchContainer").style.display = "none";

    main.innerHTML = `
          <div class="text-center container justify-content-center mx-auto align-items-center" id="api-error-state">
    <img src="/public/assets/images/icon-error.svg" alt="" style="width: 40px;" class="mx-auto py-4">
    <div class="w-100 mx-auto">
        <h1 class="ff-secondary">Something went wrong</h1>
        <p class="mx-auto py-4 w-100 text-shrinked">We couldn't connect to the server (API error). Please try again in a few minutes</p>
        <button id="retryBtn" class="btn d-flex align-items-center bg-neutral-700 gap-2 text-light text-center mx-auto">
            <img src="/public/assets/images/icon-retry.svg" alt="">
            <span>Retry</span>
        </button>
    </div>
</div>  `;
    document.getElementById("retryBtn").addEventListener("click", () => {
      retryCount++;
      if (retryCount >= maxEntries) {
        const retryBtn = document.getElementById("retryBtn");
        retryBtn.disabled = true;
        retryBtn.textContent = "Attempts exceeded";
      } else {
        renderCurrentWeather();
      }
    });
  }


async function initApp() {
  showUnitChecks(state.isMetric);

  // Try geolocation first
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      // try a quick reverse geocode via search-by-coords (Open-Meteo's geocoding supports lat/lon query by retrieving nearest place)
      // We just fetch weather by coords and set generic name to avoid extra calls
      state.currentCityName = 'Your Location';
      await fetchWeatherData(lat, lon, state.currentCityName);
    }, async (err) => {
      // fallback to default city
      console.warn('Geolocation failed, using default city.', err);
      await fetchWeatherData(state.currentLat, state.currentLon, state.currentCityName);
    }, { timeout: 6000 });
  } else {
    // no geolocation
    await fetchWeatherData(state.currentLat, state.currentLon, state.currentCityName);
  }
}


document.addEventListener('DOMContentLoaded', initApp);

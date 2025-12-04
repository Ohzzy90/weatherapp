import "./style.css";
const searchBar = document.getElementById("searchBar");
const cityItems = document.querySelectorAll(".city-name");

cityItems.forEach((item) => {
  item.addEventListener("click", () => {
    searchBar.value = item.textContent.trim();
  });
});
const weekdayName = document.getElementById("weekdayName");
const weekday = document.querySelectorAll(".weekday");
weekday.forEach((item) => {
  item.addEventListener("click", () => {
    weekdayName.textContent = item.textContent.trim();
  });
});

// document.addEventListener("DOMContentLoaded", () => {
//   const dateField = document.querySelector(".date-field");
//   if (!dateField) return;

//   const today = new Date();
//   dateField.textContent = today.toLocaleDateString("en-US", {
//     weekday: "long",
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// });

let retryCount = 0;
let maxEntries = 5;

const searchBtn = document.getElementById('searchBtn')
const currentWeather = document.getElementById('currentWeather')
const header = document.querySelector(".header-container");
const main = document.getElementById("main");
const imageWrapper = document.getElementById("imageWrapper");
const feelsLikeTemp = document.getElementById("feelsLikeTemp");
const humidityValue = document.getElementById("humidityValue");
const windValue = document.getElementById("windValue");
const precipitationValue = document.getElementById("precipitationValue");
const dailyContainer = document.querySelectorAll(".dailyContainer");
const hourlyContainer = document.querySelectorAll(".hourlyContainer");
const loadingOverlay = document.getElementById("loading-overlay");
const highTemp = document.querySelectorAll(".highTemp");
const lowTemp = document.querySelectorAll(".lowTemp");
const weatherIcon = document.querySelectorAll(".weatherIcon");
const hourlyTime = document.querySelectorAll(".hourlyTime");
const hourlyTemp = document.querySelectorAll(".hourlyForecast");
const dailyDay = document.querySelectorAll(".dailyDay");


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



    feelsLikeTemp.textContent = "-";
    humidityValue.textContent = "-";
    windValue.textContent = "-";
    precipitationValue.textContent = "-";

    dailyContainer.forEach((el) => el.innerHTML = "");
    hourlyContainer.forEach((el) => el.innerHTML = "");
  } else {

    imageWrapper.classList.remove("loading");
  }
}

function unitConverter(type, value, toUnit) {
  switch(type) {
    case 'temperature':
      if (toUnit === 'C') return ((value - 32) * 5/9).toFixed(0);
      if (toUnit === 'F') return (value * 9/5 + 32).toFixed(0);
      break;
    case 'speed':
      if (toUnit === 'kmh') return (value * 1.609).toFixed(1);
      if (toUnit === 'mph') return (value * 0.621).toFixed(1);
      break;
    case 'precipitation':
      if (toUnit === 'mm') return (value * 25.4).toFixed(1);
      if (toUnit === 'in') return (value / 25.4).toFixed(2);
      break;
    default:
      return value;
  }
}

const metricCheck = document.querySelectorAll(".metric-check");
const imperialCheck = document.querySelectorAll(".imperial-check");
const unitType = document.getElementById("unitType");

let isMetric = true;

function updateUnitChecks() {
  metricCheck.forEach(
    (el) => (el.style.display = isMetric ? "inline-block" : "none")
  );
  imperialCheck.forEach(
    (el) => (el.style.display = isMetric ? "none" : "inline-block")
  );
  unitType.textContent = isMetric ? "Imperial" : "Metric";
}

function switchBtn() {
  isMetric = !isMetric;
  updateUnitChecks();
    renderWeather();
}

const switchBtnEl = document.querySelector('button[onclick="switchBtn()"]');
if (switchBtnEl) switchBtnEl.addEventListener("click", switchBtn);



function getWeatherIconPath(wmoCode, isDay = true) {

    return "/public/assets/images/icon-cloud.webp";
}

let latestValues = {};



function renderWeather() {
   currentWeather.textContent = isMetric
    ? latestValues.currentTemp + "°"
    : unitConverter("temperature", latestValues.currentTemp, "F") + "°";

  feelsLikeTemp.textContent = isMetric
    ? latestValues.feelsLikeTemp + "°"
    : unitConverter("temperature", latestValues.feelsLikeTemp, "F") + "°";

  highTemp.forEach(el => {
    el.textContent = isMetric
      ? latestValues.highTemp + "°"
      : unitConverter("temperature", latestValues.highTemp, "F") + "°";
  });

  lowTemp.forEach(el => {
    el.textContent = isMetric
      ? latestValues.lowTemp + "°"
      : unitConverter("temperature", latestValues.lowTemp, "F") + "°";
  });

  hourlyTemp.forEach((el, i) => {
        const timeEl = hourlyTime[i];
        const iconEl = weatherIcon[i];

        const tempVal = latestValues.hourlyForecast[i];
        const timeStamp = latestValues.hourlyTime[i];
        const wmoCode = latestValues.hourlyWeatherCode[i];

        if (tempVal !== undefined && timeStamp !== undefined && wmoCode !== undefined) {
            const date = new Date(timeStamp);
            const hour = date.getHours();
            const isDay = hour >= 6 && hour <= 19;


            timeEl.textContent = date.toLocaleTimeString([], { hour: 'numeric', hour12: true }).replace(' ', '');


            el.textContent = isMetric
              ? tempVal + "°"
              : unitConverter("temperature", tempVal, "F") + "°";

            // Icon
            iconEl.src = getWeatherIconPath(wmoCode, isDay);
            hourlyContainer[i].style.display = 'flex';
        } else {
            hourlyContainer[i].style.display = 'none';
        }
    });

  windValue.textContent = isMetric
    ? latestValues.wind + " km/h"
    : unitConverter("speed", latestValues.wind, "mph") + " mph";

  precipitationValue.textContent = isMetric
    ? latestValues.precipitation + " mm"
    : unitConverter("precipitation", latestValues.precipitation, "in") + " in";

  humidityValue.textContent = latestValues.humidity + "%";

}

async function getCoordinates(cityName) {
    const geocodingUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;

    try {
        const response = await fetch(geocodingUrl, {

        });

        if (!response.ok) {
            throw new Error(`Geocoding API failed with status ${response.status}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const result = data[0];
            const latitude = parseFloat(result.lat);
            const longitude = parseFloat(result.lon);

            return { latitude, longitude, cityName: result.display_name };
        } else {
            noResultFound();
            return null;
        }
    } catch (error) {
        console.error("Error during geocoding:", error);
        noResultFound("Error connecting to the geocoding service.");
        return null;
    }
}

async function getWeatherData(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code,precipitation&hourly=time,temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min&timezone=auto&forecast_days=7`;

  try {
    const response = await fetch(url);
    // .then(response => response.json())
    // .then(data => console.log(data))
    const data = await response.json();
    console.log(data);
    if (!data || !data.current) {
      return enterCity();
    }
   return {
            temperature: data.current_weather.temperature,
            wind: data.current_weather.windspeed,
            humidity: data.current_weather.relativehumidity ?? 0,
            precipitation: data.current_weather.precipitation ?? 0,
            feelsLikeTemp: data.current_weather.temperature,

            highTemp: data.daily ? data.daily.temperature_2m_max[0] : 0,
            lowTemp: data.daily ? data.daily.temperature_2m_min[0] : 0,

            hourlyForecast: data.hourly ? data.hourly.temperature_2m : [],
            hourlyTime: data.hourly ? data.hourly.time : [],
            hourlyWeatherCode: data.hourly ? data.hourly.weathercode : []
        };


    renderWeather();
    return data;
  }
   catch (err) {
    console.error('fetchWeatherData error', err);
    apiError();
  }
  
}
function updateWeatherFromAPI(data) {
if (!data || !data.current_weather) return;


  latestValues.currentTemp = data.temperature ?? 0;
  latestValues.wind = data.wind ?? 0;
  latestValues.humidity = data.humidity ?? 0;
  latestValues.precipitation = data.precipitation ?? 0;
  latestValues.feelsLikeTemp = data.feelsLikeTemp ?? 0;

  latestValues.highTemp = data.highTemp ?? 0;
  latestValues.lowTemp = data.lowTemp ?? 0;

  latestValues.hourlyTime = data.hourlyTime || [];
  latestValues.hourlyForecast = data.hourlyForecast || [];
  latestValues.hourlyWeatherCode = data.hourlyWeatherCode || [];

  renderWeather();
}

searchBtn.addEventListener("click", handleSearch);
searchBar.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleSearch();
  }
});
searchBtn.addEventListener("click", handleSearch);

async function handleSearch() {
    const query = searchBar.value.trim();
    if (!query) return;

    searchInProgress(true);

    const coords = await getCoordinates(query);
    if (!coords) return;

    const { latitude, longitude } = coords;

    const weatherData = await getWeatherData(latitude, longitude);

    searchInProgress(false);

    if (!weatherData) {
        return  noResultFound();
    }

    updateWeatherFromAPI(weatherData);
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
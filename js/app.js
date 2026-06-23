const cityInput    = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const resetButton  = document.getElementById("reset-button");
const themeToggle  = document.getElementById("theme-toggle");

const loading = document.getElementById("loading");
const error   = document.getElementById("error");

const cityName        = document.getElementById("city-name");
const dateElement     = document.getElementById("date");
const temperature     = document.getElementById("temperature");
const conditionElement = document.getElementById("condition");
const humidity        = document.getElementById("humidity");
const windSpeed       = document.getElementById("wind-speed");
const pressure        = document.getElementById("pressure");

const forecastContainer = document.getElementById("forecast-container");
const hourlyContainer   = document.getElementById("hourly-container");
const hourlyTitle       = document.querySelector(".hourly-card h3");

// ── Global state ──────────────────────────────────────────
let globalHourly = null;
let globalDaily  = null;


// ══════════════════════════════════════
// LOADING STATE — disable UI during fetch
// ══════════════════════════════════════
function setLoadingState(isLoading) {
    searchButton.disabled = isLoading;
    cityInput.disabled    = isLoading;
    // Reset button stays active so users can cancel/reset mid-load
}


// ══════════════════════════════════════
// THEME TOGGLE
// ══════════════════════════════════════
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
});


// ══════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════
searchButton.addEventListener("click", searchWeather);
resetButton.addEventListener("click", resetApp);

// Enter key triggers search
cityInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchWeather();
});


// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════
function getWeatherCondition(code) {
    if (code === 0)  return { icon: "☀️",  label: "Clear"   };
    if (code <= 3)   return { icon: "⛅",  label: "Cloudy"  };
    if (code <= 48)  return { icon: "🌫️", label: "Foggy"   };
    if (code <= 67)  return { icon: "🌧️", label: "Rainy"   };
    if (code <= 77)  return { icon: "❄️",  label: "Snowy"   };
    if (code <= 82)  return { icon: "🌦️", label: "Showers" };
    return                  { icon: "🌩️", label: "Stormy"  };
}

function updateTemperatureColor(temp) {
    if (temp >= 25)      temperature.style.color = "#ff4500";
    else if (temp <= 15) temperature.style.color = "#1e90ff";
    else                 temperature.style.color = "#2e8b57";
}


// ══════════════════════════════════════
// RENDER: HOURLY PANEL
// ══════════════════════════════════════
function renderHourly(dayIndex) {
    if (!globalHourly || !globalDaily) return;

    const hourly = globalHourly;
    const daily  = globalDaily;

    // Day 0 = indices 0–23, day 1 = 24–47, etc.
    const dayStartIndex = dayIndex * 24;
    const currentHour   = new Date().getHours();

    // Today: start from current hour. Other days: full 00:00–23:00
    const fromHour = dayIndex === 0 ? currentHour : 0;

    // Update panel heading
    if (dayIndex === 0) {
        hourlyTitle.textContent = "Hourly Insights — Today";
    } else {
        const date    = new Date(daily.time[dayIndex] + "T00:00");
        const dayName = date.toLocaleDateString("en-US", {
            weekday: "long", month: "short", day: "numeric",
        });
        hourlyTitle.textContent = `Hourly Insights — ${dayName}`;
    }

    let html = "";
    for (let h = fromHour; h < 24; h++) {
        const index = dayStartIndex + h;
        if (!hourly.time[index]) break;

        const timeLabel = hourly.time[index].split("T")[1].substring(0, 5);
        const cond      = getWeatherCondition(hourly.weather_code[index]);
        const temp      = Math.round(hourly.temperature_2m[index]);

        html += `
            <div class="row">
                <span>${timeLabel}</span>
                <span>${cond.icon} ${cond.label}</span>
                <span>${temp}°C</span>
            </div>`;
    }

    hourlyContainer.innerHTML = html;
    hourlyContainer.scrollTop = 0; // reset scroll when switching days
}


// ══════════════════════════════════════
// RENDER: FORECAST STRIP
// ══════════════════════════════════════
function renderForecast(daily, selectedIndex = 0) {
    let html = "";
    for (let i = 0; i < 5; i++) {
        const date    = new Date(daily.time[i] + "T00:00");
        const dayName = i === 0
            ? "Today"
            : date.toLocaleDateString("en-US", { weekday: "short" });
        const cond       = getWeatherCondition(daily.weather_code[i]);
        const isSelected = i === selectedIndex ? "selected" : "";

        html += `
            <div class="forecast-card card ${isSelected}"
                 data-day-index="${i}"
                 tabindex="0"
                 role="button"
                 aria-label="${dayName}: ${Math.round(daily.temperature_2m_max[i])}° high, ${Math.round(daily.temperature_2m_min[i])}° low">
                <span class="forecast-day">${dayName}</span>
                <span class="forecast-icon">${cond.icon}</span>
                <div class="forecast-temps">
                    <span class="high-temp">${Math.round(daily.temperature_2m_max[i])}°</span>
                    <span class="low-temp">${Math.round(daily.temperature_2m_min[i])}°</span>
                </div>
            </div>`;
    }
    forecastContainer.innerHTML = html;

    forecastContainer.querySelectorAll(".forecast-card").forEach((card) => {
        function activateCard() {
            const dayIndex = parseInt(card.dataset.dayIndex);
            forecastContainer
                .querySelectorAll(".forecast-card")
                .forEach((c) => c.classList.remove("selected"));
            card.classList.add("selected");
            renderHourly(dayIndex);
        }

        // Mouse click
        card.addEventListener("click", activateCard);

        // Keyboard: Enter or Space
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activateCard();
            }
        });
    });
}


// ══════════════════════════════════════
// MAIN: FETCH WEATHER
// ══════════════════════════════════════
async function searchWeather() {
    const city = cityInput.value.trim();
    if (!city) return;

    setLoadingState(true);
    loading.classList.remove("hidden");
    error.classList.add("hidden");

    try {
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found — check the spelling and try again.");
        }

        const location = geoData.results[0];
        localStorage.setItem("lastCity", location.name);

        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${location.latitude}&longitude=${location.longitude}` +
            `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
            `&hourly=temperature_2m,weather_code&timezone=auto`
        );

        const weatherData = await weatherResponse.json();
        const { current, daily, hourly } = weatherData;

        // Cache globally for day-switching without re-fetching
        globalHourly = hourly;
        globalDaily  = daily;

        // ── Current weather ──
        cityName.textContent      = `${location.name}, ${location.country}`;
        dateElement.textContent   = new Date().toDateString();
        temperature.textContent   = `${current.temperature_2m}°C`;
        updateTemperatureColor(current.temperature_2m);

        const cond = getWeatherCondition(current.weather_code);
        conditionElement.textContent = `${cond.icon} ${cond.label}`;
        humidity.textContent         = `${current.relative_humidity_2m}%`;
        windSpeed.textContent        = `${current.wind_speed_10m} km/h`;
        pressure.textContent         = `${current.surface_pressure} hPa`;

        // ── Forecast + hourly ──
        renderForecast(daily, 0);
        renderHourly(0);

    } catch (err) {
        error.textContent = err.message;
        error.classList.remove("hidden");
    } finally {
        // Always re-enable UI, always hide spinner
        loading.classList.add("hidden");
        setLoadingState(false);
    }
}


// ══════════════════════════════════════
// RESET
// ══════════════════════════════════════
function resetApp() {
    localStorage.removeItem("lastCity");
    cityInput.value = "";

    globalHourly = null;
    globalDaily  = null;

    cityName.textContent          = "Search a city";
    dateElement.textContent       = "--";
    temperature.textContent       = "--°C";
    temperature.style.color       = "var(--text-color)";
    conditionElement.textContent  = "Current Weather";
    humidity.textContent          = "--";
    windSpeed.textContent         = "--";
    pressure.textContent          = "N/A";

    forecastContainer.innerHTML = `
        <div class="forecast-card card">Today</div>
        <div class="forecast-card card">Tue</div>
        <div class="forecast-card card">Wed</div>
        <div class="forecast-card card">Thu</div>
        <div class="forecast-card card">Fri</div>`;

    hourlyContainer.innerHTML = `
        <div class="row"><span>--</span><span>--</span><span>--</span></div>`;

    hourlyTitle.textContent = "Hourly Micro-Data Insights";
    error.classList.add("hidden");
    cityInput.focus();
}


// ══════════════════════════════════════
// INIT ON LOAD
// ══════════════════════════════════════
window.addEventListener("DOMContentLoaded", () => {
    // Restore theme
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-theme");
        themeToggle.textContent = "☀️";
    }

    // Restore last city
    const savedCity = localStorage.getItem("lastCity");
    if (savedCity) {
        cityInput.value = savedCity;
        searchWeather();
    }
});
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const resetButton = document.getElementById("reset-button");
const themeToggle = document.getElementById("theme-toggle");

const loading = document.getElementById("loading");
const error = document.getElementById("error");

const cityName = document.getElementById("city-name");
const dateElement = document.getElementById("date");
const temperature = document.getElementById("temperature");
const conditionElement = document.getElementById("condition");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const pressure = document.getElementById("pressure");

const forecastContainer = document.getElementById("forecast-container");
const hourlyContainer = document.getElementById("hourly-container");
const hourlyTitle = document.querySelector(".hourly-card h3");

// --- Global state ---
let globalHourly = null;
let globalDaily = null;

// --- Event Listeners ---
searchButton.addEventListener("click", searchWeather);
resetButton.addEventListener("click", resetApp);
cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchWeather();
});

// --- Theme Toggle Logic ---
themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    const isDark = document.body.classList.contains("dark-theme");
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
});

// --- Helper: Weather Code Classifier ---
function getWeatherCondition(code) {
    if (code === 0) return { icon: "☀️", label: "Clear" };
    if (code <= 3) return { icon: "⛅", label: "Cloudy" };
    if (code <= 48) return { icon: "🌫️", label: "Foggy" };
    if (code <= 67) return { icon: "🌧️", label: "Rainy" };
    if (code <= 77) return { icon: "❄️", label: "Snowy" };
    if (code <= 82) return { icon: "🌦️", label: "Showers" };
    return { icon: "🌩️", label: "Stormy" };
}

// --- Helper: Dynamic Temperature Colors ---
function updateTemperatureColor(temp) {
    if (temp >= 25) {
        temperature.style.color = "#ff4500";
    } else if (temp <= 15) {
        temperature.style.color = "#1e90ff";
    } else {
        temperature.style.color = "#2e8b57";
    }
}

// --- Render Hourly Panel for a given day index ---
function renderHourly(dayIndex) {
    if (!globalHourly || !globalDaily) return;

    const hourly = globalHourly;
    const daily = globalDaily;

    // Each day is 24 entries; day 0 = indices 0–23, day 1 = 24–47, etc.
    const dayStartIndex = dayIndex * 24;
    const currentHour = new Date().getHours();

    // Today starts from the current hour; other days start from 00:00
    const fromHour = dayIndex === 0 ? currentHour : 0;

    // Update panel title
    if (dayIndex === 0) {
        hourlyTitle.textContent = "Hourly Insights — Today";
    } else {
        const date = new Date(daily.time[dayIndex] + "T00:00");
        const dayName = date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
        hourlyTitle.textContent = `Hourly Insights — ${dayName}`;
    }

    let hourlyHTML = "";
    for (let h = fromHour; h < 24; h++) {
        const index = dayStartIndex + h;
        if (!hourly.time[index]) break;

        const timeLabel = hourly.time[index].split("T")[1].substring(0, 5);
        const cond = getWeatherCondition(hourly.weather_code[index]);
        const temp = Math.round(hourly.temperature_2m[index]);

        hourlyHTML += `
            <div class="row">
                <span>${timeLabel}</span>
                <span>${cond.icon} ${cond.label}</span>
                <span>${temp}°C</span>
            </div>
        `;
    }

    hourlyContainer.innerHTML = hourlyHTML;
    hourlyContainer.scrollTop = 0; // Reset scroll when switching days
}

// --- Render Forecast Strip with click handlers ---
function renderForecast(daily, selectedIndex = 0) {
    let forecastHTML = "";
    for (let i = 0; i < 5; i++) {
        const date = new Date(daily.time[i] + "T00:00");
        const dayName =
            i === 0
                ? "Today"
                : date.toLocaleDateString("en-US", { weekday: "short" });
        const cond = getWeatherCondition(daily.weather_code[i]);
        const isSelected = i === selectedIndex ? "selected" : "";

        forecastHTML += `
            <div class="forecast-card card ${isSelected}" data-day-index="${i}">
                <span class="forecast-day">${dayName}</span>
                <span class="forecast-icon">${cond.icon}</span>
                <div class="forecast-temps">
                    <span class="high-temp">${Math.round(daily.temperature_2m_max[i])}°</span>
                    <span class="low-temp">${Math.round(daily.temperature_2m_min[i])}°</span>
                </div>
            </div>
        `;
    }
    forecastContainer.innerHTML = forecastHTML;

    // Attach click listeners to each card
    forecastContainer.querySelectorAll(".forecast-card").forEach((card) => {
        card.addEventListener("click", () => {
            const dayIndex = parseInt(card.dataset.dayIndex);

            // Swap selected highlight
            forecastContainer
                .querySelectorAll(".forecast-card")
                .forEach((c) => c.classList.remove("selected"));
            card.classList.add("selected");

            renderHourly(dayIndex);
        });
    });
}

// --- Main Fetch Logic ---
async function searchWeather() {
    const city = cityInput.value.trim();
    if (!city) return;

    loading.classList.remove("hidden");
    error.classList.add("hidden");

    try {
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found");
        }

        const location = geoData.results[0];
        localStorage.setItem("lastCity", location.name);

        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
                `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code` +
                `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
                `&hourly=temperature_2m,weather_code&timezone=auto`
        );

        const weatherData = await weatherResponse.json();
        const current = weatherData.current;
        const daily = weatherData.daily;
        const hourly = weatherData.hourly;

        // Store globally for day-switching
        globalHourly = hourly;
        globalDaily = daily;

        // Update Current Weather UI
        cityName.textContent = `${location.name}, ${location.country}`;
        dateElement.textContent = new Date().toDateString();

        const currentTemp = current.temperature_2m;
        temperature.textContent = `${currentTemp}°C`;
        updateTemperatureColor(currentTemp);

        const currentCondition = getWeatherCondition(current.weather_code);
        conditionElement.textContent = `${currentCondition.icon} ${currentCondition.label}`;

        humidity.textContent = `${current.relative_humidity_2m}%`;
        windSpeed.textContent = `${current.wind_speed_10m} km/h`;
        pressure.textContent = `${current.surface_pressure} hPa`;

        // Render forecast strip (Today selected by default)
        renderForecast(daily, 0);

        // Render today's hourly data
        renderHourly(0);

        loading.classList.add("hidden");
    } catch (err) {
        loading.classList.add("hidden");
        error.textContent = err.message;
        error.classList.remove("hidden");
    }
}

// --- Reset Functionality ---
function resetApp() {
    localStorage.removeItem("lastCity");
    cityInput.value = "";

    globalHourly = null;
    globalDaily = null;

    cityName.textContent = "Search a city";
    dateElement.textContent = "--";
    temperature.textContent = "--°C";
    temperature.style.color = "var(--text-color)";
    conditionElement.textContent = "Current Weather";
    humidity.textContent = "--";
    windSpeed.textContent = "--";
    pressure.textContent = "N/A";

    forecastContainer.innerHTML = `
        <div class="forecast-card card">Today</div>
        <div class="forecast-card card">Tue</div>
        <div class="forecast-card card">Wed</div>
        <div class="forecast-card card">Thu</div>
        <div class="forecast-card card">Fri</div>
    `;

    hourlyContainer.innerHTML = `
        <div class="row"><span>--</span><span>--</span><span>--</span></div>
    `;

    hourlyTitle.textContent = "Hourly Micro-Data Insights";
    error.classList.add("hidden");
}

// --- On Load Initialization ---
window.addEventListener("DOMContentLoaded", () => {
    // Restore theme preference
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-theme");
        themeToggle.textContent = "☀️";
    }

    // Restore last searched city
    const savedCity = localStorage.getItem("lastCity");
    if (savedCity) {
        cityInput.value = savedCity;
        searchWeather();
    }
});
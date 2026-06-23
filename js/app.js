const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");

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

searchButton.addEventListener("click", searchWeather);


function getWeatherCondition(code) {
    if (code === 0) return { icon: "☀️", label: "Clear" };
    if (code <= 3) return { icon: "⛅", label: "Cloudy" };
    if (code <= 48) return { icon: "🌫️", label: "Foggy" };
    if (code <= 67) return { icon: "🌧️", label: "Rainy" };
    if (code <= 77) return { icon: "❄️", label: "Snowy" };
    if (code <= 82) return { icon: "🌦️", label: "Showers" };
    return { icon: "🌩️", label: "Stormy" };
}

function updateTemperatureColor(temp) {
    if (temp >= 25) {
        temperature.style.color = "#ff4500"; 
    } else if (temp <= 15) {
        temperature.style.color = "#1e90ff"; 
    } else {
        temperature.style.color = "#2e8b57"; 
    }
}

async function searchWeather() {
    const city = cityInput.value.trim();
    if (!city) return;

    loading.classList.remove("hidden");
    error.classList.add("hidden");

    try {
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
        );
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found");
        }

        const location = geoData.results[0];

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

        let forecastHTML = "";
        for (let i = 0; i < 5; i++) {
            const date = new Date(daily.time[i] + "T00:00");
            const dayName = i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });
            const cond = getWeatherCondition(daily.weather_code[i]);
            const isTodayClass = i === 0 ? "today" : "";

            forecastHTML += `
                <div class="forecast-card card ${isTodayClass}">
                    <span>${dayName}</span>
                    <span style="font-size: 1.3rem;">${cond.icon}</span>
                    <div>
                        <span class="high-temp">${Math.round(daily.temperature_2m_max[i])}°</span>
                        <span class="low-temp">${Math.round(daily.temperature_2m_min[i])}°</span>
                    </div>
                </div>
            `;
        }
        forecastContainer.innerHTML = forecastHTML;

        const currentHour = new Date().getHours();
        let hourlyHTML = "";
        for (let i = 0; i < 6; i++) {
            const index = currentHour + i;
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

        loading.classList.add("hidden");

    } catch (err) {
        loading.classList.add("hidden");
        error.textContent = err.message;
        error.classList.remove("hidden");
    }
}
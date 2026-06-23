const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");

const loading = document.getElementById("loading");
const error = document.getElementById("error");

const cityName = document.getElementById("city-name");
const dateElement = document.getElementById("date");
const temperature = document.getElementById("temperature");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");

searchButton.addEventListener("click", searchWeather);

async function searchWeather() {
    const city = cityInput.value.trim();

    if (!city) return;

    loading.classList.remove("hidden");
    error.classList.add("hidden");

    try {
        // Geocoding
        const geoResponse = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`
        );

        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found");
        }

        const location = geoData.results[0];

        const latitude = location.latitude;
        const longitude = location.longitude;

        // Weather
        const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
        );

        const weatherData = await weatherResponse.json();

        const current = weatherData.current;

        // Update UI
        cityName.textContent = location.name;

        temperature.textContent =
            `${current.temperature_2m}°C`;

        humidity.textContent =
            `${current.relative_humidity_2m}%`;

        windSpeed.textContent =
            `${current.wind_speed_10m} km/h`;

        dateElement.textContent =
            new Date().toDateString();

        loading.classList.add("hidden");

    } catch (err) {
        loading.classList.add("hidden");

        error.textContent = err.message;
        error.classList.remove("hidden");
    }
}
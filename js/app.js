const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");

const loading = document.getElementById("loading");
const error = document.getElementById("error");


const cityName = document.getElementById("city-name");
const dateElement = document.getElementById("date");
const temperature = document.getElementById("temperature");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const pressure = document.getElementById("pressure"); 

searchButton.addEventListener("click", searchWeather);

// --- Helper: Dynamic Temperature Colors ---
function updateTemperatureColor(temp) {
    if (temp >= 25) {
        temperature.style.color = "#ff4500"; // Warm/Hot
    } else if (temp <= 15) {
        temperature.style.color = "#1e90ff"; // Cool/Cold
    } else {
        temperature.style.color = "#2e8b57"; // Mild
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
            `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure`
        );

        const weatherData = await weatherResponse.json();
        const current = weatherData.current;


        cityName.textContent = `${location.name}, ${location.country}`;
        dateElement.textContent = new Date().toDateString();


        const currentTemp = current.temperature_2m;
        temperature.textContent = `${currentTemp}°C`;
        updateTemperatureColor(currentTemp);


        humidity.textContent = `${current.relative_humidity_2m}%`;
        windSpeed.textContent = `${current.wind_speed_10m} km/h`;
        pressure.textContent = `${current.surface_pressure} hPa`; 

        loading.classList.add("hidden");

    } catch (err) {
        loading.classList.add("hidden");
        error.textContent = err.message;
        error.classList.remove("hidden");
    }
}
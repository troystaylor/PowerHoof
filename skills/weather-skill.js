/**
 * Weather Skill
 * 
 * Get current weather and forecasts using wttr.in (no API key required).
 */

import { weatherCache } from "./skill-cache.js";

export const skill = {
  manifest: {
    id: "weather-skill",
    name: "Weather",
    description: "Get current weather and forecasts for any location",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context", "network"],
    examples: [
      "weather in Seattle",
      "/weather New York",
      "what's the weather like in London"
    ],
    tags: ["weather", "utility", "location"]
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    const triggers = [
      "/weather",
      "/forecast",
      "weather in",
      "weather for",
      "what's the weather",
      "how's the weather",
      "temperature in",
      "forecast for"
    ];
    return triggers.some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content || "";
    
    // Extract location
    let location = content
      .replace(/^\/?(?:weather|forecast)\s*/i, "")
      .replace(/^(?:in|for|like in|like)\s*/i, "")
      .replace(/^what'?s the weather\s*/i, "")
      .replace(/^how'?s the weather\s*/i, "")
      .replace(/^temperature\s*/i, "")
      .trim();

    // Default to auto-detect if no location specified
    if (!location) {
      location = ""; // wttr.in will auto-detect
    }

    try {
      const weather = await this.getWeather(location);
      return {
        success: true,
        content: weather,
        data: { location },
        nextAction: "respond"
      };
    } catch (error) {
      // Return success: true so we handle the error message ourselves
      // instead of falling through to LLM
      return {
        success: true,
        content: `⚠️ **Weather Lookup Failed**\n\n${error.message}\n\nTry again in a moment or specify a different location.`,
        nextAction: "respond"
      };
    }
  },

  async getWeather(location) {
    const encoded = encodeURIComponent(location);
    const cacheKey = `weather:${location.toLowerCase()}`;
    
    // Check cache first
    const cached = weatherCache.get(cacheKey);
    if (cached) {
      return cached + "\n_📦 Cached result_";
    }
    
    // Use Open-Meteo API (free, no API key, reliable)
    // First, we need to geocode the location
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encoded}&count=1`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    try {
      // Get coordinates for the location
      const geoResponse = await fetch(geoUrl, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!geoResponse.ok) {
        throw new Error(`Geocoding failed: HTTP ${geoResponse.status}`);
      }
      
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        // If no location specified, use default coordinates (Seattle)
        const defaultLat = 47.6;
        const defaultLon = -122.3;
        const defaultName = location || "your location";
        const result = await this.fetchWeatherData(defaultLat, defaultLon, defaultName);
        weatherCache.set(cacheKey, result);
        return result;
      }
      
      const { latitude, longitude, name, country } = geoData.results[0];
      const displayName = country ? `${name}, ${country}` : name;
      
      const result = await this.fetchWeatherData(latitude, longitude, displayName);
      weatherCache.set(cacheKey, result);
      return result;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Weather service timed out. Please try again.');
      }
      throw error;
    }
  },
  
  async fetchWeatherData(lat, lon, locationName) {
    // Open-Meteo with UV index and additional data
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,uv_index,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max&timezone=auto`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(weatherUrl, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Weather API error: HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      // Fetch air quality data separately
      let airQuality = null;
      try {
        airQuality = await this.fetchAirQuality(lat, lon);
      } catch (e) {
        // Air quality is optional, don't fail if unavailable
      }
      
      return this.formatOpenMeteoWeather(data, locationName, airQuality);
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Weather service timed out. Please try again.');
      }
      throw error;
    }
  },
  
  async fetchAirQuality(lat, lon) {
    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(aqUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.current;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  },
  
  formatOpenMeteoWeather(data, locationName, airQuality) {
    const current = data.current;
    const daily = data.daily;
    
    const weatherCodes = {
      0: { icon: '☀️', desc: 'Clear sky' },
      1: { icon: '🌤️', desc: 'Mainly clear' },
      2: { icon: '⛅', desc: 'Partly cloudy' },
      3: { icon: '☁️', desc: 'Overcast' },
      45: { icon: '🌫️', desc: 'Fog' },
      48: { icon: '🌫️', desc: 'Depositing rime fog' },
      51: { icon: '🌧️', desc: 'Light drizzle' },
      53: { icon: '🌧️', desc: 'Moderate drizzle' },
      55: { icon: '🌧️', desc: 'Dense drizzle' },
      61: { icon: '🌧️', desc: 'Slight rain' },
      63: { icon: '🌧️', desc: 'Moderate rain' },
      65: { icon: '🌧️', desc: 'Heavy rain' },
      71: { icon: '🌨️', desc: 'Slight snow' },
      73: { icon: '🌨️', desc: 'Moderate snow' },
      75: { icon: '❄️', desc: 'Heavy snow' },
      77: { icon: '🌨️', desc: 'Snow grains' },
      80: { icon: '🌦️', desc: 'Slight showers' },
      81: { icon: '🌦️', desc: 'Moderate showers' },
      82: { icon: '⛈️', desc: 'Violent showers' },
      95: { icon: '⛈️', desc: 'Thunderstorm' },
      96: { icon: '⛈️', desc: 'Thunderstorm with hail' },
      99: { icon: '⛈️', desc: 'Thunderstorm with heavy hail' }
    };
    
    const currentWeather = weatherCodes[current.weather_code] || { icon: '🌡️', desc: 'Unknown' };
    
    let output = `## ${currentWeather.icon} Weather for ${locationName}\n\n`;
    output += `### Current Conditions\n`;
    output += `- **Temperature:** ${current.temperature_2m}°C (${Math.round(current.temperature_2m * 9/5 + 32)}°F)\n`;
    
    // Add feels like if available
    if (current.apparent_temperature !== undefined) {
      output += `- **Feels Like:** ${current.apparent_temperature}°C (${Math.round(current.apparent_temperature * 9/5 + 32)}°F)\n`;
    }
    
    output += `- **Conditions:** ${currentWeather.desc}\n`;
    output += `- **Humidity:** ${current.relative_humidity_2m}%\n`;
    output += `- **Wind:** ${current.wind_speed_10m} km/h\n`;
    
    // UV Index
    if (current.uv_index !== undefined) {
      const uvLevel = this.getUVLevel(current.uv_index);
      output += `- **UV Index:** ${current.uv_index.toFixed(1)} (${uvLevel.level}) ${uvLevel.icon}\n`;
    }
    
    output += `\n`;
    
    // Air Quality section
    if (airQuality) {
      const aqiLevel = this.getAQILevel(airQuality.us_aqi);
      output += `### 🌬️ Air Quality\n`;
      output += `- **AQI:** ${airQuality.us_aqi} (${aqiLevel.level}) ${aqiLevel.icon}\n`;
      if (airQuality.pm2_5) {
        output += `- **PM2.5:** ${airQuality.pm2_5.toFixed(1)} µg/m³\n`;
      }
      if (airQuality.pm10) {
        output += `- **PM10:** ${airQuality.pm10.toFixed(1)} µg/m³\n`;
      }
      output += `\n`;
    }
    
    if (daily && daily.time) {
      output += `### 3-Day Forecast\n`;
      for (let i = 0; i < Math.min(3, daily.time.length); i++) {
        const dayWeather = weatherCodes[daily.weather_code[i]] || { icon: '🌡️', desc: 'Unknown' };
        const date = new Date(daily.time[i]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        let dayLine = `- **${date}:** ${dayWeather.icon} ${daily.temperature_2m_min[i]}°C - ${daily.temperature_2m_max[i]}°C`;
        
        // Add precipitation probability if available
        if (daily.precipitation_probability_max && daily.precipitation_probability_max[i] > 0) {
          dayLine += ` 💧${daily.precipitation_probability_max[i]}%`;
        }
        
        // Add UV max if available
        if (daily.uv_index_max && daily.uv_index_max[i] > 3) {
          dayLine += ` ☀️UV:${daily.uv_index_max[i].toFixed(0)}`;
        }
        
        output += dayLine + `\n`;
      }
    }
    
    return output;
  },
  
  getUVLevel(uv) {
    if (uv <= 2) return { level: 'Low', icon: '🟢' };
    if (uv <= 5) return { level: 'Moderate', icon: '🟡' };
    if (uv <= 7) return { level: 'High', icon: '🟠' };
    if (uv <= 10) return { level: 'Very High', icon: '🔴' };
    return { level: 'Extreme', icon: '🟣' };
  },
  
  getAQILevel(aqi) {
    if (aqi <= 50) return { level: 'Good', icon: '🟢' };
    if (aqi <= 100) return { level: 'Moderate', icon: '🟡' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive', icon: '🟠' };
    if (aqi <= 200) return { level: 'Unhealthy', icon: '🔴' };
    if (aqi <= 300) return { level: 'Very Unhealthy', icon: '🟣' };
    return { level: 'Hazardous', icon: '🟤' };
  }
};

export default skill;

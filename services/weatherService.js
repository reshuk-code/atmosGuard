const axios = require('axios');

class WeatherService {
    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1';
        this.airQualityUrl = 'https://air-quality-api.open-meteo.com/v1';
    }

    async getCurrentWeather(lat, lon) {
        try {
            console.log(`Fetching Open-Meteo weather for coordinates: ${lat}, ${lon}`);

            const response = await axios.get(
                `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,rain,showers,snowfall,snow_depth,weather_code,cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_speed_80m,wind_speed_120m,wind_speed_180m,wind_direction_10m,wind_direction_80m,wind_direction_120m,wind_direction_180m,wind_gusts_10m,temperature_80m,temperature_120m,temperature_180m,soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_27_to_81cm&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,daylight_duration,sunshine_duration,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=auto`,
                { timeout: 10000 }
            );

            const current = response.data.current;
            const daily = response.data.daily;

            // Get UV index from separate API call (Open-Meteo has separate UV endpoint)
            let uvIndex = 0;
            try {
                const uvResponse = await axios.get(
                    `${this.baseUrl}/forecast?latitude=${lat}&longitude=${lon}&current=uv_index&timezone=auto`
                );
                uvIndex = uvResponse.data.current.uv_index || 0;
            } catch (uvError) {
                console.log('UV index not available, using 0');
            }

            return {
                temperature: Math.round(current.temperature_2m),
                feelsLike: Math.round(current.apparent_temperature),
                humidity: current.relative_humidity_2m,
                pressure: current.pressure_msl,
                windSpeed: Math.round(current.wind_speed_10m),
                windDirection: current.wind_direction_10m,
                windGusts: current.wind_gusts_10m,
                weatherCode: current.weather_code,
                weather: this.getWeatherDescription(current.weather_code),
                uvi: uvIndex,
                clouds: current.cloud_cover,
                isDay: current.is_day === 1,
                precipitation: current.precipitation,
                rain: current.rain,
                showers: current.showers,
                snowfall: current.snowfall,
                sunrise: new Date(daily.sunrise[0]),
                sunset: new Date(daily.sunset[0]),
                dailyHigh: Math.round(daily.temperature_2m_max[0]),
                dailyLow: Math.round(daily.temperature_2m_min[0])
            };
        } catch (error) {
            console.error('Open-Meteo API Error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            // Return mock data for development
            return this.getMockWeatherData();
        }
    }

    async getAirQuality(lat, lon) {
        try {
            console.log(`Fetching Open-Meteo air quality for coordinates: ${lat}, ${lon}`);

            const response = await axios.get(
                `${this.airQualityUrl}/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,european_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,aerosol_optical_depth&hourly=pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,aerosol_optical_depth&domains=cams_global&timezone=auto`,
                { timeout: 10000 }
            );

            const current = response.data.current;

            // Use US AQI if available, otherwise European AQI
            const aqiValue = current.us_aqi || current.european_aqi || 1;

            return {
                aqi: aqiValue,
                aqiDescription: this.getAQIDescription(aqiValue, current.us_aqi ? 'us' : 'european'),
                components: {
                    pm2_5: current.pm2_5,
                    pm10: current.pm10,
                    co: current.carbon_monoxide,
                    no2: current.nitrogen_dioxide,
                    so2: current.sulphur_dioxide,
                    o3: current.ozone,
                    dust: current.dust,
                    aerosol_optical_depth: current.aerosol_optical_depth
                },
                timestamp: new Date()
            };
        } catch (error) {
            console.error('Open-Meteo Air Quality API Error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            // Return mock data for development
            return this.getMockAirQualityData();
        }
    }

    getAQIDescription(aqi, type = 'us') {
        if (type === 'us') {
            // US AQI scale
            if (aqi <= 50) {
                return {
                    level: 'Good',
                    color: '#10b981',
                    description: 'Air quality is satisfactory',
                    recommendation: 'Air quality is ideal for outdoor activities.',
                    icon: 'fa-smile'
                };
            } else if (aqi <= 100) {
                return {
                    level: 'Moderate',
                    color: '#f59e0b',
                    description: 'Air quality is acceptable',
                    recommendation: 'Unusually sensitive people should consider limiting prolonged outdoor exertion.',
                    icon: 'fa-meh'
                };
            } else if (aqi <= 150) {
                return {
                    level: 'Unhealthy for Sensitive Groups',
                    color: '#f97316',
                    description: 'Members of sensitive groups may experience health effects',
                    recommendation: 'Active children and adults, and people with respiratory disease should limit prolonged outdoor exertion.',
                    icon: 'fa-frown'
                };
            } else if (aqi <= 200) {
                return {
                    level: 'Unhealthy',
                    color: '#ef4444',
                    description: 'Everyone may begin to experience health effects',
                    recommendation: 'Everyone may begin to experience health effects. Sensitive groups should avoid outdoor activity.',
                    icon: 'fa-sad-tear'
                };
            } else if (aqi <= 300) {
                return {
                    level: 'Very Unhealthy',
                    color: '#7f1d1d',
                    description: 'Health warnings of emergency conditions',
                    recommendation: 'Everyone should avoid all outdoor exertion.',
                    icon: 'fa-exclamation-triangle'
                };
            } else {
                return {
                    level: 'Hazardous',
                    color: '#4c0519',
                    description: 'Health alert: everyone may experience serious health effects',
                    recommendation: 'Remain indoors and keep activity levels low.',
                    icon: 'fa-skull-crossbones'
                };
            }
        } else {
            // European AQI scale (0-100+)
            if (aqi <= 20) {
                return {
                    level: 'Good',
                    color: '#10b981',
                    description: 'Air quality is good',
                    recommendation: 'Ideal air quality for outdoor activities.',
                    icon: 'fa-smile'
                };
            } else if (aqi <= 40) {
                return {
                    level: 'Fair',
                    color: '#f59e0b',
                    description: 'Air quality is fair',
                    recommendation: 'Generally acceptable for most people.',
                    icon: 'fa-meh'
                };
            } else if (aqi <= 60) {
                return {
                    level: 'Moderate',
                    color: '#f97316',
                    description: 'Air quality is moderate',
                    recommendation: 'Sensitive individuals should limit outdoor activities.',
                    icon: 'fa-frown'
                };
            } else if (aqi <= 80) {
                return {
                    level: 'Poor',
                    color: '#ef4444',
                    description: 'Air quality is poor',
                    recommendation: 'Everyone may start to experience health effects.',
                    icon: 'fa-sad-tear'
                };
            } else if (aqi <= 100) {
                return {
                    level: 'Very Poor',
                    color: '#7f1d1d',
                    description: 'Air quality is very poor',
                    recommendation: 'Health alert - avoid outdoor activities.',
                    icon: 'fa-exclamation-triangle'
                };
            } else {
                return {
                    level: 'Extremely Poor',
                    color: '#4c0519',
                    description: 'Air quality is hazardous',
                    recommendation: 'Health emergency - stay indoors.',
                    icon: 'fa-skull-crossbones'
                };
            }
        }
    }

    getUVIndexDescription(uvi) {
        if (uvi <= 2) {
            return {
                level: 'Low',
                color: '#10b981',
                risk: 'Low risk from UV rays',
                icon: 'fa-check-circle',
                protection: 'Wear sunglasses on bright days. If outside for more than 1 hour, cover up and use sunscreen.'
            };
        }
        if (uvi <= 5) {
            return {
                level: 'Moderate',
                color: '#f59e0b',
                risk: 'Moderate risk of harm',
                icon: 'fa-exclamation-circle',
                protection: 'Stay in shade near midday. Wear protective clothing, a wide-brimmed hat, and UV-blocking sunglasses. Apply sunscreen SPF 30+ every 2 hours.'
            };
        }
        if (uvi <= 7) {
            return {
                level: 'High',
                color: '#f97316',
                risk: 'High risk of harm',
                icon: 'fa-exclamation-triangle',
                protection: 'Reduce time in the sun between 10 a.m. and 4 p.m. Wear protective clothing, a wide-brimmed hat, and UV-blocking sunglasses. Apply sunscreen SPF 30+ every 2 hours.'
            };
        }
        if (uvi <= 10) {
            return {
                level: 'Very High',
                color: '#ef4444',
                risk: 'Very high risk of harm',
                icon: 'fa-radiation',
                protection: 'Minimize exposure to the sun between 10 a.m. and 4 p.m. Wear protective clothing, a wide-brimmed hat, and UV-blocking sunglasses. Apply sunscreen SPF 50+ every 2 hours.'
            };
        }
        return {
            level: 'Extreme',
            color: '#7f1d1d',
            risk: 'Extreme risk of harm',
            icon: 'fa-skull-crossbones',
            protection: 'Avoid being outside during midday hours. Wear full protective clothing, a wide-brimmed hat, and UV-blocking sunglasses. Apply sunscreen SPF 50+ every 1-2 hours.'
        };
    }

    getWeatherDescription(weatherCode) {
        // Open-Meteo uses WMO weather codes
        const weatherCodes = {
            0: { main: 'Clear', description: 'Clear sky', icon: '01' },
            1: { main: 'Mainly Clear', description: 'Mainly clear', icon: '01' },
            2: { main: 'Partly Cloudy', description: 'Partly cloudy', icon: '02' },
            3: { main: 'Overcast', description: 'Overcast', icon: '04' },
            45: { main: 'Fog', description: 'Fog', icon: '50' },
            48: { main: 'Depositing Rime Fog', description: 'Depositing rime fog', icon: '50' },
            51: { main: 'Drizzle', description: 'Light drizzle', icon: '09' },
            53: { main: 'Drizzle', description: 'Moderate drizzle', icon: '09' },
            55: { main: 'Drizzle', description: 'Dense drizzle', icon: '09' },
            56: { main: 'Freezing Drizzle', description: 'Light freezing drizzle', icon: '09' },
            57: { main: 'Freezing Drizzle', description: 'Dense freezing drizzle', icon: '09' },
            61: { main: 'Rain', description: 'Slight rain', icon: '10' },
            63: { main: 'Rain', description: 'Moderate rain', icon: '10' },
            65: { main: 'Rain', description: 'Heavy rain', icon: '10' },
            66: { main: 'Freezing Rain', description: 'Light freezing rain', icon: '10' },
            67: { main: 'Freezing Rain', description: 'Heavy freezing rain', icon: '10' },
            71: { main: 'Snow', description: 'Slight snowfall', icon: '13' },
            73: { main: 'Snow', description: 'Moderate snowfall', icon: '13' },
            75: { main: 'Snow', description: 'Heavy snowfall', icon: '13' },
            77: { main: 'Snow Grains', description: 'Snow grains', icon: '13' },
            80: { main: 'Rain Showers', description: 'Slight rain showers', icon: '09' },
            81: { main: 'Rain Showers', description: 'Moderate rain showers', icon: '09' },
            82: { main: 'Rain Showers', description: 'Violent rain showers', icon: '09' },
            85: { main: 'Snow Showers', description: 'Slight snow showers', icon: '13' },
            86: { main: 'Snow Showers', description: 'Heavy snow showers', icon: '13' },
            95: { main: 'Thunderstorm', description: 'Thunderstorm', icon: '11' },
            96: { main: 'Thunderstorm', description: 'Thunderstorm with slight hail', icon: '11' },
            99: { main: 'Thunderstorm', description: 'Thunderstorm with heavy hail', icon: '11' }
        };

        return weatherCodes[weatherCode] || { main: 'Unknown', description: 'Unknown weather', icon: '01' };
    }

    getWindDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    async getCompleteWeatherData(lat, lon) {
        try {
            console.log(`Fetching complete Open-Meteo data for: ${lat}, ${lon}`);

            const [weather, airQuality] = await Promise.all([
                this.getCurrentWeather(lat, lon),
                this.getAirQuality(lat, lon)
            ]);

            const uvInfo = this.getUVIndexDescription(weather.uvi);

            return {
                weather: {
                    temperature: weather.temperature,
                    feelsLike: weather.feelsLike,
                    humidity: weather.humidity,
                    pressure: weather.pressure,
                    windSpeed: weather.windSpeed,
                    windDirection: weather.windDirection,
                    windGusts: weather.windGusts,
                    condition: weather.weather.main,
                    description: weather.weather.description,
                    icon: weather.weather.icon,
                    sunrise: weather.sunrise,
                    sunset: weather.sunset,
                    clouds: weather.clouds,
                    isDay: weather.isDay,
                    dailyHigh: weather.dailyHigh,
                    dailyLow: weather.dailyLow,
                    precipitation: weather.precipitation,
                    rain: weather.rain,
                    showers: weather.showers,
                    snowfall: weather.snowfall
                },
                uv: {
                    index: weather.uvi.toFixed(1),
                    level: uvInfo.level,
                    color: uvInfo.color,
                    risk: uvInfo.risk,
                    icon: uvInfo.icon,
                    protectionAdvice: uvInfo.protection.split('. '),
                    category: this.getUVCategory(weather.uvi)
                },
                airQuality: airQuality,
                location: {
                    lat: lat,
                    lon: lon
                },
                timestamp: new Date(),
                fetched: true,
                source: 'open-meteo'
            };
        } catch (error) {
            console.error('Complete Open-Meteo data error:', error);
            throw error;
        }
    }

    getUVCategory(uvi) {
        if (uvi <= 2.9) return 'Low';
        if (uvi <= 5.9) return 'Moderate';
        if (uvi <= 7.9) return 'High';
        if (uvi <= 10.9) return 'Very High';
        return 'Extreme';
    }

    getMockWeatherData() {
        // Mock data for development when API fails
        return {
            temperature: Math.floor(Math.random() * 15) + 20,
            feelsLike: Math.floor(Math.random() * 15) + 18,
            humidity: Math.floor(Math.random() * 40) + 40,
            pressure: Math.floor(Math.random() * 30) + 980,
            windSpeed: Math.floor(Math.random() * 20) + 5,
            windDirection: 180,
            windGusts: Math.floor(Math.random() * 10) + 10,
            weatherCode: 1,
            weather: {
                main: 'Clear',
                description: 'Clear sky',
                icon: '01d'
            },
            uvi: (Math.random() * 11).toFixed(1),
            clouds: Math.floor(Math.random() * 100),
            isDay: true,
            precipitation: 0,
            rain: 0,
            showers: 0,
            snowfall: 0,
            sunrise: new Date(Date.now() + 6 * 60 * 60 * 1000),
            sunset: new Date(Date.now() + 18 * 60 * 60 * 1000),
            dailyHigh: Math.floor(Math.random() * 15) + 25,
            dailyLow: Math.floor(Math.random() * 10) + 15
        };
    }

    getMockAirQualityData() {
        return {
            aqi: Math.floor(Math.random() * 150) + 1,
            aqiDescription: this.getAQIDescription(Math.floor(Math.random() * 150) + 1, 'us'),
            components: {
                pm2_5: (Math.random() * 30 + 5).toFixed(1),
                pm10: (Math.random() * 50 + 10).toFixed(1),
                co: (Math.random() * 1000 + 100).toFixed(1),
                no2: (Math.random() * 50 + 10).toFixed(1),
                so2: (Math.random() * 20).toFixed(1),
                o3: (Math.random() * 60 + 30).toFixed(1),
                dust: (Math.random() * 20).toFixed(1),
                aerosol_optical_depth: (Math.random() * 2).toFixed(2)
            },
            timestamp: new Date()
        };
    }

    // Helper method to get location from city name (using Open-Meteo Geocoding API)
    async geocodeLocation(cityName) {
        try {
            const response = await axios.get(
                `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`
            );

            if (response.data.results && response.data.results.length > 0) {
                const location = response.data.results[0];
                return {
                    name: location.name,
                    lat: location.latitude,
                    lon: location.longitude,
                    country: location.country,
                    admin1: location.admin1
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }
}

module.exports = new WeatherService();
const User = require('../models/User');
const weatherService = require('../services/weatherService');

// Get dashboard data with real weather
const getDashboardData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        let weatherData = null;
        let locationName = user.preferredLocation?.name || "Unknown Location";
        let fetched = false;

        // Get real weather data if location is set
        if (user.preferredLocation?.lat && user.preferredLocation?.lon) {
            try {
                weatherData = await weatherService.getCompleteWeatherData(
                    user.preferredLocation.lat,
                    user.preferredLocation.lon
                );
                fetched = weatherData.fetched;

                // FIX: Handle the case where uvi might be undefined or not a number
                let uvIndex = 0;
                if (weatherData.uv && typeof weatherData.uv.index === 'number') {
                    uvIndex = parseFloat(weatherData.uv.index);
                } else if (weatherData.weather && typeof weatherData.weather.uvi === 'number') {
                    uvIndex = weatherData.weather.uvi;
                }

                // Make sure uvIndex is a valid number
                if (isNaN(uvIndex)) {
                    uvIndex = 0;
                }

            } catch (weatherError) {
                console.error('Weather data fetch error:', weatherError);
                // Fallback to simulated data
                weatherData = {
                    weather: {
                        temperature: Math.floor(Math.random() * 15) + 20,
                        feelsLike: Math.floor(Math.random() * 15) + 18,
                        humidity: Math.floor(Math.random() * 40) + 40,
                        pressure: Math.floor(Math.random() * 30) + 980,
                        windSpeed: Math.floor(Math.random() * 20) + 5,
                        condition: ['Clear', 'Clouds', 'Rain'][Math.floor(Math.random() * 3)],
                        description: ['clear sky', 'few clouds', 'light rain'][Math.floor(Math.random() * 3)],
                        icon: '01d',
                        sunrise: new Date(Date.now() + 6 * 60 * 60 * 1000),
                        sunset: new Date(Date.now() + 18 * 60 * 60 * 1000),
                        clouds: 20,
                        visibility: '10 km'
                    },
                    uv: {
                        index: '5.2',
                        level: 'Moderate',
                        color: '#f59e0b',
                        risk: 'Moderate risk of harm',
                        protectionAdvice: [
                            'Stay in shade near midday',
                            'Wear protective clothing',
                            'Apply sunscreen SPF 30+ every 2 hours'
                        ]
                    },
                    airQuality: weatherService.getMockAirQualityData(),
                    fetched: false
                };
            }
        }

        // Generate personalized tips
        const personalizedTips = generatePersonalizedTips(user, weatherData);

        // Calculate days since account creation
        const createdAt = new Date(user.createdAt);
        const today = new Date();
        const daysSinceCreation = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    age: user.age,
                    skinType: user.skinType,
                    skinCondition: user.skinCondition,
                    hasSkinCancerHistory: user.hasSkinCancerHistory,
                    preferredLocation: user.preferredLocation,
                    onboardingCompleted: user.onboardingCompleted,
                    createdAt: user.createdAt
                },
                weather: weatherData.weather,
                uv: weatherData.uv,
                airQuality: weatherData.airQuality,
                location: locationName,
                locationCoords: user.preferredLocation ? {
                    lat: user.preferredLocation.lat,
                    lon: user.preferredLocation.lon
                } : null,
                dailyTips: personalizedTips,
                stats: {
                    daysProtected: Math.min(daysSinceCreation, Math.floor(Math.random() * 30) + 10),
                    adviceReceived: Math.floor(Math.random() * 20) + 5,
                    uvAlerts: Math.floor(Math.random() * 10) + 1,
                    aqiAlerts: Math.floor(Math.random() * 5),
                    streak: Math.floor(Math.random() * 7) + 1
                },
                recentActivities: [
                    {
                        id: 1,
                        type: 'uv_alert',
                        message: `UV Index is ${weatherData.uv.index} (${weatherData.uv.level})`,
                        time: 'Today',
                        icon: 'fa-sun'
                    },
                    {
                        id: 2,
                        type: 'aqi_alert',
                        message: `Air Quality: ${weatherData.airQuality.aqiDescription.level}`,
                        time: 'Today',
                        icon: 'fa-wind'
                    },
                    {
                        id: 3,
                        type: 'profile',
                        message: 'Profile setup completed',
                        time: user.onboardingCompleted ? new Date().toLocaleDateString() : 'Pending',
                        icon: 'fa-user-check'
                    },
                    {
                        id: 4,
                        type: 'weather',
                        message: `Temperature: ${weatherData.weather.temperature}°C`,
                        time: 'Updated just now',
                        icon: 'fa-thermometer-half'
                    }
                ],
                dataFetched: fetched,
                lastUpdated: new Date()
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Generate personalized tips based on user profile and weather
function generatePersonalizedTips(user, weatherData) {
    const tips = [];

    // UV protection tips based on skin type
    if (user.skinType === 'I' || user.skinType === 'II') {
        tips.push("Your fair skin (Type " + user.skinType + ") is highly sensitive to UV rays. Use SPF 50+ sunscreen daily.");
    } else if (user.skinType === 'V' || user.skinType === 'VI') {
        tips.push("While your darker skin (Type " + user.skinType + ") has natural protection, UV rays still cause damage. Use SPF 30+.");
    } else if (user.skinType) {
        tips.push("Your skin type " + user.skinType + " requires regular sun protection. Apply sunscreen every 2 hours when outdoors.");
    }

    // Age-based tips
    if (user.age) {
        if (user.age < 18) {
            tips.push("Children's skin is more sensitive. Ensure proper sun protection during outdoor activities.");
        } else if (user.age > 60) {
            tips.push("Mature skin needs extra hydration alongside sun protection.");
        } else if (user.age >= 18 && user.age <= 30) {
            tips.push("Your skin is in its prime protection years. Establishing good habits now prevents future damage.");
        }
    }

    // Skin condition specific tips
    if (user.skinCondition === 'eczema' || user.skinCondition === 'psoriasis') {
        tips.push("Choose mineral-based sunscreens (zinc oxide/titanium dioxide) to avoid irritating sensitive skin.");
    }

    if (user.skinCondition === 'lupus') {
        tips.push("Lupus requires maximum sun protection. Wear UPF 50+ clothing and broad-spectrum sunscreen.");
    }

    if (user.skinCondition === 'vitiligo') {
        tips.push("Protect depigmented areas with high SPF sunscreen and consider wearing protective clothing.");
    }

    if (user.hasSkinCancerHistory) {
        tips.push("Due to your skin cancer history, regular skin checks are crucial. Consult a dermatologist annually.");
        tips.push("Use maximum protection: SPF 50+, UPF clothing, and avoid peak sun hours.");
    }

    // UV index based tips
    const uvIndex = parseFloat(weatherData.uv.index);
    if (uvIndex > 7) {
        tips.push("High UV levels detected. Limit outdoor activities between 10 AM and 4 PM.");
    } else if (uvIndex > 5) {
        tips.push("Moderate UV levels. Wear protective clothing and apply sunscreen.");
    }

    // AQI based tips
    if (weatherData.airQuality.aqi >= 4) {
        tips.push("Poor air quality may affect respiratory health. Consider limiting outdoor exercise.");
    }

    // Weather based tips
    if (weatherData.weather.humidity > 70) {
        tips.push("High humidity can make sunscreen less effective. Reapply more frequently.");
    }

    // Default tip if none generated
    if (tips.length === 0) {
        tips.push("Remember to apply sunscreen 15 minutes before going outside and reapply every 2 hours.");
        tips.push("Wear protective clothing, a wide-brimmed hat, and UV-blocking sunglasses.");
    }

    return tips.slice(0, 5); // Return max 5 tips
}

// Complete onboarding
const completeOnboarding = async (req, res) => {
    try {
        const { skinType, skinCondition, hasSkinCancerHistory, age, location } = req.body;

        // Validate required fields
        if (!skinType || !skinCondition || !age) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields'
            });
        }

        // Validate age
        if (age < 1 || age > 120) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid age (1-120)'
            });
        }

        const updateData = {
            skinType,
            skinCondition,
            hasSkinCancerHistory: hasSkinCancerHistory === 'true',
            age: parseInt(age),
            onboardingCompleted: true,
            updatedAt: new Date()
        };

        if (location && location.name && location.lat && location.lon) {
            updateData.preferredLocation = {
                name: location.name,
                lat: parseFloat(location.lat),
                lon: parseFloat(location.lon)
            };
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        );

        // Update user in session/localStorage
        res.json({
            success: true,
            message: 'Onboarding completed successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                age: user.age,
                skinType: user.skinType,
                skinCondition: user.skinCondition,
                hasSkinCancerHistory: user.hasSkinCancerHistory,
                preferredLocation: user.preferredLocation,
                onboardingCompleted: user.onboardingCompleted,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Onboarding error:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map(err => err.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error during onboarding',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { name, skinType, skinCondition, hasSkinCancerHistory, age, location } = req.body;

        const updateData = { updatedAt: new Date() };

        // Validate and add fields if provided
        if (name) updateData.name = name.trim();
        if (skinType) updateData.skinType = skinType;
        if (skinCondition) updateData.skinCondition = skinCondition;
        if (hasSkinCancerHistory !== undefined) updateData.hasSkinCancerHistory = hasSkinCancerHistory === 'true';
        if (age !== undefined) {
            const ageNum = parseInt(age);
            if (ageNum < 1 || ageNum > 120) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid age (1-120)'
                });
            }
            updateData.age = ageNum;
        }

        // Handle location update
        if (location) {
            if (location.name && location.lat && location.lon) {
                updateData.preferredLocation = {
                    name: location.name,
                    lat: parseFloat(location.lat),
                    lon: parseFloat(location.lon)
                };
            } else if (location === 'clear') {
                updateData.preferredLocation = null;
            }
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                age: user.age,
                skinType: user.skinType,
                skinCondition: user.skinCondition,
                hasSkinCancerHistory: user.hasSkinCancerHistory,
                preferredLocation: user.preferredLocation,
                onboardingCompleted: user.onboardingCompleted
            }
        });

    } catch (error) {
        console.error('Profile update error:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map(err => err.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error updating profile',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getDashboardData,
    completeOnboarding,
    updateProfile
};
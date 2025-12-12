const User = require('../models/User');
const weatherService = require('../services/weatherService'); // adjust path if needed
const axios = require('axios');

// Helper: Skin type description
function getSkinTypeDescription(skinType) {
    const descriptions = {
        'I': 'Very fair - always burns, never tans',
        'II': 'Fair - usually burns, tans minimally',
        'III': 'Medium - sometimes burns, gradually tans',
        'IV': 'Olive - rarely burns, tans easily',
        'V': 'Brown - very rarely burns, tans very easily',
        'VI': 'Dark - never burns, deeply pigmented'
    };
    return descriptions[skinType] || 'Not specified';
}

// Helper: Get AI clothing recommendations
async function getClothingRecommendations(user, weatherData, uvData, aqiData) {
    try {
        const prompt = `
You are a fashion and health expert for AtmosGuard, an app that provides personalized clothing recommendations based on weather conditions, UV index, and air quality.

User Profile:
- Skin Type: ${user.skinType} (${getSkinTypeDescription(user.skinType)})
- Skin Condition: ${user.skinCondition || 'Not specified'}
- Age: ${user.age || 'Not specified'} years
- Skin Cancer History: ${user.hasSkinCancerHistory ? 'Yes' : 'No'}

Current Conditions:
- UV Index: ${uvData.index} (${uvData.level})
- Air Quality Index: ${aqiData.aqi} (${aqiData.aqiDescription.level})
- Temperature: ${weatherData.temperature}°C
- Weather: ${weatherData.condition}
- Humidity: ${weatherData.humidity}%
- Wind Speed: ${weatherData.windSpeed} km/h

Please provide specific clothing recommendations for today including:
1. HEADWEAR (hats, caps, etc.)
2. UPPER BODY (shirts, jackets, etc.)
3. LOWER BODY (pants, shorts, skirts, etc.)
4. FOOTWEAR (shoes, socks, etc.)
5. ACCESSORIES (sunglasses, gloves, scarves, etc.)
6. SPECIAL CONSIDERATIONS (for skin conditions, cancer history, etc.)

Format your response as a JSON object with the following structure:
{
    "headwear": ["item1", "item2"],
    "upperBody": ["item1", "item2"],
    "lowerBody": ["item1", "item2"],
    "footwear": ["item1", "item2"],
    "accessories": ["item1", "item2"],
    "specialConsiderations": ["consideration1", "consideration2"],
    "overallAdvice": "Brief overall advice for today"
}

Return ONLY the JSON object, no other text.
`;

        const response = await axios.post(
            `${process.env.OPENROUTER_BASE_URL}/chat/completions`,
            {
                model: "openrouter/openchat-3.5-16k",
                messages: [
                    { role: "system", content: "You are a fashion and health expert. Return ONLY valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 800
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://atmosguard.vercel.app",
                    "X-Title": "AtmosGuard",
                    "Content-Type": "application/json"
                }
            }
        );

        const aiResponse = response.data.choices[0].message.content.trim();
        const recommendations = JSON.parse(aiResponse);

        // Add images
        const recommendationsWithImages = await getImagesForRecommendations(recommendations);
        return recommendationsWithImages;

    } catch (error) {
        console.error('AI clothing recommendation error:', error.response?.data || error.message);
        return getFallbackRecommendations(uvData, aqiData);
    }
}

// Helper: Unsplash images with fallback queries
async function getImagesForRecommendations(recommendations) {
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;

    if (!unsplashAccessKey) {
        return addPlaceholderImages(recommendations);
    }

    try {
        const imagePromises = [];
        const categories = ['headwear', 'upperBody', 'lowerBody', 'footwear', 'accessories'];

        // Define fallback queries for better results
        const fallbackQueries = {
            headwear: ['wide brim sun hat', 'bucket hat', 'sun protection hat', 'cap with neck flap'],
            upperBody: ['long sleeve shirt', 'UPF shirt', 'lightweight jacket', 'rash guard'],
            lowerBody: ['long pants', 'lightweight trousers', 'capri pants', 'maxi skirt'],
            footwear: ['comfortable walking shoes', 'breathable sneakers', 'closed toe sandals'],
            accessories: ['UV sunglasses', 'neck gaiter', 'face mask', 'sun gloves', 'scarf']
        };

        for (const category of categories) {
            if (recommendations[category]?.length > 0) {
                const firstItem = recommendations[category][0].toLowerCase();

                // Primary search
                let searchQuery = firstItem;
                if (firstItem.includes('hat')) searchQuery = 'sun hat';
                else if (firstItem.includes('shirt')) searchQuery = 'long sleeve shirt';
                else if (firstItem.includes('pant')) searchQuery = 'lightweight pants';
                else if (firstItem.includes('shoe')) searchQuery = 'comfortable walking shoes';
                else if (firstItem.includes('sunglass') || firstItem.includes('glasses')) searchQuery = 'sunglasses';
                else if (firstItem.includes('mask')) searchQuery = 'face mask';
                else if (firstItem.includes('gaiter') || firstItem.includes('scarf')) searchQuery = 'neck gaiter';

                imagePromises.push(
                    fetchImageWithFallbacks(searchQuery, fallbackQueries[category])
                );
            } else {
                imagePromises.push(null);
            }
        }

        const responses = await Promise.allSettled(imagePromises.filter(p => p));

        let idx = 0;
        for (const category of categories) {
            if (recommendations[category]?.length > 0) {
                const res = responses[idx];
                if (res?.status === 'fulfilled' && res.value) {
                    recommendations[`${category}Images`] = [res.value];
                } else {
                    recommendations[`${category}Images`] = [getPlaceholderImage(category)];
                }
                idx++;
            }
        }

        return recommendations;
    } catch (error) {
        console.error('Unsplash API error:', error);
        return addPlaceholderImages(recommendations);
    }
}

// New helper: Try multiple search terms until one works
async function fetchImageWithFallbacks(primaryQuery, fallbackQueries = []) {
    const queries = [primaryQuery, ...fallbackQueries];
    const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;

    for (const query of queries) {
        try {
            const response = await axios.get(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=squarish`,
                {
                    headers: { 'Authorization': `Client-ID ${unsplashAccessKey}` },
                    timeout: 5000
                }
            );

            if (response.data.results && response.data.results.length > 0) {
                const photo = response.data.results[0];
                return {
                    url: photo.urls.small,
                    alt: photo.alt_description || query,
                    photographer: photo.user.name,
                    unsplashUrl: photo.links.html
                };
            }
        } catch (err) {
            // Continue to next query
            console.log(`Query failed: "${query}", trying next...`);
        }
    }

    // If all fail, return a reliable generic placeholder from Unsplash
    const genericPlaceholders = {
        headwear: 'https://images.unsplash.com/photo-1593478606872-6e18a2d2e7da?w=400&h=400&fit=crop',
        upperBody: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
        lowerBody: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&h=400&fit=crop',
        footwear: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
        accessories: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop'
    };

    const category = Object.keys(genericPlaceholders).find(cat => primaryQuery.includes(cat)) || 'accessories';

    return {
        url: genericPlaceholders[category],
        alt: `Recommended ${category} item`,
        photographer: 'Unsplash'
    };
}

// Helper: Placeholder images
function addPlaceholderImages(recommendations) {
    const categories = ['headwear', 'upperBody', 'lowerBody', 'footwear', 'accessories'];
    categories.forEach(category => {
        if (recommendations[category]?.length > 0) {
            recommendations[`${category}Images`] = [getPlaceholderImage(category)];
        }
    });
    return recommendations;
}

function getPlaceholderImage(category) {
    const placeholders = {
        headwear: { url: 'https://images.unsplash.com/photo-1678721938524-1a3ee398de2a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', alt: 'Sun hat', photographer: 'Placeholder' },
        upperBody: { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop', alt: 'Long sleeve shirt', photographer: 'Placeholder' },
        lowerBody: { url: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&h=400&fit=crop', alt: 'Lightweight pants', photographer: 'Placeholder' },
        footwear: { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', alt: 'Comfortable shoes', photographer: 'Placeholder' },
        accessories: { url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop', alt: 'Sunglasses', photographer: 'Placeholder' }
    };
    return placeholders[category] || { url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w==400&h=400&fit=crop', alt: 'Clothing', photographer: 'Placeholder' };
}

// Helper: Fallback recommendations
function getFallbackRecommendations(uvData, aqiData) {
    const uvIndex = parseFloat(uvData.index);
    const aqi = aqiData.aqi;

    const rec = {
        headwear: [], upperBody: [], lowerBody: [], footwear: [], accessories: [],
        specialConsiderations: [], overallAdvice: ''
    };

    // UV logic
    if (uvIndex > 7) {
        rec.headwear.push("Wide-brimmed hat (3+ inch brim)", "Bucket hat with neck flap");
        rec.upperBody.push("UPF 50+ long-sleeve shirt");
        rec.lowerBody.push("Lightweight long pants");
        rec.accessories.push("UV-blocking sunglasses (100% protection)", "Neck gaiter or scarf");
        rec.overallAdvice = "Extreme UV levels today. Maximum protection required.";
    } else if (uvIndex > 5) {
        rec.headwear.push("Baseball cap with neck flap");
        rec.upperBody.push("Long-sleeve shirt (tight weave)");
        rec.lowerBody.push("Knee-length pants or skirt");
        rec.accessories.push("Sunglasses with UV protection");
        rec.overallAdvice = "High UV levels. Good protection needed.";
    } else if (uvIndex > 3) {
        rec.headwear.push("Baseball cap or visor");
        rec.upperBody.push("Short-sleeve shirt with collar");
        rec.lowerBody.push("Shorts or short skirt are okay");
        rec.accessories.push("Sunglasses recommended");
        rec.overallAdvice = "Moderate UV levels. Some protection needed.";
    } else {
        rec.headwear.push("Any hat for style");
        rec.upperBody.push("Comfortable short-sleeve top");
        rec.lowerBody.push("Shorts or pants as preferred");
        rec.overallAdvice = "Low UV levels. Minimal protection needed.";
    }

    // AQI logic
    if (aqi > 150) {
        rec.accessories.push("N95 mask or respirator");
        rec.upperBody.push("Long sleeves to cover skin");
        rec.specialConsiderations.push("Poor air quality - limit outdoor time");
        rec.overallAdvice += " Poor air quality - consider staying indoors.";
    } else if (aqi > 100) {
        rec.accessories.push("Surgical mask if sensitive");
        rec.specialConsiderations.push("Moderate air quality - sensitive individuals take care");
    }

    // Footwear
    rec.footwear.push("Comfortable walking shoes", "Breathable socks");

    return addPlaceholderImages(rec);
}

// Dummy function if not defined elsewhere
function generatePersonalizedTips(user, weatherData) {
    return ["Stay hydrated", "Reapply sunscreen every 2 hours"];
}

// Main: Get dashboard data
const getDashboardData = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        let weatherData = {
            weather: { temperature: 25, condition: 'Clear', humidity: 60, windSpeed: 10 },
            uv: { index: '6', level: 'High', color: '#f97316', risk: 'High risk' },
            airQuality: { aqi: 80, aqiDescription: { level: 'Moderate' } },
            fetched: false
        };

        let locationName = user.preferredLocation?.name || "Unknown Location";
        let fetched = false;

        if (user.preferredLocation?.lat && user.preferredLocation?.lon) {
            try {
                weatherData = await weatherService.getCompleteWeatherData(
                    user.preferredLocation.lat,
                    user.preferredLocation.lon
                );
                fetched = weatherData.fetched;
            } catch (err) {
                console.error('Weather fetch failed, using fallback');
            }
        }

        let aiRecommendations = null;
        try {
            aiRecommendations = await getClothingRecommendations(
                user,
                weatherData.weather,
                weatherData.uv,
                weatherData.airQuality
            );
        } catch (err) {
            aiRecommendations = getFallbackRecommendations(weatherData.uv, weatherData.airQuality);
        }

        const personalizedTips = generatePersonalizedTips(user, weatherData);
        const createdAt = new Date(user.createdAt);
        const daysSinceCreation = Math.floor((new Date() - createdAt) / (1000 * 60 * 60 * 24));

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
                aiRecommendations,
                location: locationName,
                locationCoords: user.preferredLocation ? { lat: user.preferredLocation.lat, lon: user.preferredLocation.lon } : null,
                dailyTips: personalizedTips,
                stats: {
                    daysProtected: Math.min(daysSinceCreation, Math.floor(Math.random() * 30) + 10),
                    adviceReceived: Math.floor(Math.random() * 20) + 5,
                    uvAlerts: Math.floor(Math.random() * 10) + 1,
                    aqiAlerts: Math.floor(Math.random() * 5),
                    streak: Math.floor(Math.random() * 7) + 1
                },
                recentActivities: [
                    { id: 1, type: 'uv_alert', message: `UV Index is ${weatherData.uv.index} (${weatherData.uv.level})`, time: 'Today', icon: 'fa-sun' },
                    { id: 2, type: 'aqi_alert', message: `Air Quality: ${weatherData.airQuality.aqiDescription.level}`, time: 'Today', icon: 'fa-wind' },
                    { id: 3, type: 'ai_recommendation', message: 'AI clothing recommendations generated', time: 'Today', icon: 'fa-robot' },
                    { id: 4, type: 'weather', message: `Temperature: ${weatherData.weather.temperature}°C`, time: 'Updated just now', icon: 'fa-thermometer-half' }
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

// Refresh recommendations endpoint
const refreshAIRecommendations = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.preferredLocation?.lat || !user.preferredLocation?.lon) {
            return res.status(400).json({ success: false, message: "Location not set" });
        }

        const weatherData = await weatherService.getCompleteWeatherData(
            user.preferredLocation.lat,
            user.preferredLocation.lon
        );

        const aiRecommendations = await getClothingRecommendations(
            user,
            weatherData.weather,
            weatherData.uv,
            weatherData.airQuality
        );

        res.json({ success: true, recommendations: aiRecommendations });

    } catch (error) {
        console.error('Refresh recommendations error:', error);
        res.status(500).json({ success: false, message: 'Failed to refresh recommendations' });
    }
};

// === ONLY ONE EXPORT ===
module.exports = {
    getDashboardData,
    refreshAIRecommendations,
};
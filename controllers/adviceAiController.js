// controllers/adviceAiController.js

const axios = require('axios');
const User = require('../models/User');
const weatherService = require('../services/weatherService');

const getAIAdviceChat = async (req, res) => {
    // Set headers early
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    try {
        const user = await User.findById(req.user.id).lean();
        if (!user) {
            res.write('data: {"error": "User not found"}\n\n');
            res.end();
            return;
        }

        const userMessage = req.body.message?.trim() || '';

        // Fetch weather data
        let weatherData = {
            weather: { temperature: 'N/A', condition: 'Unknown', humidity: 'N/A', windSpeed: 'N/A' },
            uv: { index: 'N/A', level: 'Unknown' },
            airQuality: { aqi: 'N/A', aqiDescription: { level: 'Unknown' } }
        };

        if (user.preferredLocation?.lat && user.preferredLocation?.lon) {
            try {
                weatherData = await weatherService.getCompleteWeatherData(
                    user.preferredLocation.lat,
                    user.preferredLocation.lon
                );
            } catch (err) {
                console.error('Weather fetch failed:', err);
            }
        }

        const skinTypeDesc = {
            'I': 'Very fair - always burns, never tans',
            'II': 'Fair - usually burns, tans minimally',
            'III': 'Medium - sometimes burns, gradually tans',
            'IV': 'Olive - rarely burns, tans easily',
            'V': 'Brown - very rarely burns, tans very easily',
            'VI': 'Dark - never burns, deeply pigmented'
        };

        const systemPrompt = `You are a compassionate, expert AI sun protection advisor for AtmosGuard.

User Profile:
- Name: ${user.name || 'User'}
- Age: ${user.age || 'Not specified'}
- Skin Type: ${user.skinType || 'Unknown'} (${skinTypeDesc[user.skinType] || 'Not specified'})
- Skin Condition: ${user.skinCondition || 'None specified'}
- Skin Cancer History: ${user.hasSkinCancerHistory ? 'Yes' : 'No'}
- Location: ${user.preferredLocation?.name || 'Unknown location'}

Today's Conditions:
- Temperature: ${weatherData.weather.temperature}°C
- Weather: ${weatherData.weather.condition || 'Unknown'}
- UV Index: ${weatherData.uv.index} (${weatherData.uv.level})
- Air Quality: ${weatherData.airQuality.aqi} (${weatherData.airQuality.aqiDescription.level})

You are warm, encouraging, and give clear, actionable advice. Always base suggestions on the user's personal risk factors and current conditions.`;

        const axiosResponse = await axios({
            method: 'POST',
            url: 'https://openrouter.ai/api/v1/chat/completions',
            data: {
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage || "Hello! Give me today's sun protection advice." }
                ],
                stream: true,
                temperature: 0.7,
                max_tokens: 800
            },
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': 'https://atmosguard.vercel.app',
                'X-Title': 'AtmosGuard',
                'Content-Type': 'application/json'
            },
            responseType: 'stream',
            timeout: 30000
        });

        // Pipe stream safely
        axiosResponse.data.pipe(res);

        // Handle stream end
        axiosResponse.data.on('end', () => {
            if (!res.writableEnded) {
                res.write('data: [DONE]\n\n');
                res.end();
            }
        });

        // Handle stream errors
        axiosResponse.data.on('error', (err) => {
            if (!res.writableEnded) {
                console.error('Stream error:', err);
                res.write('data: {"error": "Streaming failed. Please try again."}\n\n');
                res.end();
            }
        });

    } catch (error) {
        // Only write if response is still writable
        if (!res.writableEnded) {
            console.error('AI Advice Chat Error:', error.message);
            res.write('data: {"error": "Sorry, I\'m having trouble connecting. Please try again."}\n\n');
            res.end();
        }
    }
};

module.exports = { getAIAdviceChat };
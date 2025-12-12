const axios = require('axios');
const User = require('../models/User');

// Helper: Get UV Index (we'll use free API)
const getCurrentUV = async (lat, lon) => {
  try {
    const response = await axios.get(
      `https://currentuvindex.com/api/v1/uvi?latitude=${lat}&longitude=${lon}`
    );
    return Math.round(response.data.now.uvi);
  } catch (err) {
    return 6; // fallback safe value
  }
};

// Main AI Advice Route
const getPersonalizedAdvice = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.preferredLocation?.lat || !user.preferredLocation?.lon) {
      return res.status(400).json({
        success: false,
        message: "Please set your location first"
      });
    }

    const uvIndex = await getCurrentUV(
      user.preferredLocation.lat,
      user.preferredLocation.lon
    );

    // Determine risk level
    let riskLevel = "Moderate";
    if (uvIndex <= 2) riskLevel = "Low";
    else if (uvIndex <= 5) riskLevel = "Moderate";
    else if (uvIndex <= 7) riskLevel = "High";
    else if (uvIndex <= 10) riskLevel = "Very High";
    else riskLevel = "Extreme";

    // Build detailed prompt for AI
    const prompt = `
You are a compassionate dermatologist assistant for AtmosGuard — an app that protects people with skin conditions and skin cancer history from harmful UV rays.

User Profile:
- Name: ${user.name}
- Skin Type (Fitzpatrick): ${user.skinType} ${user.skinType === 'I' || user.skinType === 'II' ? '(Burns easily, tans minimally)' : user.skinType === 'V' || user.skinType === 'VI' ? '(Rarely burns, deeply pigmented)' : '(Moderate burning/tanning)'}
- Skin Condition: ${user.skinCondition}
- History of Skin Cancer: ${user.hasSkinCancerHistory ? 'Yes' : 'No'}
- Current Location: ${user.preferredLocation.name || 'Unknown'}
- Current UV Index: ${uvIndex}/11 (${riskLevel})

Give a warm, caring, and highly personalized sun protection advice including:
1. Exact clothing recommendations (long sleeve, pants, hat type, UPF rating)
2. Accessories (sunglasses, gloves, neck gaiter, etc.)
3. Best times to avoid sun today
4. Additional tips (sunscreen SPF, reapplication, shade, etc.)
5. A short encouraging message

Respond in natural, empathetic paragraphs — like talking to a worried patient.
Do NOT use bullet points unless asked.
Keep total response under 280 words.
`;

    const response = await axios.post(
      `${process.env.OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: "openrouter/openchat-3.5-16k", // fast + smart + cheap
        messages: [
          { role: "system", content: "You are a caring dermatology AI assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 400
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://atmosguard.vercel.app", // Required by OpenRouter
          "X-Title": "AtmosGuard",
          "Content-Type": "application/json"
        }
      }
    );

    const aiAdvice = response.data.choices[0].message.content;

    res.json({
      success: true,
      data: {
        uvIndex,
        riskLevel,
        location: user.preferredLocation.name || "Your area",
        advice: aiAdvice,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error("AI Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "AI temporarily unavailable. Please try again."
    });
  }
};

module.exports = { getPersonalizedAdvice };
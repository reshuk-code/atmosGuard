class UVService {
    // Simulated UV data based on location and time (no API needed)
    getUVData(lat, lon) {
        const now = new Date();
        const hour = now.getHours();
        const month = now.getMonth();

        // Calculate UV index based on time of day and season
        let baseUV = 1; // Default low

        // Higher UV during midday (10am-4pm)
        if (hour >= 10 && hour <= 16) {
            baseUV = 4 + Math.random() * 6; // 4-10 UV index
        } else {
            baseUV = 1 + Math.random() * 3; // 1-4 UV index
        }

        // Adjust for season (higher in summer months)
        if (month >= 4 && month <= 9) { // April to September
            baseUV *= 1.5;
        }

        // Cap at 11 (max UV index)
        const uvIndex = Math.min(baseUV.toFixed(1), 11);

        // Determine risk level
        let riskLevel, color;
        if (uvIndex <= 2) {
            riskLevel = "Low"; color = "#10b981";
        } else if (uvIndex <= 5) {
            riskLevel = "Moderate"; color = "#f59e0b";
        } else if (uvIndex <= 7) {
            riskLevel = "High"; color = "#f97316";
        } else if (uvIndex <= 10) {
            riskLevel = "Very High"; color = "#ef4444";
        } else {
            riskLevel = "Extreme"; color = "#7f1d1d";
        }

        return {
            index: uvIndex,
            level: riskLevel,
            color: color,
            updatedAt: now
        };
    }

    // Main function: Get clothing recommendations based on UV and skin type
    getClothingRecommendations(uvData, userProfile) {
        const recommendations = {
            head: [],
            upperBody: [],
            lowerBody: [],
            accessories: [],
            sunscreen: [],
            timing: [],
            warnings: []
        };

        const uvIndex = parseFloat(uvData.index);
        const skinType = userProfile.skinType;
        const hasCancerHistory = userProfile.hasSkinCancerHistory;
        const age = userProfile.age;

        // HEAD PROTECTION
        if (uvIndex >= 3) {
            recommendations.head.push("Wide-brimmed hat (minimum 3-inch brim)");
            recommendations.head.push("Bucket hat with neck flap");
        } else {
            recommendations.head.push("Baseball cap or visor");
        }

        if (uvIndex >= 6) {
            recommendations.head.push("UV-protection umbrella");
        }

        // UPPER BODY (Based on skin type)
        if (skinType === 'I' || skinType === 'II') { // Very fair/fair
            if (uvIndex >= 3) {
                recommendations.upperBody.push("Long-sleeve UPF 50+ shirt");
                recommendations.upperBody.push("Rash guard or sun shirt");
            } else {
                recommendations.upperBody.push("Long-sleeve shirt (any fabric)");
            }
        } else if (skinType === 'III' || skinType === 'IV') { // Medium/olive
            if (uvIndex >= 5) {
                recommendations.upperBody.push("Long-sleeve UPF 30+ shirt");
                recommendations.upperBody.push("Lightweight linen shirt");
            } else {
                recommendations.upperBody.push("T-shirt (tight weave)");
            }
        } else { // Dark skin (V, VI)
            if (uvIndex >= 7) {
                recommendations.upperBody.push("Long-sleeve shirt recommended");
            } else {
                recommendations.upperBody.push("Any comfortable top");
            }
        }

        // LOWER BODY
        if (uvIndex >= 6) {
            recommendations.lowerBody.push("Long pants or maxi skirt");
            recommendations.lowerBody.push("Lightweight linen trousers");
        } else if (uvIndex >= 3) {
            recommendations.lowerBody.push("Capri pants or knee-length skirt");
        } else {
            recommendations.lowerBody.push("Shorts or short skirt are fine");
        }

        // ACCESSORIES
        if (uvIndex >= 3) {
            recommendations.accessories.push("UV-blocking sunglasses (100% UV protection)");
        }

        if (uvIndex >= 6) {
            recommendations.accessories.push("UV-protection gloves (for driving/outdoor work)");
            recommendations.accessories.push("Neck gaiter or buff");
        }

        // SUNSCREEN RECOMMENDATIONS (Based on skin type)
        if (skinType === 'I' || skinType === 'II') {
            recommendations.sunscreen.push("SPF 50+ mineral sunscreen (zinc oxide/titanium dioxide)");
            recommendations.sunscreen.push("Apply 30 minutes before going outside");
            recommendations.sunscreen.push("Reapply every 90 minutes");
        } else if (skinType === 'III' || skinType === 'IV') {
            recommendations.sunscreen.push("SPF 30-50 broad-spectrum sunscreen");
            recommendations.sunscreen.push("Apply 15 minutes before going outside");
            recommendations.sunscreen.push("Reapply every 2 hours");
        } else {
            recommendations.sunscreen.push("SPF 15-30 sunscreen for exposed areas");
            recommendations.sunscreen.push("Focus on face, neck, and hands");
            recommendations.sunscreen.push("Reapply every 2-3 hours");
        }

        // TIMING ADVICE
        if (uvIndex >= 6) {
            recommendations.timing.push("Avoid sun exposure between 10 AM - 4 PM");
            recommendations.timing.push("Plan outdoor activities before 10 AM or after 4 PM");
        } else if (uvIndex >= 3) {
            recommendations.timing.push("Limit midday sun (11 AM - 3 PM)");
            recommendations.timing.push("Take shade breaks every hour");
        } else {
            recommendations.timing.push("Safe to be outside at any time");
            recommendations.timing.push("Still wear sunscreen if outside >1 hour");
        }

        // SPECIAL WARNINGS
        if (hasCancerHistory) {
            recommendations.warnings.push("EXTRA PRECAUTION: You have skin cancer history");
            recommendations.warnings.push("Wear UPF 50+ clothing at all times");
            recommendations.warnings.push("Avoid direct sun between 10 AM - 4 PM");
            recommendations.warnings.push("Monthly skin self-exams recommended");
        }

        if (age && age < 18) {
            recommendations.warnings.push("Children's skin is more sensitive - maximum protection needed");
        }

        if (age && age > 60) {
            recommendations.warnings.push("Mature skin needs extra hydration - use moisturizing sunscreen");
        }

        return recommendations;
    }

    // Get AQI simulation (simple for now)
    getAQIData() {
        const aqi = Math.floor(Math.random() * 150) + 1;

        let level, color;
        if (aqi <= 50) {
            level = "Good"; color = "#10b981";
        } else if (aqi <= 100) {
            level = "Moderate"; color = "#f59e0b";
        } else if (aqi <= 150) {
            level = "Unhealthy for Sensitive"; color = "#f97316";
        } else if (aqi <= 200) {
            level = "Unhealthy"; color = "#ef4444";
        } else {
            level = "Very Unhealthy"; color = "#7f1d1d";
        }

        return {
            value: aqi,
            level: level,
            color: color
        };
    }
}

module.exports = new UVService();
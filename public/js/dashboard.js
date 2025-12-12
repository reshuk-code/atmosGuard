// Update public/js/dashboard.js
async function loadDashboardData() {
    try {
        showLoading(true);

        const response = await fetch('/api/dashboard', {
            method: 'GET',
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            updateDashboard(data.data);
        } else {
            console.error('Failed to load dashboard data:', data.message);
            showError('Failed to load dashboard data');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Network error. Please try again.');
    } finally {
        showLoading(false);
    }
}

function updateDashboard(data) {
    // Update UV Index
    const uvIndex = parseFloat(data.uv.index);
    document.getElementById('uvValue').textContent = data.uv.index;

    // Update UV risk level and color
    const uvLevel = data.uv.level.toLowerCase().replace(' ', '-');
    document.getElementById('riskLevel').innerHTML = `
        <span class="risk-badge ${uvLevel}">${data.uv.level}</span>
        <p>${data.uv.risk}</p>
    `;

    // Update UV circle color
    updateUVCircle(uvIndex, data.uv.color);

    // Update location
    document.getElementById('locationName').textContent = data.location;

    // Update weather data
    if (data.weather) {
        document.getElementById('temperature').textContent = `${data.weather.temperature}°C`;
        document.getElementById('humidity').textContent = `${data.weather.humidity}%`;
        document.getElementById('windSpeed').textContent = `${data.weather.windSpeed} km/h`;
    }

    // Update UV protection tips
    const tipsList = document.getElementById('protectionTipsList');
    tipsList.innerHTML = '';
    if (data.uv.protectionAdvice && data.uv.protectionAdvice.length > 0) {
        data.uv.protectionAdvice.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsList.appendChild(li);
        });
    }

    // Update Air Quality
    if (data.airQuality) {
        const aqi = data.airQuality.aqi;
        const aqiDesc = data.airQuality.aqiDescription;

        document.getElementById('aqiValue').textContent = aqi;
        document.getElementById('aqiLevel').textContent = aqiDesc.level;
        document.getElementById('aqiDescription').textContent = aqiDesc.description;

        // Update AQI circle color
        updateAQICircle(aqi, aqiDesc.color);

        // Update AQI components
        if (data.airQuality.components) {
            const comp = data.airQuality.components;
            document.getElementById('pm25').textContent = `${comp.pm2_5 || '--'} μg/m³`;
            document.getElementById('pm10').textContent = `${comp.pm10 || '--'} μg/m³`;
            document.getElementById('o3').textContent = `${comp.o3 || '--'} μg/m³`;
        }
    }

    // Update daily tips
    const dailyTipsDiv = document.getElementById('dailyTip');
    if (data.dailyTips && data.dailyTips.length > 0) {
        dailyTipsDiv.innerHTML = `
            <h4><i class="fas fa-lightbulb"></i> Personalized Tips</h4>
            <ul>
                ${data.dailyTips.map(tip => `<li>${tip}</li>`).join('')}
            </ul>
        `;
    }

    // Update profile info (including age)
    document.getElementById('profileSkinType').textContent = data.user.skinType || 'Not set';
    document.getElementById('profileSkinCondition').textContent =
        formatSkinCondition(data.user.skinCondition) || 'Not set';
    document.getElementById('profileAge').textContent =
        data.user.age ? `${data.user.age} years` : 'Not set';
    document.getElementById('profileCancerHistory').textContent =
        data.user.hasSkinCancerHistory ? 'Yes' : 'No';
    document.getElementById('profileLocation').textContent = data.location || 'Not set';

    // Update stats
    document.getElementById('daysProtected').textContent = data.stats.daysProtected;
    document.getElementById('adviceReceived').textContent = data.stats.adviceReceived;
    document.getElementById('uvAlerts').textContent = data.stats.uvAlerts;
    document.getElementById('aqiAlerts').textContent = data.stats.aqiAlerts || 0;

    // Update activities
    updateActivities(data.recentActivities);

    // Update greeting with time
    setGreeting();
}

function updateUVCircle(uvIndex, color) {
    const uvCircle = document.querySelector('.uv-circle');
    uvCircle.style.background = `linear-gradient(135deg, ${color} 0%, ${lightenColor(color, 20)} 100%)`;
}

function updateAQICircle(aqi, color) {
    const aqiCircle = document.querySelector('.aqi-circle');
    aqiCircle.style.background = `linear-gradient(135deg, ${color} 0%, ${lightenColor(color, 20)} 100%)`;
}

function lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return `#${(
        0x1000000 +
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)
    )
        .toString(16)
        .slice(1)}`;
}

function showLoading(show) {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

function showError(message) {
    // Create or show error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
    `;

    const container = document.querySelector('.dashboard-container');
    if (container) {
        container.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// Auto-refresh every 10 minutes for real-time data
setInterval(loadDashboardData, 10 * 60 * 1000);
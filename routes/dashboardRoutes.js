// backend/routes/dashboardRoutes.js
const express = require('express');
const {
    getDashboardData,
    refreshAIRecommendations,
    completeOnboarding,   // ← Comment out until implemented
    // updateProfile
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getDashboardData);
router.post('/complete-onboarding', protect, completeOnboarding);  // ← Comment
// router.put('/profile', protect, updateProfile);                     // ← Comment
router.post('/refresh-recommendations', protect, refreshAIRecommendations);

module.exports = router;
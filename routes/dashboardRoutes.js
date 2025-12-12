// backend/routes/dashboardRoutes.js
const express = require('express');
const {
    getDashboardData,
    completeOnboarding,
    updateProfile
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, getDashboardData);
router.post('/complete-onboarding', protect, completeOnboarding);
router.put('/profile', protect, updateProfile);

module.exports = router;
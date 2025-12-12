// backend/routes/adviceAiRoutes.js

const express = require('express');
const { protect } = require('../middleware/auth');
const { getAIAdviceChat } = require('../controllers/adviceAiController');

const router = express.Router();

// POST /api/ai/advice/chat
router.post('/chat', protect, getAIAdviceChat);

module.exports = router;
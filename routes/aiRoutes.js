const express = require('express');
const { getPersonalizedAdvice } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/advice',  getPersonalizedAdvice);

module.exports = router;
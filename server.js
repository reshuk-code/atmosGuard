const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { protect } = require('./middleware/auth');
const User = require('./models/User');  // ← ADD THIS LINE HERE

const app = express();

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://atmosguard.vercel.app'
        : 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Public Routes
app.get('/', async (req, res) => {
    try {
        const token = req.cookies.jwt;

        if (token) {
            // Check if user is logged in via cookie
            const jwt = require('jsonwebtoken');
            const User = require('./models/User');

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);

                if (user) {
                    // User is logged in, redirect to dashboard
                    return res.redirect('/dashboard');
                }
            } catch (error) {
                // Invalid token, show landing page
                console.log('Invalid token, showing landing page');
            }
        }

        // Show landing page for non-logged in users
        res.render('index', {
            title: 'AtmosGuard - Protect Your Skin',
            description: 'Personalized UV protection for sensitive skin conditions and skin cancer prevention',
            features: [
                'AI-powered sun safety advice',
                'Personalized for your skin type',
                'Real-time UV monitoring',
                'Dermatologist-approved recommendations'
            ]
        });
    } catch (error) {
        console.error('Home route error:', error);
        res.render('index', {
            title: 'AtmosGuard - Protect Your Skin',
            description: 'Personalized UV protection for sensitive skin conditions and skin cancer prevention'
        });
    }
});

// Landing page for app
app.get('/app', (req, res) => {
    res.render('app-landing', {
        title: 'AtmosGuard App',
        appStoreLink: '#',
        playStoreLink: '#'
    });
});

// Privacy policy
app.get('/privacy', (req, res) => {
    res.render('privacy', {
        title: 'Privacy Policy - AtmosGuard'
    });
});

// Terms of service
app.get('/terms', (req, res) => {
    res.render('terms', {
        title: 'Terms of Service - AtmosGuard'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});
// Login page
app.get('/login', (req, res) => {
    // Check if user is already logged in
    const token = req.cookies.jwt;
    if (token) {
        return res.redirect('/dashboard');
    }
    res.render('login', {
        title: 'Login - AtmosGuard'
    });
});

// Signup page
app.get('/signup', (req, res) => {
    // Check if user is already logged in
    const token = req.cookies.jwt;
    if (token) {
        return res.redirect('/dashboard');
    }
    res.render('signup', {
        title: 'Sign Up - AtmosGuard'
    });
});

// Dashboard (placeholder - you'll create this later)
app.get('/dashboard', async (req, res) => {
    try {
        // Check if user is logged in via cookie
        const token = req.cookies.jwt;

        if (!token) {
            return res.redirect('/login');
        }

        // Verify token and get user
        const jwt = require('jsonwebtoken');
        const User = require('./models/User');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            // Clear invalid token
            res.cookie('jwt', '', { expires: new Date(0) });
            return res.redirect('/login');
        }

        // If first login and onboarding not completed, redirect to onboarding
        if (!user.onboardingCompleted) {
            return res.redirect('/onboarding');
        }

        // Otherwise, show dashboard
        res.render('dashboard', {
            title: 'Dashboard - AtmosGuard',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                skinType: user.skinType,
                skinCondition: user.skinCondition,
                hasSkinCancerHistory: user.hasSkinCancerHistory,
                preferredLocation: user.preferredLocation,
                onboardingCompleted: user.onboardingCompleted
            }
        });

    } catch (error) {
        console.error('Dashboard route error:', error);
        // Clear invalid token
        res.cookie('jwt', '', { expires: new Date(0) });
        res.redirect('/login');
    }
});
app.get('/profile', async (req, res) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.redirect('/login');
        }

        const jwt = require('jsonwebtoken');
        const User = require('./models/User');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            res.cookie('jwt', '', { expires: new Date(0) });
            return res.redirect('/login');
        }

        res.render('profile', {
            title: 'Profile - AtmosGuard',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                skinType: user.skinType,
                skinCondition: user.skinCondition,
                hasSkinCancerHistory: user.hasSkinCancerHistory,
                preferredLocation: user.preferredLocation,
                onboardingCompleted: user.onboardingCompleted
            }
        });

    } catch (error) {
        console.error('Profile route error:', error);
        res.cookie('jwt', '', { expires: new Date(0) });
        res.redirect('/login');
    }
});
// Onboarding (placeholder)
app.get('/onboarding', async (req, res) => {
    try {
        const token = req.cookies.jwt;

        if (!token) {
            return res.redirect('/login');
        }

        const jwt = require('jsonwebtoken');
        const User = require('./models/User');

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            res.cookie('jwt', '', { expires: new Date(0) });
            return res.redirect('/login');
        }

        // If onboarding already completed, redirect to dashboard
        if (user.onboardingCompleted) {
            return res.redirect('/dashboard');
        }

        res.render('onboarding', {
            title: 'Complete Your Profile - AtmosGuard',
            user: {
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Onboarding route error:', error);
        res.cookie('jwt', '', { expires: new Date(0) });
        res.redirect('/login');
    }
});
app.use('/api/ai/advice', require('./routes/adviceAiRoutes'));
// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });
app.get('/ai-advice', protect, async (req, res) => {
    try {
        // Fetch user data to pass to EJS (so AI can greet by name, show profile info)
        const user = await User.findById(req.user.id).select('name skinType age skinCondition hasSkinCancerHistory preferredLocation');

        if (!user) {
            return res.redirect('/login');
        }

        res.render('ai-advice', {
            user: user.toObject(), // Convert to plain object for EJS
            pageTitle: 'AI Advice - AtmosGuard'
        });
    } catch (error) {
        console.error('Error loading AI Advice page:', error);
        res.status(500).send('Server Error');
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Public site: http://localhost:${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
});
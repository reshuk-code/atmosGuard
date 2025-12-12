// backend/public/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            if (this.getAttribute('href') === '#') return;

            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                navbar.style.backdropFilter = 'blur(10px)';
            } else {
                navbar.style.backgroundColor = 'white';
                navbar.style.backdropFilter = 'none';
            }
        });
    }

    // Check auth status and update navbar
    checkAuthStatus();
});

// Check if user is logged in and update navbar
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include' // Important for sending cookies
        });

        const data = await response.json();
        const navLinks = document.querySelector('.nav-links');

        if (navLinks) {
            if (data.success && data.user) {
                // User is logged in
                navLinks.innerHTML = `
                    <a href="/">Home</a>
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How it Works</a>
                    <a href="/dashboard" class="btn-outline">Dashboard</a>
                    <div class="user-dropdown">
                        <button class="user-menu-btn">
                            <i class="fas fa-user-circle"></i>
                            <span>${data.user.name}</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="/dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                            <a href="/profile"><i class="fas fa-user"></i> Profile</a>
                            <a href="/advice"><i class="fas fa-sun"></i> Get Advice</a>
                            <div class="dropdown-divider"></div>
                            <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a>
                        </div>
                    </div>
                `;

                // Add dropdown toggle functionality
                setupUserDropdown();
                setupLogoutHandler();

                // Update CTA buttons
                updateCTAButtons(true, data.user.name);
            } else {
                // User is not logged in
                navLinks.innerHTML = `
                    <a href="/">Home</a>
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How it Works</a>
                    <a href="/app" class="btn-outline">Try Demo</a>
                    <a href="/login" class="btn-primary">Sign In</a>
                `;

                // Update CTA buttons
                updateCTAButtons(false);
            }
        }
    } catch (error) {
        console.log('Not logged in or error checking auth status:', error);
        // If error, assume not logged in
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="/">Home</a>
                <a href="#features">Features</a>
                <a href="#how-it-works">How it Works</a>
                <a href="/app" class="btn-outline">Try Demo</a>
                <a href="/login" class="btn-primary">Sign In</a>
            `;
            updateCTAButtons(false);
        }
    }
}

// Update CTA buttons based on auth status
function updateCTAButtons(isLoggedIn, userName = '') {
    const ctaSection = document.querySelector('.cta');
    if (ctaSection) {
        if (isLoggedIn) {
            ctaSection.innerHTML = `
                <div class="container">
                    <h2>Welcome back, ${userName}!</h2>
                    <p>Ready to check today's UV protection advice?</p>
                    <a href="/advice" class="btn-primary btn-large">
                        <i class="fas fa-sun"></i> Get Today's Advice
                    </a>
                    <div style="margin-top: 1rem;">
                        <a href="/dashboard" class="btn-outline">
                            <i class="fas fa-tachometer-alt"></i> Go to Dashboard
                        </a>
                    </div>
                </div>
            `;
        } else {
            ctaSection.innerHTML = `
                <div class="container">
                    <h2>Start Protecting Your Skin Today</h2>
                    <p>Join thousands of users who trust AtmosGuard for personalized sun protection.</p>
                    <a href="/signup" class="btn-primary btn-large">
                        <i class="fas fa-user-plus"></i> Sign Up Free
                    </a>
                    <div style="margin-top: 1rem;">
                        <a href="/login" class="btn-outline">
                            Already have an account? Sign In
                        </a>
                    </div>
                </div>
            `;
        }
    }
}

// Setup user dropdown functionality
function setupUserDropdown() {
    const userMenuBtn = document.querySelector('.user-menu-btn');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (userMenuBtn && dropdownMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });

        // Close dropdown when clicking a link
        dropdownMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                dropdownMenu.classList.remove('show');
            });
        });
    }
}

// Setup logout handler
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                const data = await response.json();
                if (data.success) {
                    // Clear any stored user data
                    localStorage.removeItem('user');

                    // Redirect to home page
                    window.location.href = '/';
                } else {
                    console.error('Logout failed:', data.message);
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

// Add this CSS for the dropdown (add to your style.css)
function addDropdownStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .user-dropdown {
            position: relative;
            display: inline-block;
        }
        
        .user-menu-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: none;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            color: #374151;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .user-menu-btn:hover {
            border-color: #d1d5db;
            background: #f9fafb;
        }
        
        .user-menu-btn i:first-child {
            font-size: 1.25rem;
            color: #4f46e5;
        }
        
        .user-menu-btn i:last-child {
            font-size: 0.75rem;
            margin-left: 4px;
        }
        
        .dropdown-menu {
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 0.5rem 0;
            min-width: 200px;
            z-index: 1000;
            display: none;
            margin-top: 0.5rem;
        }
        
        .dropdown-menu.show {
            display: block;
        }
        
        .dropdown-menu a {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0.75rem 1rem;
            color: #374151;
            text-decoration: none;
            transition: background 0.3s;
        }
        
        .dropdown-menu a:hover {
            background: #f9fafb;
            color: #4f46e5;
        }
        
        .dropdown-menu a i {
            width: 16px;
            text-align: center;
        }
        
        .dropdown-divider {
            height: 1px;
            background: #e5e7eb;
            margin: 0.5rem 0;
        }
        
        #logoutBtn {
            color: #ef4444;
        }
        
        #logoutBtn:hover {
            background: #fef2f2;
        }
        
        @media (max-width: 768px) {
            .user-menu-btn span {
                display: none;
            }
            
            .dropdown-menu {
                right: -50px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize dropdown styles
addDropdownStyles();

// Update the checkAuthStatus function in main.js
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'include'
        });

        const data = await response.json();
        const navLinks = document.querySelector('.nav-links');

        if (navLinks) {
            if (data.success && data.user) {
                // User is logged in
                navLinks.innerHTML = `
                    <a href="/">Home</a>
                    <a href="/dashboard" class="btn-outline">Dashboard</a>
                    <div class="user-dropdown">
                        <button class="user-menu-btn">
                            <i class="fas fa-user-circle"></i>
                            <span>${data.user.name}</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="/dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                            <a href="/profile"><i class="fas fa-user"></i> Profile</a>
                            <div class="dropdown-divider"></div>
                            <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a>
                        </div>
                    </div>
                `;

                setupUserDropdown();
                setupLogoutHandler();

                // Only update CTA if we're on home page
                if (window.location.pathname === '/') {
                    updateCTAButtons(true, data.user.name);
                }
            } else {
                // User is not logged in
                navLinks.innerHTML = `
                    <a href="/">Home</a>
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How it Works</a>
                    <a href="/app" class="btn-outline">Try Demo</a>
                    <a href="/login" class="btn-primary">Sign In</a>
                `;

                if (window.location.pathname === '/') {
                    updateCTAButtons(false);
                }
            }
        }
    } catch (error) {
        console.log('Not logged in or error checking auth status');
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="/">Home</a>
                <a href="#features">Features</a>
                <a href="#how-it-works">How it Works</a>
                <a href="/app" class="btn-outline">Try Demo</a>
                <a href="/login" class="btn-primary">Sign In</a>
            `;
            if (window.location.pathname === '/') {
                updateCTAButtons(false);
            }
        }
    }
}
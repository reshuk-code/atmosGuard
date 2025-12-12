// Toggle password visibility
document.addEventListener('DOMContentLoaded', function() {
    // Password toggle functionality
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    }

    // Password strength checker
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);

        // Confirm password match
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', checkPasswordMatch);
        }
    }

    // Form submissions
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Demo account auto-fill
    const demoLogin = document.querySelector('.demo-info');
    if (demoLogin && loginForm) {
        demoLogin.addEventListener('click', function(e) {
            if (e.target.tagName === 'P') {
                document.getElementById('email').value = 'demo@atmosguard.com';
                document.getElementById('password').value = 'demo123';
            }
        });
    }
});

// Password strength checker
function checkPasswordStrength() {
    const password = this.value;
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');

    // Requirements
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    // Update requirement indicators
    updateRequirement('reqLength', hasLength);
    updateRequirement('reqUppercase', hasUppercase);
    updateRequirement('reqLowercase', hasLowercase);
    updateRequirement('reqNumber', hasNumber);

    // Calculate strength
    let strength = 0;
    if (hasLength) strength++;
    if (hasUppercase) strength++;
    if (hasLowercase) strength++;
    if (hasNumber) strength++;

    // Update strength bar and text
    const percentage = (strength / 4) * 100;
    strengthBar.style.width = percentage + '%';

    if (strength === 0) {
        strengthBar.style.background = '#ef4444';
        strengthText.textContent = 'Password strength: Very Weak';
    } else if (strength === 1) {
        strengthBar.style.background = '#f97316';
        strengthText.textContent = 'Password strength: Weak';
    } else if (strength === 2) {
        strengthBar.style.background = '#eab308';
        strengthText.textContent = 'Password strength: Fair';
    } else if (strength === 3) {
        strengthBar.style.background = '#22c55e';
        strengthText.textContent = 'Password strength: Good';
    } else {
        strengthBar.style.background = '#10b981';
        strengthText.textContent = 'Password strength: Strong';
    }
}

function updateRequirement(elementId, isValid) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.toggle('valid', isValid);
        element.querySelector('i').className = isValid ? 'fas fa-check-circle' : 'fas fa-circle';
    }
}

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = this.value;
    const errorElement = document.getElementById('passwordMatchError');

    if (confirmPassword && password !== confirmPassword) {
        errorElement.style.display = 'flex';
        this.classList.add('error');
    } else {
        errorElement.style.display = 'none';
        this.classList.remove('error');
    }
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Login handler
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Basic validation
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    showModal('loadingModal');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include' // Important for cookies
        });

        const data = await response.json();

        if (data.success) {
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to dashboard or home
            setTimeout(() => {
                window.location.href = data.user.onboardingCompleted ? '/dashboard' : '/onboarding';
            }, 1000);
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    } finally {
        closeModal('loadingModal');
    }
}

// Signup handler
async function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.getElementById('terms').checked;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showError('Please fill in all fields');
        return;
    }

    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }

    if (!terms) {
        showError('Please agree to the terms and conditions');
        return;
    }

    // Password strength check
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    if (!(hasLength && hasUppercase && hasLowercase && hasNumber)) {
        showError('Please create a stronger password');
        return;
    }

    showModal('loadingModal');

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password }),
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));

            // Show success modal
            showModal('successModal');

            // Redirect to onboarding
            setTimeout(() => {
                window.location.href = '/onboarding';
            }, 2000);
        } else {
            showError(data.message || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showError('Network error. Please try again.');
    } finally {
        closeModal('loadingModal');
    }
}

// Error display
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
    }
    showModal('errorModal');
}

// Social login handlers
document.querySelectorAll('.social-btn.google').forEach(btn => {
    btn.addEventListener('click', () => {
        alert('Google login will be implemented soon!');
    });
});

document.querySelectorAll('.social-btn.github').forEach(btn => {
    btn.addEventListener('click', () => {
        alert('GitHub login will be implemented soon!');
    });
});
// Onboarding Wizard
class OnboardingWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.formData = {
            skinType: '',
            skinCondition: '',
            hasSkinCancerHistory: false,
            location: null
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateStep();
        this.setupLocationSearch();
    }

    setupEventListeners() {
        // Navigation buttons
        document.getElementById('nextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('prevBtn').addEventListener('click', () => this.prevStep());
        document.getElementById('submitBtn').addEventListener('click', (e) => this.submitForm(e));

        // Skin type selection
        document.querySelectorAll('input[name="skinType"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.formData.skinType = e.target.value;
            });
        });

        // Skin condition selection
        document.querySelectorAll('input[name="skinCondition"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.formData.skinCondition = e.target.value;
                this.toggleCancerHistorySection();
            });
        });

        // Cancer history selection
        document.querySelectorAll('input[name="hasSkinCancerHistory"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.formData.hasSkinCancerHistory = e.target.value === 'true';
            });
        });

        // Use current location button
        document.getElementById('useCurrentLocation').addEventListener('click', () => this.getCurrentLocation());
    }

    setupLocationSearch() {
        const locationInput = document.getElementById('locationSearch');
        const suggestionsDiv = document.getElementById('locationSuggestions');

        let debounceTimer;
        locationInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.searchLocation(e.target.value);
            }, 500);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!locationInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                suggestionsDiv.style.display = 'none';
            }
        });
    }

    async searchLocation(query) {
        if (!query || query.length < 3) return;

        const suggestionsDiv = document.getElementById('locationSuggestions');
        suggestionsDiv.innerHTML = '<div class="location-suggestion">Searching...</div>';
        suggestionsDiv.style.display = 'block';

        try {
            // Using OpenStreetMap Nominatim API (free, no API key required)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
            );

            const locations = await response.json();

            if (locations.length === 0) {
                suggestionsDiv.innerHTML = '<div class="location-suggestion">No locations found</div>';
                return;
            }

            suggestionsDiv.innerHTML = '';
            locations.forEach(location => {
                const div = document.createElement('div');
                div.className = 'location-suggestion';
                div.innerHTML = `
                    <strong>${location.display_name.split(',')[0]}</strong>
                    <small>${location.display_name.split(',').slice(1, 3).join(',')}</small>
                `;
                div.addEventListener('click', () => this.selectLocation({
                    name: location.display_name,
                    lat: parseFloat(location.lat),
                    lon: parseFloat(location.lon)
                }));
                suggestionsDiv.appendChild(div);
            });

        } catch (error) {
            console.error('Location search error:', error);
            suggestionsDiv.innerHTML = '<div class="location-suggestion">Error searching locations</div>';
        }
    }

    selectLocation(location) {
        this.formData.location = location;

        // Update UI
        const locationInput = document.getElementById('locationSearch');
        const suggestionsDiv = document.getElementById('locationSuggestions');
        const selectedDiv = document.getElementById('selectedLocation');

        locationInput.value = location.name;
        suggestionsDiv.style.display = 'none';

        document.getElementById('locationName').textContent = location.name;
        document.getElementById('locationCoords').textContent =
            `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
        selectedDiv.style.display = 'block';
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        const btn = document.getElementById('useCurrentLocation');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting location...';
        btn.disabled = true;

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            // Reverse geocode to get location name
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );

            const location = await response.json();

            this.selectLocation({
                name: location.display_name,
                lat: position.coords.latitude,
                lon: position.coords.longitude
            });

        } catch (error) {
            console.error('Geolocation error:', error);
            alert('Unable to get your location. Please enter it manually.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    toggleCancerHistorySection() {
        const cancerSection = document.getElementById('cancerHistorySection');
        const skinCancerRadio = document.querySelector('input[name="skinCondition"][value="skin_cancer"]');

        if (skinCancerRadio && skinCancerRadio.checked) {
            cancerSection.style.display = 'block';
        } else {
            cancerSection.style.display = 'none';
            this.formData.hasSkinCancerHistory = false;
            document.querySelectorAll('input[name="hasSkinCancerHistory"]').forEach(input => {
                input.checked = false;
            });
        }
    }

    nextStep() {
        if (!this.validateCurrentStep()) return;

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStep();

            // Update summary on last step
            if (this.currentStep === this.totalSteps) {
                this.updateSummary();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
        }
    }

    validateCurrentStep() {
        switch (this.currentStep) {
            case 1: // Skin Type
                if (!this.formData.skinType) {
                    alert('Please select your skin type');
                    return false;
                }
                break;

            case 2: // Skin Condition
                if (!this.formData.skinCondition) {
                    alert('Please select your skin condition');
                    return false;
                }
                if (this.formData.skinCondition === 'skin_cancer' &&
                    this.formData.hasSkinCancerHistory === null) {
                    alert('Please indicate if you have had skin cancer before');
                    return false;
                }
                break;

            case 3: // Location
                if (!this.formData.location) {
                    alert('Please select your location');
                    return false;
                }
                break;
        }
        return true;
    }

    updateStep() {
        // Hide all steps
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show current step
        document.getElementById(`step${this.currentStep}`).classList.add('active');

        // Update progress steps
        document.querySelectorAll('.step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');

            if (stepNumber === this.currentStep) {
                step.classList.add('active');
            } else if (stepNumber < this.currentStep) {
                step.classList.add('completed');
            }
        });

        // Update navigation buttons
        document.getElementById('prevBtn').style.display = this.currentStep > 1 ? 'flex' : 'none';
        document.getElementById('nextBtn').style.display = this.currentStep < this.totalSteps ? 'flex' : 'none';
        document.getElementById('submitBtn').style.display = this.currentStep === this.totalSteps ? 'flex' : 'none';
    }

    updateSummary() {
        // Format skin type
        const skinTypeLabels = {
            'I': 'Type I (Very fair)',
            'II': 'Type II (Fair)',
            'III': 'Type III (Medium)',
            'IV': 'Type IV (Olive)',
            'V': 'Type V (Brown)',
            'VI': 'Type VI (Dark)'
        };

        // Format skin condition
        const conditionLabels = {
            'normal': 'Normal Skin',
            'eczema': 'Eczema',
            'psoriasis': 'Psoriasis',
            'vitiligo': 'Vitiligo',
            'skin_cancer': 'Skin Cancer',
            'lupus': 'Lupus'
        };

        // Update summary display
        document.getElementById('summarySkinType').textContent =
            skinTypeLabels[this.formData.skinType] || 'Not selected';

        document.getElementById('summarySkinCondition').textContent =
            conditionLabels[this.formData.skinCondition] || 'Not selected';

        document.getElementById('summaryCancerHistory').textContent =
            this.formData.hasSkinCancerHistory ? 'Yes' : 'No';

        document.getElementById('summaryLocation').textContent =
            this.formData.location ? this.formData.location.name.split(',')[0] : 'Not selected';
    }

    async submitForm(e) {
        e.preventDefault();

        if (!this.validateCurrentStep()) return;

        const loadingModal = document.getElementById('loadingModal');
        loadingModal.style.display = 'flex';

        try {
            const response = await fetch('/api/dashboard/complete-onboarding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    skinType: this.formData.skinType,
                    skinCondition: this.formData.skinCondition,
                    hasSkinCancerHistory: this.formData.hasSkinCancerHistory,
                    location: this.formData.location
                })
            });

            const data = await response.json();

            if (data.success) {
                // Store user data
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect to dashboard after short delay
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                alert(`Error: ${data.message}`);
                loadingModal.style.display = 'none';
            }

        } catch (error) {
            console.error('Onboarding submission error:', error);
            alert('An error occurred. Please try again.');
            loadingModal.style.display = 'none';
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OnboardingWizard();
});
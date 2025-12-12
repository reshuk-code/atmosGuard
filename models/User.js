// backend/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    age: {
        type: Number,
        min: 1,
        max: 120
    },
    skinType: {
        type: String,
        enum: ['I', 'II', 'III', 'IV', 'V', 'VI', ''],
        default: ''
    },
    skinCondition: {
        type: String,
        enum: ['normal', 'eczema', 'psoriasis', 'vitiligo', 'skin_cancer', 'lupus', 'other', ''],
        default: ''
    },
    hasSkinCancerHistory: {
        type: Boolean,
        default: false
    },
    preferredLocation: {
        name: String,
        lat: Number,
        lon: Number
    },
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);
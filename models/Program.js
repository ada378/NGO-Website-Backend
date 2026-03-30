const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String },
    category: { type: String, enum: ['Education', 'Healthcare', 'Women Empowerment', 'Environment'], required: true },
    impactStats: {
        livesImpacted: { type: Number, default: 0 },
        projectsCompleted: { type: Number, default: 0 },
        volunteers: { type: Number, default: 0 }
    },
    goals: {
        target: { type: Number },
        raised: { type: Number }
    },
    images: [{ type: String }],
    features: [{ type: String }],
    status: { type: String, enum: ['active', 'completed', 'upcoming'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Program', programSchema);

const mongoose = require('mongoose');

const transparencySchema = new mongoose.Schema({
    quarter: { type: String, required: true },
    year: { type: Number, required: true },
    totalReceived: { type: Number, default: 0 },
    allocation: {
        education: { type: Number, default: 0 },
        healthcare: { type: Number, default: 0 },
        womenEmpowerment: { type: Number, default: 0 },
        environment: { type: Number, default: 0 },
        admin: { type: Number, default: 0 }
    },
    projects: [{
        name: String,
        amount: Number,
        status: { type: String, enum: ['completed', 'ongoing', 'planned'] }
    }],
    auditReport: { type: String },
    annualReport: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transparency', transparencySchema);

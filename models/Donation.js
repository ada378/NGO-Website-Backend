const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    amountInWords: { type: String },
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String, enum: ['UPI', 'Card', 'Net Banking', 'Wallet'], required: true },
    transactionId: { type: String },
    razorpayPaymentId: { type: String },
    campaign: { type: String, default: 'General Fund' },
    program: { type: String, enum: ['Education', 'Healthcare', 'Women Empowerment', 'Environment', 'General'], default: 'General' },
    recurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ['monthly', 'quarterly', 'yearly'] },
    anonymous: { type: Boolean, default: false },
    message: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    certificateGenerated: { type: Boolean, default: false },
    receiptGenerated: { type: Boolean, default: false },
    certificateId: { type: String },
    receiptNumber: { type: String },
    receiptUrl: { type: String },
    certificateUrl: { type: String },
    taxExempt80G: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

donationSchema.pre('save', async function(next) {
    if (this.status === 'completed' && !this.receiptNumber) {
        const count = await mongoose.model('Donation').countDocuments();
        this.receiptNumber = `HF${String(count + 1).padStart(8, '0')}`;
    }
    if (this.status === 'completed' && !this.certificateId) {
        const uniqueId = `CERT${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        this.certificateId = uniqueId;
    }
    next();
});

module.exports = mongoose.model('Donation', donationSchema);

const Razorpay = require('razorpay');
const Donation = require('../models/Donation');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'demo_secret'
});

exports.createOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt, notes } = req.body;

        if (!amount || amount < 100) {
            return res.status(400).json({ error: 'Minimum donation amount is ₹100' });
        }

        const options = {
            amount: amount * 100,
            currency,
            receipt: receipt || `donation_${Date.now()}`,
            notes: notes || {}
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt
        });
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
};

exports.verifySignature = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const crypto = require('crypto');
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'demo_secret')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            res.json({ success: true, message: 'Payment verified' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid signature' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
};

exports.getKey = async (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo' });
};

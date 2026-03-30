const jwt = require('jsonwebtoken');
const Donation = require('../models/Donation');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'hope_foundation_secret_key_2024';

const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
};

const getAuthUser = async (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return await User.findById(decoded.userId);
    } catch {
        return null;
    }
};

exports.createDonation = async (req, res) => {
    try {
        const { donorName, donorEmail, amount, paymentMethod, campaign, program, recurring, frequency, message, anonymous } = req.body;
        
        const user = await getAuthUser(req);
        
        const donation = new Donation({
            donor: user?._id,
            donorName: anonymous ? 'Anonymous' : donorName,
            donorEmail,
            amount,
            amountInWords: numberToWords(amount),
            paymentMethod,
            campaign: campaign || 'General Fund',
            program: program || 'General',
            recurring,
            frequency,
            message,
            anonymous: anonymous || false,
            status: 'pending'
        });

        await donation.save();

        res.status(201).json({
            message: 'Donation initiated',
            donation: {
                id: donation._id,
                amount: donation.amount,
                status: donation.status
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { donationId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

        const donation = await Donation.findById(donationId);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        donation.status = 'completed';
        donation.razorpayPaymentId = razorpayPaymentId;
        donation.transactionId = razorpayPaymentId;
        donation.completedAt = new Date();
        donation.receiptNumber = `HF${String(Date.now()).slice(-8)}`;
        donation.certificateId = `CERT${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        await donation.save();

        res.json({
            message: 'Payment verified successfully',
            donation: {
                id: donation._id,
                status: donation.status,
                receiptNumber: donation.receiptNumber,
                certificateId: donation.certificateId
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDonations = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, program } = req.query;
        
        const query = {};
        if (status) query.status = status;
        if (program) query.program = program;

        const donations = await Donation.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('donor', 'name email');

        const total = await Donation.countDocuments(query);

        res.json({
            donations,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMyDonations = async (req, res) => {
    try {
        const user = await getAuthUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Please login to view your donations' });
        }

        const donations = await Donation.find({ donor: user._id })
            .sort({ createdAt: -1 });

        res.json({ donations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDonationById = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id).populate('donor', 'name email');
        
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        res.json({ donation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDonationStats = async (req, res) => {
    try {
        const totalDonations = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        const monthlyStats = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }},
            { $sort: { _id: -1 } },
            { $limit: 12 }
        ]);

        const programStats = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$program', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        res.json({
            totalDonations: totalDonations[0]?.total || 0,
            totalCount: totalDonations[0]?.count || 0,
            monthlyStats,
            programStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

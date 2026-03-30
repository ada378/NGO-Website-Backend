const Donation = require('../models/Donation');
const User = require('../models/User');
const Blog = require('../models/Blog');
const Program = require('../models/Program');

exports.getDashboardStats = async (req, res) => {
    try {
        const [
            totalDonations,
            monthlyDonations,
            totalDonors,
            recentDonations,
            programStats,
            blogStats,
            programCount
        ] = await Promise.all([
            Donation.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            Donation.aggregate([
                { $match: { status: 'completed', createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) } } },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            User.countDocuments({ role: 'user' }),
            Donation.find({ status: 'completed' }).sort({ createdAt: -1 }).limit(10),
            Donation.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: '$program', total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            Blog.countDocuments(),
            Program.countDocuments()
        ]);

        res.json({
            totalDonations: totalDonations[0]?.total || 0,
            donationCount: totalDonations[0]?.count || 0,
            monthlyDonations: monthlyDonations[0]?.total || 0,
            monthlyCount: monthlyDonations[0]?.count || 0,
            totalDonors,
            recentDonations,
            programStats,
            blogCount: blogStats,
            programCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllDonations = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        
        const query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { donorName: { $regex: search, $options: 'i' } },
                { donorEmail: { $regex: search, $options: 'i' } }
            ];
        }

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

exports.getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const users = await User.find({ role: 'user' })
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments({ role: 'user' });

        res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllPrograms = async (req, res) => {
    try {
        const programs = await Program.find().sort({ createdAt: -1 });
        res.json({ programs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.json({ blogs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

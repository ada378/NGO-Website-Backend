const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Donation = require('../models/Donation');
const Program = require('../models/Program');
const Blog = require('../models/Blog');
const Transparency = require('../models/Transparency');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'hope_foundation_secret_key_2024';

router.post('/create-admin', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            return res.json({ message: 'Admin already exists', email: existingAdmin.email });
        }

        const hashedPassword = await bcrypt.hash(password || 'admin123', 10);
        const admin = new User({
            name: 'Admin',
            email: email || 'admin@hopefoundation.org',
            password: hashedPassword,
            role: 'admin'
        });
        await admin.save();

        res.status(201).json({ message: 'Admin created', email: admin.email, password: password || 'admin123' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.user = user;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

router.get('/stats', adminAuth, async (req, res) => {
    try {
        const totalDonations = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        const monthlyDonations = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }},
            { $sort: { _id: -1 } },
            { $limit: 6 }
        ]);

        const programBreakdown = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$program', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        const recentDonations = await Donation.find({ status: 'completed' })
            .sort({ completedAt: -1 })
            .limit(10)
            .populate('donor', 'name email');

        const userCount = await User.countDocuments({ role: 'donor' });
        const programCount = await Program.countDocuments({ status: 'active' });
        const blogCount = await Blog.countDocuments({ published: true });

        res.json({
            totalDonations: totalDonations[0]?.total || 0,
            totalDonors: totalDonations[0]?.count || 0,
            monthlyDonations,
            programBreakdown,
            recentDonations,
            userCount,
            programCount,
            blogCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/donors', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const donors = await User.find({ role: 'donor' })
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments({ role: 'donor' });

        const donorsWithDonations = await Promise.all(
            donors.map(async (donor) => {
                const donations = await Donation.find({ donor: donor._id, status: 'completed' });
                const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
                return {
                    ...donor.toObject(),
                    donationCount: donations.length,
                    totalAmount
                };
            })
        );

        res.json({
            donors: donorsWithDonations,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/donations', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, program } = req.query;
        
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
});

router.post('/transparency', adminAuth, async (req, res) => {
    try {
        const { quarter, year, totalReceived, allocation, projects } = req.body;
        
        const transparency = new Transparency({
            quarter,
            year,
            totalReceived,
            allocation,
            projects
        });

        await transparency.save();
        res.status(201).json({ message: 'Transparency data added', transparency });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/transparency', async (req, res) => {
    try {
        const data = await Transparency.find().sort({ year: -1, quarter: -1 });
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/users', adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, role } = req.query;
        
        const query = {};
        if (role) query.role = role;

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            users,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/users/:id', adminAuth, async (req, res) => {
    try {
        const { role, status } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role, status },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User updated', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/send-email', adminAuth, async (req, res) => {
    try {
        const { to, subject, message, type } = req.body;
        
        // Demo mode - in production, integrate with nodemailer
        console.log('Email would be sent:', { to, subject, message, type });
        
        res.json({ 
            message: 'Email notification sent (Demo mode)',
            email: { to, subject, type }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/broadcast', adminAuth, async (req, res) => {
    try {
        const { subject, message, target } = req.body;
        
        let users;
        if (target === 'all') {
            users = await User.find().select('email');
        } else if (target === 'donors') {
            users = await User.find({ role: 'donor' }).select('email');
        } else {
            users = await User.find({ role: 'admin' }).select('email');
        }
        
        console.log('Broadcast would be sent to:', users.length, 'users', { subject, target });
        
        res.json({ 
            message: `Broadcast sent to ${users.length} users (Demo mode)`,
            recipients: users.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/verify-donation/:id', adminAuth, async (req, res) => {
    try {
        const { status, notes } = req.body;
        
        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        if (status === 'completed') {
            donation.status = 'completed';
            donation.completedAt = new Date();
            donation.receiptNumber = `HF${String(Date.now()).slice(-8)}`;
            donation.certificateId = `CERT${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        } else if (status === 'rejected') {
            donation.status = 'rejected';
            donation.notes = notes;
        } else {
            donation.status = status;
        }
        
        await donation.save();

        res.json({ message: 'Donation verified', donation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/analytics', adminAuth, async (req, res) => {
    try {
        const totalDonations = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        const donationsByMonth = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }},
            { $sort: { _id: 1 } },
            { $limit: 12 }
        ]);

        const donationsByProgram = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$program', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        const donationsByPaymentMethod = await Donation.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        const recentDonors = await User.find({ role: 'donor' })
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(10);

        const userStats = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        res.json({
            totalDonations: totalDonations[0]?.total || 0,
            totalDonationsCount: totalDonations[0]?.count || 0,
            donationsByMonth,
            donationsByProgram,
            donationsByPaymentMethod,
            recentDonors,
            userStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/export/donations', adminAuth, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const query = { status: 'completed' };
        if (startDate || endDate) {
            query.completedAt = {};
            if (startDate) query.completedAt.$gte = new Date(startDate);
            if (endDate) query.completedAt.$lte = new Date(endDate);
        }

        const donations = await Donation.find(query)
            .sort({ completedAt: -1 })
            .populate('donor', 'name email phone');

        const csv = [
            ['Receipt No', 'Date', 'Donor Name', 'Email', 'Amount', 'Payment Method', 'Program', 'Transaction ID'].join(','),
            ...donations.map(d => [
                d.receiptNumber,
                d.completedAt?.toISOString().split('T')[0] || '',
                d.donorName,
                d.donorEmail,
                d.amount,
                d.paymentMethod,
                d.program,
                d.transactionId
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=donations_export.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/seed', async (req, res) => {
    try {
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                name: 'Admin',
                email: 'admin@hopefoundation.org',
                password: hashedPassword,
                role: 'admin'
            });
            await admin.save();
        }

        const existingProgram = await Program.countDocuments();
        if (existingProgram > 0) {
            return res.json({ message: 'Data already seeded', adminLogin: { email: 'admin@hopefoundation.org', password: 'admin123' } });
        }

        const programs = [
            {
                title: 'Education for All',
                slug: 'education-for-all',
                description: 'Providing quality education to underprivileged children across India. We believe every child deserves access to learning opportunities that can transform their future.',
                icon: 'book',
                category: 'Education',
                impactStats: { livesImpacted: 15000, projectsCompleted: 45, volunteers: 500 },
                goals: { target: 5000000, raised: 3200000 },
                features: ['Free schooling', 'Scholarship programs', 'Digital classrooms', 'Teacher training'],
                status: 'active',
                images: []
            },
            {
                title: 'Healthcare Mission',
                slug: 'healthcare-mission',
                description: 'Extending quality healthcare services to rural and underserved communities through mobile clinics, health camps, and preventive care programs.',
                icon: 'heart',
                category: 'Healthcare',
                impactStats: { livesImpacted: 25000, projectsCompleted: 60, volunteers: 350 },
                goals: { target: 8000000, raised: 5800000 },
                features: ['Mobile clinics', 'Health camps', 'Medicine distribution', 'Free surgeries'],
                status: 'active',
                images: []
            },
            {
                title: 'Women Empowerment',
                slug: 'women-empowerment',
                description: 'Empowering women through skill development, entrepreneurship support, and awareness programs to create self-reliant communities.',
                icon: 'users',
                category: 'Women Empowerment',
                impactStats: { livesImpacted: 8000, projectsCompleted: 30, volunteers: 200 },
                goals: { target: 3000000, raised: 2100000 },
                features: ['Skill training', 'Self-help groups', 'Microfinance', 'Legal awareness'],
                status: 'active',
                images: []
            },
            {
                title: 'Green Earth Initiative',
                slug: 'green-earth-initiative',
                description: 'Our environmental conservation program focusing on tree plantation, waste management, and creating sustainable ecosystems for future generations.',
                icon: 'leaf',
                category: 'Environment',
                impactStats: { livesImpacted: 50000, projectsCompleted: 25, volunteers: 1000 },
                goals: { target: 2000000, raised: 1500000 },
                features: ['Tree plantation', 'Waste management', 'Solar energy', 'Awareness campaigns'],
                status: 'active',
                images: []
            }
        ];

        await Program.insertMany(programs);

        const blogs = [
            {
                title: 'New School Building Inaugurated in Rural Maharashtra',
                slug: 'new-school-building-maharashtra',
                content: 'Hope Foundation inaugurated a state-of-the-art school building in rural Maharashtra, providing education to over 500 children from disadvantaged backgrounds. The facility includes 15 classrooms, a computer lab, library, and playground.',
                excerpt: 'A new chapter begins for 500 children with the inauguration of our modern school facility.',
                category: 'News',
                authorName: 'Hope Foundation Team',
                featured: true,
                published: true,
                publishedAt: new Date(),
                tags: ['education', 'school', 'inauguration'],
                images: [],
                views: 245
            },
            {
                title: 'Healthcare Camp Serves 2000+ Patients in Gujarat',
                slug: 'healthcare-camp-gujarat',
                content: 'Our medical team conducted a mega health camp in Gujarat, providing free consultations, medicines, and diagnostic services to over 2000 residents from remote villages. Specialist doctors from Mumbai joined the initiative.',
                excerpt: 'Our medical team brought healthcare to the doorstep of remote communities.',
                category: 'Impact Report',
                authorName: 'Dr. Priya Sharma',
                featured: true,
                published: true,
                publishedAt: new Date(),
                tags: ['healthcare', 'camp', 'medical'],
                images: [],
                views: 189
            },
            {
                title: 'Women Entrepreneurs Share Their Success Stories',
                slug: 'women-entrepreneurs-stories',
                content: 'Meet the inspiring women who transformed their lives through our skill development program. From running small businesses to employing others, these women are now change-makers in their communities.',
                excerpt: 'Stories of courage and determination from women who broke barriers.',
                category: 'Success Story',
                authorName: 'Anita Desai',
                featured: true,
                published: true,
                publishedAt: new Date(),
                tags: ['women', 'empowerment', 'success'],
                images: [],
                views: 312
            }
        ];

        await Blog.insertMany(blogs);

        const transparency = new Transparency({
            quarter: 'Q4',
            year: 2024,
            totalReceived: 12500000,
            allocation: {
                education: 6250000,
                healthcare: 3750000,
                womenEmpowerment: 1250000,
                environment: 750000,
                admin: 500000
            },
            projects: [
                { name: 'School Construction', amount: 2000000, status: 'completed' },
                { name: 'Mobile Health Units', amount: 1500000, status: 'ongoing' },
                { name: 'Women Training Center', amount: 800000, status: 'completed' },
                { name: 'Tree Plantation Drive', amount: 500000, status: 'ongoing' }
            ]
        });

        await transparency.save();

        res.json({ 
            message: 'Database seeded successfully',
            adminLogin: { email: 'admin@hopefoundation.org', password: 'admin123' }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

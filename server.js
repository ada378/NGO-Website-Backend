require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Program = require('./models/Program');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const donationRoutes = require('./routes/donations');
const certificateRoutes = require('./routes/certificates');
const programRoutes = require('./routes/programs');
const blogRoutes = require('./routes/blogs');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const paymentRoutes = require('./routes/payment');

const app = express();

app.use(cors({
    origin: ['https://ngo-website-seven-livid.vercel.app', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const certsDir = path.join(__dirname, 'certificates');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });
app.use('/certificates', express.static(certsDir));

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Hope Foundation API Running',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

const seedPrograms = async () => {
    const programs = [
        {
            title: 'Education for All',
            slug: 'education-for-all',
            description: 'Providing quality education to underprivileged children across India. We believe every child deserves access to learning opportunities that can transform their future.',
            category: 'Education',
            impactStats: { livesImpacted: 15000, projectsCompleted: 45, volunteers: 500 },
            goals: { target: 5000000, raised: 3200000 },
            features: ['Free schooling for underprivileged children', 'Scholarship programs for bright students', 'Digital classrooms with modern technology', 'Teacher training and development', 'After-school support programs', 'Career counseling services'],
            status: 'active'
        },
        {
            title: 'Healthcare Mission',
            slug: 'healthcare-mission',
            description: 'Extending quality healthcare services to rural and underserved communities. We organize medical camps, provide medicines, and support critical surgeries.',
            category: 'Healthcare',
            impactStats: { livesImpacted: 25000, projectsCompleted: 60, volunteers: 350 },
            goals: { target: 8000000, raised: 5800000 },
            features: ['Free medical camps in rural areas', 'Emergency healthcare support', 'Mobile health clinics', 'Health awareness programs', 'Maternal and child healthcare', 'Free medicines distribution'],
            status: 'active'
        },
        {
            title: 'Women Empowerment',
            slug: 'women-empowerment',
            description: 'Empowering women through skill development and entrepreneurship support. We help women become self-reliant and economically independent.',
            category: 'Women Empowerment',
            impactStats: { livesImpacted: 8000, projectsCompleted: 30, volunteers: 200 },
            goals: { target: 3000000, raised: 2100000 },
            features: ['Skill development training', 'Microfinance support', 'Self-help groups', 'Entrepreneurship programs', 'Legal awareness', 'Leadership development'],
            status: 'active'
        },
        {
            title: 'Green Earth Initiative',
            slug: 'green-earth-initiative',
            description: 'Environmental conservation through tree plantation and sustainable practices. We work towards a greener and cleaner future for coming generations.',
            category: 'Environment',
            impactStats: { livesImpacted: 50000, projectsCompleted: 25, volunteers: 1000 },
            goals: { target: 2000000, raised: 1500000 },
            features: ['Tree plantation drives', 'Solar energy adoption', 'Waste management programs', 'River cleaning initiatives', 'Awareness campaigns', 'Community gardens'],
            status: 'active'
        }
    ];

    for (const program of programs) {
        await Program.findOneAndUpdate({ slug: program.slug }, program, { upsert: true, new: true });
    }
    console.log('✅ Programs seeded');
};

app.get('/api/seed', async (req, res) => {
    try {
        const result = { messages: [] };
        
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = await User.findOneAndUpdate(
            { role: 'admin' },
            { name: 'Admin', email: 'admin@hopefoundation.org', password: hashedPassword, role: 'admin' },
            { upsert: true, new: true }
        );
        result.messages.push('Admin: admin@hopefoundation.org / admin123');

        await seedPrograms();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8000;

const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();

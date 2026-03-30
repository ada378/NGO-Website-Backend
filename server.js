require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

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
    origin: ['https://ngo-website-seven-livid.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

const certsDir = path.join(__dirname, 'certificates');
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
}
app.use('/certificates', express.static(certsDir));

const seedAdmin = async () => {
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
            console.log('✓ Admin user created: admin@hopefoundation.org / admin123');
        } else {
            console.log('✓ Admin user already exists');
        }
    } catch (error) {
        console.log('✗ Error creating admin:', error.message);
    }
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hope_foundation', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(async () => {
    console.log('MongoDB Connected');
    await seedAdmin();
})
.catch(err => console.log('MongoDB Error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payment', paymentRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Hope Foundation API Running' });
});

app.get('/api/seed', async (req, res) => {
    try {
        await seedAdmin();
        res.json({ message: 'Admin seeded successfully', email: 'admin@hopefoundation.org', password: 'admin123' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

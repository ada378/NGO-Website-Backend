const express = require('express');
const Program = require('../models/Program');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { category, status } = req.query;
        const query = {};
        
        if (category) query.category = category;
        if (status) query.status = status;

        const programs = await Program.find(query).sort({ createdAt: -1 });
        res.json({ programs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        const program = await Program.findOne({ slug: req.params.slug });
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }
        res.json({ program });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { title, description, icon, category, impactStats, goals, features, status } = req.body;
        
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const program = new Program({
            title,
            slug,
            description,
            icon,
            category,
            impactStats,
            goals,
            features,
            status
        });

        await program.save();
        res.status(201).json({ message: 'Program created', program });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const program = await Program.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        res.json({ message: 'Program updated', program });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const program = await Program.findByIdAndDelete(req.params.id);
        
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }
        
        res.json({ message: 'Program deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/stats/overview', async (req, res) => {
    try {
        const programs = await Program.find();
        
        const totalStats = programs.reduce((acc, program) => {
            acc.livesImpacted += program.impactStats.livesImpacted || 0;
            acc.projectsCompleted += program.impactStats.projectsCompleted || 0;
            acc.volunteers += program.impactStats.volunteers || 0;
            return acc;
        }, { livesImpacted: 0, projectsCompleted: 0, volunteers: 0 });

        res.json({ programs, totalStats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

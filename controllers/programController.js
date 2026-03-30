const Program = require('../models/Program');

exports.getPrograms = async (req, res) => {
    try {
        const { status, category } = req.query;
        
        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;

        const programs = await Program.find(query).sort({ createdAt: -1 });

        res.json({ programs, count: programs.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProgramById = async (req, res) => {
    try {
        const program = await Program.findById(req.params.id);
        
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        res.json({ program });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProgramBySlug = async (req, res) => {
    try {
        const program = await Program.findOne({ slug: req.params.slug });
        
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        res.json({ program });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createProgram = async (req, res) => {
    try {
        const { title, description, category, goals, impactStats, status, image, content } = req.body;

        const program = new Program({
            title,
            description,
            category,
            goals,
            impactStats,
            status: status || 'active',
            image,
            content,
            slug: title.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, '')
        });

        await program.save();

        res.status(201).json({ message: 'Program created', program });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProgram = async (req, res) => {
    try {
        const { title, description, category, goals, impactStats, status, image, content } = req.body;

        const program = await Program.findByIdAndUpdate(
            req.params.id,
            { title, description, category, goals, impactStats, status, image, content },
            { new: true }
        );

        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        res.json({ message: 'Program updated', program });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteProgram = async (req, res) => {
    try {
        const program = await Program.findByIdAndDelete(req.params.id);

        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }

        res.json({ message: 'Program deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

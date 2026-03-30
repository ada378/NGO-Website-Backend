const express = require('express');
const Blog = require('../models/Blog');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const { category, page = 1, limit = 9 } = req.query;
        const query = { published: true };
        
        if (category) query.category = category;

        const blogs = await Blog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Blog.countDocuments(query);

        res.json({
            blogs,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug });
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        blog.views += 1;
        await blog.save();
        
        res.json({ blog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { title, content, excerpt, category, tags, images, authorName, featured, published } = req.body;
        
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const blog = new Blog({
            title,
            slug,
            content,
            excerpt,
            category,
            tags,
            images,
            authorName,
            featured,
            published,
            publishedAt: published ? new Date() : null
        });

        await blog.save();
        res.status(201).json({ message: 'Blog created', blog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const blog = await Blog.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        res.json({ message: 'Blog updated', blog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        
        res.json({ message: 'Blog deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/featured/all', async (req, res) => {
    try {
        const featured = await Blog.find({ featured: true, published: true })
            .sort({ createdAt: -1 })
            .limit(5);
        
        const latest = await Blog.find({ published: true })
            .sort({ createdAt: -1 })
            .limit(6);

        res.json({ featured, latest });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

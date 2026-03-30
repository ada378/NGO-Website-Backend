const Blog = require('../models/Blog');

exports.getBlogs = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        const query = {};
        if (status) query.status = status;

        const blogs = await Blog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Blog.countDocuments(query);

        res.json({ blogs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getBlogById = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json({ blog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getBlogBySlug = async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug });
        
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json({ blog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createBlog = async (req, res) => {
    try {
        const { title, content, excerpt, category, author, status, image } = req.body;

        const blog = new Blog({
            title,
            content,
            excerpt,
            category,
            author,
            status: status || 'published',
            image,
            slug: title.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''),
            publishedAt: status === 'published' ? new Date() : null
        });

        await blog.save();

        res.status(201).json({ message: 'Blog created', blog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateBlog = async (req, res) => {
    try {
        const { title, content, excerpt, category, author, status, image } = req.body;

        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        blog.title = title || blog.title;
        blog.content = content || blog.content;
        blog.excerpt = excerpt || blog.excerpt;
        blog.category = category || blog.category;
        blog.author = author || blog.author;
        blog.status = status || blog.status;
        blog.image = image || blog.image;
        
        if (status === 'published' && !blog.publishedAt) {
            blog.publishedAt = new Date();
        }

        await blog.save();

        res.json({ message: 'Blog updated', blog });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteBlog = async (req, res) => {
    try {
        const blog = await Blog.findByIdAndDelete(req.params.id);

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        res.json({ message: 'Blog deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

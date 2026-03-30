const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    excerpt: { type: String },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String },
    category: { type: String, enum: ['News', 'Success Story', 'Campaign Update', 'Event', 'Impact Report'], required: true },
    tags: [{ type: String }],
    images: [{ type: String }],
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    publishedAt: { type: Date }
});

module.exports = mongoose.model('Blog', blogSchema);

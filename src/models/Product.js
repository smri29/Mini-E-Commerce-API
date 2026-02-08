const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a product name'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please provide a description']
    },
    price: {
        type: Number,
        required: [true, 'Please provide a price'],
        min: [0, 'Price must be positive']
    },
    stock: {
        type: Number,
        required: [true, 'Please provide stock quantity'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    category: {
        type: String,
        required: [true, 'Please provide a category'],
        index: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        select: false // Hide deleted products by default
    }
}, { timestamps: true });

// Middleware: Exclude soft-deleted products from find queries
// FIXED: Changed to async and removed 'next' to fix Mongoose compatibility error
productSchema.pre(/^find/, async function() {
    this.find({ isDeleted: { $ne: true } });
});

module.exports = mongoose.model('Product', productSchema);
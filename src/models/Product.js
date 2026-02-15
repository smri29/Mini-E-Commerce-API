const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
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
      min: [0, 'Price must be non-negative']
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
      index: true,
      trim: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false
    }
  },
  { timestamps: true }
);

// Exclude soft-deleted docs from all find* queries
// Promise-style pre hook (no next callback)
productSchema.pre(/^find/, function () {
  this.where({ isDeleted: { $ne: true } });
});

module.exports = mongoose.model('Product', productSchema);

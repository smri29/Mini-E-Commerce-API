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
      required: [true, 'Please provide a description'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Please provide a price'],
      min: [0, 'Price cannot be negative']
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer'
      }
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true,
      index: true
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false }
  }
);

// Hide soft-deleted products from all find queries
productSchema.pre(/^find/, function (next) {
  this.where({ isDeleted: { $ne: true } });
  next();
});

productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);

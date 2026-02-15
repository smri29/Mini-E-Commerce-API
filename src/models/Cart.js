const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer'
      }
    },
    // Snapshot fields
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    name: {
      type: String,
      required: true,
      trim: true,
      default: ''
    }
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    items: [cartItemSchema],
    totalPrice: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
    toObject: { versionKey: false }
  }
);

cartSchema.methods.calculateTotal = function () {
  this.totalPrice = this.items.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return total + price * qty;
  }, 0);
};

cartSchema.pre('save', function (next) {
  this.calculateTotal();
  next();
});

module.exports = mongoose.model('Cart', cartSchema);

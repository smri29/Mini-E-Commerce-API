const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    items: [
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
          default: 1
        },
        price: {
          type: Number,
          default: 0
        },
        name: {
          type: String,
          default: ''
        }
      }
    ],
    totalPrice: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

cartSchema.methods.calculateTotal = function () {
  this.totalPrice = this.items.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return total + price * qty;
  }, 0);
};

// Promise-style pre hook (no next callback)
cartSchema.pre('save', function () {
  this.calculateTotal();
});

module.exports = mongoose.model('Cart', cartSchema);

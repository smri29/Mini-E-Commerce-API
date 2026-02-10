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
        price: Number,
        name: String
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
    return total + item.price * item.quantity;
  }, 0);
};

// Ensure total always stays correct even if a controller forgets
cartSchema.pre('save', function () {
  this.calculateTotal();
});

module.exports = mongoose.model('Cart', cartSchema);

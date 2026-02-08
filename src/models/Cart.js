const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One cart per user
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
            // caching price/name for faster access, but we validate on checkout
            price: Number, 
            name: String
        }
    ],
    totalPrice: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Method to automatically recalculate total price
cartSchema.methods.calculateTotal = function() {
    this.totalPrice = this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
};

module.exports = mongoose.model('Cart', cartSchema);
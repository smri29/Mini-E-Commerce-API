const Cart = require('../models/Cart');
const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private (Customer)
exports.getCart = asyncHandler(async (req, res, next) => {
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        // Return empty cart structure if none exists
        cart = { items: [], totalPrice: 0 };
    }

    res.status(200).json({
        status: 'success',
        data: { cart }
    });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private (Customer)
exports.addToCart = asyncHandler(async (req, res, next) => {
    const { productId, quantity } = req.body;
    const qty = parseInt(quantity) || 1;

    // 1. Check if product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    if (product.stock < qty) {
        throw new ApiError(400, `Not enough stock. Only ${product.stock} left.`);
    }

    // 2. Find or Create Cart
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
        cart = await Cart.create({ userId: req.user._id, items: [] });
    }

    // 3. Check if item already exists in cart
    const itemIndex = cart.items.findIndex(p => p.productId.toString() === productId);

    if (itemIndex > -1) {
        // Product exists in cart, update quantity
        let newQty = cart.items[itemIndex].quantity + qty;
        
        // Double check stock for the NEW total quantity
        if (product.stock < newQty) {
            throw new ApiError(400, `Cannot add more. You already have ${cart.items[itemIndex].quantity} in cart and stock is ${product.stock}.`);
        }
        
        cart.items[itemIndex].quantity = newQty;
    } else {
        // Product does not exist in cart, push new item
        cart.items.push({
            productId,
            quantity: qty,
            price: product.price,
            name: product.title
        });
    }

    // 4. Save (triggers total calculation via method if we call it, or we do it manually)
    cart.calculateTotal();
    await cart.save();

    res.status(200).json({
        status: 'success',
        data: { cart }
    });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private (Customer)
exports.removeFromCart = asyncHandler(async (req, res, next) => {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
        throw new ApiError(404, 'Cart not found');
    }

    // Filter out the item to remove
    cart.items = cart.items.filter(item => item._id.toString() !== req.params.itemId);

    cart.calculateTotal();
    await cart.save();

    res.status(200).json({
        status: 'success',
        data: { cart }
    });
});
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

// @desc    Place an order (Transactional)
// @route   POST /api/orders
// @access  Private (Customer)
exports.createOrder = asyncHandler(async (req, res, next) => {
    // 1. Start a Database Session (Transaction)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Get User's Cart
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart || cart.items.length === 0) {
            throw new ApiError(400, 'Cart is empty');
        }

        // 3. Verify Stock & Prepare Order Items
        const orderItems = [];
        
        for (const item of cart.items) {
            const product = await Product.findById(item.productId).session(session);

            if (!product) {
                throw new ApiError(404, `Product ${item.name} not found`);
            }

            // CRITICAL: Check Real-time Stock
            if (product.stock < item.quantity) {
                throw new ApiError(400, `Insufficient stock for ${product.title}. Available: ${product.stock}`);
            }

            // Deduct Stock
            product.stock -= item.quantity;
            await product.save({ session });

            // Add to Order Items (Snapshot)
            orderItems.push({
                productId: product._id,
                name: product.title,
                price: product.price, // Locking the price
                quantity: item.quantity
            });
        }

        // 4. Create Order
        const order = await Order.create([{
            userId: req.user._id,
            items: orderItems,
            totalAmount: cart.totalPrice
        }], { session });

        // 5. Clear Cart
        cart.items = [];
        cart.totalPrice = 0;
        await cart.save({ session });

        // 6. Commit Transaction (Save everything)
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            status: 'success',
            data: { order: order[0] }
        });

    } catch (error) {
        // If anything fails, undo changes
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

// @desc    Get my orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res, next) => {
    const orders = await Order.find({ userId: req.user._id }).sort('-createdAt');

    res.status(200).json({
        status: 'success',
        results: orders.length,
        data: { orders }
    });
});

// @desc    Cancel Order & Fraud Check
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = asyncHandler(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const order = await Order.findById(req.params.id).session(session);

        // Ownership Check
        if (!order) {
            throw new ApiError(404, 'Order not found');
        }
        if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            throw new ApiError(403, 'Not authorized');
        }
        if (order.status === 'Cancelled') {
            throw new ApiError(400, 'Order is already cancelled');
        }
        if (order.status === 'Shipped' || order.status === 'Delivered') {
            throw new ApiError(400, 'Cannot cancel shipped or delivered orders');
        }

        // 1. Restock Products
        for (const item of order.items) {
            await Product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } },
                { session }
            );
        }

        // 2. Update Order Status
        order.status = 'Cancelled';
        await order.save({ session });

        // 3. 🛡️ FRAUD LOGIC: Increment Cancellation Count
        const user = await User.findById(order.userId).session(session);
        user.cancellationCount += 1;
        user.lastCancellationTime = Date.now();

        // Rule: If > 3 cancellations, block user
        if (user.cancellationCount > 3) {
            user.isBlocked = true; // Auto-ban
        }

        await user.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            status: 'success',
            message: user.isBlocked ? 'Order cancelled. Account suspended due to excessive cancellations.' : 'Order cancelled successfully',
            data: { order }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

// @desc    Admin: Update Order Status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
exports.updateStatus = asyncHandler(async (req, res, next) => {
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
        req.params.id, 
        { status }, 
        { new: true, runValidators: true }
    );

    if (!order) {
        throw new ApiError(404, 'Order not found');
    }

    res.status(200).json({
        status: 'success',
        data: { order }
    });
});
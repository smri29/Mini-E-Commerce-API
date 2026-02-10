const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

const ONE_HOUR_MS = 60 * 60 * 1000;

const allowedTransitions = {
  Pending: ['Shipped', 'Cancelled'],
  Shipped: ['Delivered'],
  Delivered: [],
  Cancelled: []
};

// @desc    Place an order (Transactional)
// @route   POST /api/orders
// @access  Private (Customer)
exports.createOrder = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cart = await Cart.findOne({ userId: req.user._id }).session(session);
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    const orderItems = [];

    // Deduct stock atomically with condition stock >= qty
    for (const item of cart.items) {
      // This query will NOT match soft-deleted products due to Product pre-find middleware
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true, session }
      );

      if (!updatedProduct) {
        // Determine if product missing vs insufficient
        const existing = await Product.findById(item.productId).session(session);
        if (!existing) throw new ApiError(404, `Product not found for cart item ${item._id}`);
        throw new ApiError(
          400,
          `Insufficient stock for ${existing.title}. Available: ${existing.stock}`
        );
      }

      orderItems.push({
        productId: updatedProduct._id,
        name: updatedProduct.title,
        price: updatedProduct.price,
        quantity: item.quantity
      });
    }

    // Compute total at checkout from real product prices
    const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const created = await Order.create(
      [
        {
          userId: req.user._id,
          items: orderItems,
          totalAmount,
          status: 'Pending',
          paymentStatus: 'Pending'
        }
      ],
      { session }
    );

    // Clear cart
    cart.items = [];
    cart.totalPrice = 0;
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: 'success',
      data: { order: created[0] }
    });
  } catch (error) {
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

// @desc    Cancel Order (Customer rule: within 1 hour + pending only) + Fraud check
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) throw new ApiError(404, 'Order not found');

    const isAdmin = req.user.role === 'admin';
    const isOwner = order.userId.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin) throw new ApiError(403, 'Not authorized');

    if (order.status === 'Cancelled') throw new ApiError(400, 'Order is already cancelled');
    if (order.status === 'Shipped' || order.status === 'Delivered') {
      throw new ApiError(400, 'Cannot cancel shipped or delivered orders');
    }

    // Customer rule: only Pending + within 1 hour
    if (!isAdmin) {
      if (order.status !== 'Pending') throw new ApiError(400, 'Only pending orders can be cancelled');

      const ageMs = Date.now() - new Date(order.createdAt).getTime();
      if (ageMs > ONE_HOUR_MS) {
        throw new ApiError(400, 'Cancellation window expired (1 hour)');
      }
    }

    // Restock products
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.quantity } },
        { session }
      );
    }

    order.status = 'Cancelled';
    await order.save({ session });

    // Fraud logic: only penalize when customer cancels their own order
    if (!isAdmin && isOwner) {
      const user = await User.findById(order.userId).session(session);

      user.cancellationCount += 1;
      user.lastCancellationTime = Date.now();

      if (user.cancellationCount > 3) {
        user.isBlocked = true;
      }

      await user.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({
        status: 'success',
        message: user.isBlocked
          ? 'Order cancelled. Account suspended due to excessive cancellations.'
          : 'Order cancelled successfully',
        data: { order }
      });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: 'success',
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

// @desc    Admin: Update Order Status (with transition rules)
// @route   PUT /api/orders/:id/status
// @access  Private (Admin)
exports.updateStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');

  const nextStates = allowedTransitions[order.status] || [];
  if (!nextStates.includes(status)) {
    throw new ApiError(400, `Invalid status transition: ${order.status} -> ${status}`);
  }

  // If admin cancels a pending order, restock (same as cancel logic but without fraud penalty)
  if (status === 'Cancelled' && order.status === 'Pending') {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const fresh = await Order.findById(req.params.id).session(session);
      if (!fresh) throw new ApiError(404, 'Order not found');

      for (const item of fresh.items) {
        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity } },
          { session }
        );
      }

      fresh.status = 'Cancelled';
      const saved = await fresh.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.status(200).json({ status: 'success', data: { order: saved } });
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  order.status = status;
  const saved = await order.save();

  res.status(200).json({
    status: 'success',
    data: { order: saved }
  });
});

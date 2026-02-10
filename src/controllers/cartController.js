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
    cart = { items: [], totalPrice: 0 };
  }

  res.status(200).json({
    status: 'success',
    data: { cart }
  });
});

// @desc    Add item to cart (or increase qty)
// @route   POST /api/cart
// @access  Private (Customer)
exports.addToCart = asyncHandler(async (req, res, next) => {
  const { productId, quantity } = req.body;
  const qty = parseInt(quantity, 10) || 1;

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  if (product.stock < qty) {
    throw new ApiError(400, `Not enough stock. Only ${product.stock} left.`);
  }

  let cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) cart = await Cart.create({ userId: req.user._id, items: [] });

  const itemIndex = cart.items.findIndex((p) => p.productId.toString() === productId);

  if (itemIndex > -1) {
    const newQty = cart.items[itemIndex].quantity + qty;

    if (product.stock < newQty) {
      throw new ApiError(
        400,
        `Cannot add more. You already have ${cart.items[itemIndex].quantity} and stock is ${product.stock}.`
      );
    }

    cart.items[itemIndex].quantity = newQty;
    // keep cached fields fresh
    cart.items[itemIndex].price = product.price;
    cart.items[itemIndex].name = product.title;
  } else {
    cart.items.push({
      productId,
      quantity: qty,
      price: product.price,
      name: product.title
    });
  }

  await cart.save(); // total recalculated by pre-save hook

  res.status(200).json({
    status: 'success',
    data: { cart }
  });
});

// @desc    Update cart item quantity (set absolute quantity)
// @route   PATCH /api/cart/:itemId
// @access  Private (Customer)
exports.updateCartItem = asyncHandler(async (req, res, next) => {
  const { quantity } = req.body;
  const qty = parseInt(quantity, 10);

  if (!Number.isFinite(qty) || qty < 0) {
    throw new ApiError(400, 'quantity must be a non-negative integer');
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) throw new ApiError(404, 'Cart not found');

  const item = cart.items.id(req.params.itemId);
  if (!item) throw new ApiError(404, 'Cart item not found');

  // If qty is 0, remove item
  if (qty === 0) {
    item.deleteOne();
    await cart.save();
    return res.status(200).json({ status: 'success', data: { cart } });
  }

  const product = await Product.findById(item.productId);
  if (!product) throw new ApiError(404, 'Product not found');

  if (product.stock < qty) {
    throw new ApiError(400, `Not enough stock. Only ${product.stock} left.`);
  }

  item.quantity = qty;
  item.price = product.price;
  item.name = product.title;

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
  if (!cart) throw new ApiError(404, 'Cart not found');

  const item = cart.items.id(req.params.itemId);
  if (!item) throw new ApiError(404, 'Cart item not found');

  item.deleteOne();
  await cart.save();

  res.status(200).json({
    status: 'success',
    data: { cart }
  });
});

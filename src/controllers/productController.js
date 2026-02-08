const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getAllProducts = asyncHandler(async (req, res, next) => {
    const products = await Product.find();

    res.status(200).json({
        status: 'success',
        results: products.length,
        data: { products }
    });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    res.status(200).json({
        status: 'success',
        data: { product }
    });
});

// @desc    Create new product
// @route   POST /api/products
// @access  Private (Admin only)
exports.createProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.create(req.body);

    res.status(201).json({
        status: 'success',
        data: { product }
    });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
exports.updateProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    res.status(200).json({
        status: 'success',
        data: { product }
    });
});

// @desc    Delete product (Soft Delete)
// @route   DELETE /api/products/:id
// @access  Private (Admin only)
exports.deleteProduct = asyncHandler(async (req, res, next) => {
    const product = await Product.findByIdAndUpdate(req.params.id, { isDeleted: true });

    if (!product) {
        throw new ApiError(404, 'Product not found');
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
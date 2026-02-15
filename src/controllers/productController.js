const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all products (with filters)
// @route   GET /api/products
// @access  Public
exports.getAllProducts = asyncHandler(async (req, res, next) => {
  const {
    q,
    category,
    minPrice,
    maxPrice,
    sort = '-createdAt',
    page = 1,
    limit = 20
  } = req.query;

  const filter = {};

  if (q) {
    filter.title = { $regex: escapeRegex(String(q)), $options: 'i' };
  }

  if (category) {
    filter.category = {
      $regex: `^${escapeRegex(String(category).trim())}$`,
      $options: 'i'
    };
  }

  const minP = toNumber(minPrice);
  const maxP = toNumber(maxPrice);

  if (minP !== undefined && maxP !== undefined && minP > maxP) {
    throw new ApiError(400, 'minPrice cannot be greater than maxPrice');
  }

  if (minP !== undefined || maxP !== undefined) {
    filter.price = {};
    if (minP !== undefined) filter.price.$gte = minP;
    if (maxP !== undefined) filter.price.$lte = maxP;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const allowedSortFields = new Set(['createdAt', 'price', 'title', 'stock', 'category']);
  const sortBy =
    String(sort)
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
      .map((f) => {
        const isDesc = f.startsWith('-');
        const field = isDesc ? f.slice(1) : f;
        if (!allowedSortFields.has(field)) return null;
        return isDesc ? `-${field}` : field;
      })
      .filter(Boolean)
      .join(' ') || '-createdAt';

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortBy).skip(skip).limit(limitNum)
  ]);

  res.status(200).json({
    status: 'success',
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    },
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
  const { title, description, price, stock, category } = req.body;

  const product = await Product.create({ title, description, price, stock, category });

  res.status(201).json({
    status: 'success',
    data: { product }
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Admin only)
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const allowed = ['title', 'description', 'price', 'stock', 'category'];
  const payload = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) payload[k] = req.body[k];
  }

  const product = await Product.findByIdAndUpdate(req.params.id, payload, {
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
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.status(200).json({
    status: 'success',
    data: { product }
  });
});

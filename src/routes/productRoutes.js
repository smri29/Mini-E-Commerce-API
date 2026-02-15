const express = require('express');
const { body, param } = require('express-validator');

const {
  getAllProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

// Public
router.get('/', getAllProducts);

router.get(
  '/:id',
  [param('id').isMongoId().withMessage('invalid product id')],
  validate,
  getProduct
);

// Admin create
router.post(
  '/',
  protect,
  authorize('admin'),
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('title required')
      .isLength({ min: 2, max: 140 })
      .withMessage('title must be between 2 and 140 chars'),

    body('description')
      .trim()
      .notEmpty()
      .withMessage('description required')
      .isLength({ min: 3, max: 2000 })
      .withMessage('description must be between 3 and 2000 chars'),

    body('price').isFloat({ min: 0 }).withMessage('price must be >= 0'),
    body('stock').isInt({ min: 0 }).withMessage('stock must be >= 0'),

    body('category')
      .trim()
      .notEmpty()
      .withMessage('category required')
      .isLength({ min: 2, max: 80 })
      .withMessage('category must be between 2 and 80 chars')
  ],
  validate,
  createProduct
);

// Admin update
router.put(
  '/:id',
  protect,
  authorize('admin'),
  [
    param('id').isMongoId().withMessage('invalid product id'),

    body().custom((_, { req }) => {
      const allowed = ['title', 'description', 'price', 'stock', 'category'];
      const hasAny = allowed.some((k) => req.body[k] !== undefined);
      if (!hasAny) {
        throw new Error('at least one updatable field is required');
      }
      return true;
    }),

    body('title').optional().trim().isLength({ min: 2, max: 140 }),
    body('description').optional().trim().isLength({ min: 3, max: 2000 }),
    body('price').optional().isFloat({ min: 0 }).withMessage('price must be >= 0'),
    body('stock').optional().isInt({ min: 0 }).withMessage('stock must be >= 0'),
    body('category').optional().trim().isLength({ min: 2, max: 80 })
  ],
  validate,
  updateProduct
);

// Admin delete
router.delete(
  '/:id',
  protect,
  authorize('admin'),
  [param('id').isMongoId().withMessage('invalid product id')],
  validate,
  deleteProduct
);

module.exports = router;

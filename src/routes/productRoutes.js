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

// Admin Only
router.use(protect);
router.use(authorize('admin'));

router.post(
  '/',
  [
    body('title').notEmpty().withMessage('title required'),
    body('description').notEmpty().withMessage('description required'),
    body('price').isFloat({ min: 0 }).withMessage('price must be >= 0'),
    body('stock').isInt({ min: 0 }).withMessage('stock must be >= 0'),
    body('category').notEmpty().withMessage('category required')
  ],
  validate,
  createProduct
);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('invalid product id'),
    body('title').optional().isString(),
    body('description').optional().isString(),
    body('price').optional().isFloat({ min: 0 }).withMessage('price must be >= 0'),
    body('stock').optional().isInt({ min: 0 }).withMessage('stock must be >= 0'),
    body('category').optional().isString()
  ],
  validate,
  updateProduct
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('invalid product id')],
  validate,
  deleteProduct
);

module.exports = router;

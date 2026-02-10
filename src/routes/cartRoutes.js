const express = require('express');
const { body, param } = require('express-validator');

const { getCart, addToCart, updateCartItem, removeFromCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', getCart);

router.post(
  '/',
  [
    body('productId').isMongoId().withMessage('valid productId required'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be >= 1')
  ],
  validate,
  addToCart
);

router.patch(
  '/:itemId',
  [
    param('itemId').isMongoId().withMessage('invalid cart item id'),
    body('quantity').isInt({ min: 0 }).withMessage('quantity must be >= 0')
  ],
  validate,
  updateCartItem
);

router.delete(
  '/:itemId',
  [param('itemId').isMongoId().withMessage('invalid cart item id')],
  validate,
  removeFromCart
);

module.exports = router;

const express = require('express');
const { body, param } = require('express-validator');

const { createOrder, getMyOrders, cancelOrder, updateStatus } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

// Customer-only order operations
router.post('/', authorize('customer'), createOrder);
router.get('/', authorize('customer'), getMyOrders);

// Cancel can be triggered by customer (own order) or admin (enforced in controller)
router.put(
  '/:id/cancel',
  [param('id').isMongoId().withMessage('invalid order id')],
  validate,
  cancelOrder
);

// Admin status management
router.put(
  '/:id/status',
  [
    authorize('admin'),
    param('id').isMongoId().withMessage('invalid order id'),
    body('status')
      .exists({ checkFalsy: true })
      .withMessage('status is required')
      .isIn(['Pending', 'Shipped', 'Delivered', 'Cancelled'])
      .withMessage('invalid status')
  ],
  validate,
  updateStatus
);

module.exports = router;

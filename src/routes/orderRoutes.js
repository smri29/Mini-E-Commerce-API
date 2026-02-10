const express = require('express');
const { body, param } = require('express-validator');

const { createOrder, getMyOrders, cancelOrder, updateStatus } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').post(createOrder).get(getMyOrders);

router.put(
  '/:id/cancel',
  [param('id').isMongoId().withMessage('invalid order id')],
  validate,
  cancelOrder
);

router.put(
  '/:id/status',
  [
    authorize('admin'),
    param('id').isMongoId().withMessage('invalid order id'),
    body('status').isIn(['Pending', 'Shipped', 'Delivered', 'Cancelled']).withMessage('invalid status')
  ],
  validate,
  updateStatus
);

module.exports = router;

const express = require('express');
const { 
    createOrder, 
    getMyOrders, 
    cancelOrder,
    updateStatus
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect); // Login required for all

router.route('/')
    .post(createOrder)
    .get(getMyOrders);

router.put('/:id/cancel', cancelOrder);

// Admin Only Route
router.put('/:id/status', authorize('admin'), updateStatus);

module.exports = router;
const express = require('express');
const { getCart, addToCart, removeFromCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // All cart routes require login

router.route('/')
    .get(getCart)
    .post(addToCart);

router.delete('/:itemId', removeFromCart);

module.exports = router;
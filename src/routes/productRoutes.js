const express = require('express');
const {
    getAllProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const router = express.Router();

// Public Routes
router.get('/', getAllProducts);
router.get('/:id', getProduct);

// Admin Only Routes
router.use(protect); // All routes below this are protected
router.use(authorize('admin')); // All routes below this require Admin role

router.route('/')
    .post(createProduct);

router.route('/:id')
    .put(updateProduct)
    .delete(deleteProduct);

module.exports = router;
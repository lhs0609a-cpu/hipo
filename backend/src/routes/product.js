const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', productController.getProducts);
router.get('/:productId', productController.getProductById);
router.post('/', authenticateToken, productController.createProduct);
router.put('/:productId', authenticateToken, productController.updateProduct);
router.delete('/:productId', authenticateToken, productController.deleteProduct);

module.exports = router;

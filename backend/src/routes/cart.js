const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, cartController.getCart);
router.post('/items', authenticateToken, cartController.addToCart);
router.put('/items/:itemId', authenticateToken, cartController.updateCartItem);
router.delete('/items/:itemId', authenticateToken, cartController.removeFromCart);
router.delete('/', authenticateToken, cartController.clearCart);

module.exports = router;

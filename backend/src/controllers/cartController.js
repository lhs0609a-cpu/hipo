const { Cart, CartItem, Product, User } = require('../models');

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          include: [{
            model: User,
            as: 'seller',
            attributes: ['id', 'username', 'profileImage']
          }]
        }]
      }]
    });

    if (!cart) {
      cart = await Cart.create({ userId });
      cart.items = [];
    }

    const { getShareholding } = require('../utils/shareholderHelper');
    const itemsWithDiscount = await Promise.all(cart.items.map(async (item) => {
      const itemData = item.toJSON();
      const product = itemData.product;

      if (product.minSharesForDiscount > 0) {
        const shareholding = await getShareholding(userId, product.sellerId);
        const discountEligible = shareholding >= product.minSharesForDiscount;

        itemData.discountEligible = discountEligible;
        itemData.discountAmount = discountEligible 
          ? (product.price * product.shareholderDiscount / 100) 
          : 0;
        itemData.finalPrice = discountEligible 
          ? product.price - itemData.discountAmount 
          : product.price;
      } else {
        itemData.discountEligible = false;
        itemData.discountAmount = 0;
        itemData.finalPrice = product.price;
      }

      return itemData;
    }));

    res.json({
      cart: {
        id: cart.id,
        items: itemsWithDiscount
      }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (!product.isActive) {
      return res.status(400).json({ error: 'Product is not available' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    let cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      cart = await Cart.create({ userId });
    }

    let cartItem = await CartItem.findOne({
      where: { cartId: cart.id, productId }
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;
      if (product.stock < newQuantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      await cartItem.update({ quantity: newQuantity });
    } else {
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId,
        quantity
      });
    }

    res.status(201).json({
      message: 'Product added to cart',
      cartItem
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add product to cart' });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id },
      include: [{ model: Product, as: 'product' }]
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (cartItem.product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    await cartItem.update({ quantity });

    res.json({
      message: 'Cart item updated',
      cartItem
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id }
    });

    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    await cartItem.destroy();

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    await CartItem.destroy({ where: { cartId: cart.id } });

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};

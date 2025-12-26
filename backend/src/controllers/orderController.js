const { Order, OrderItem, Product, User, Cart, CartItem, sequelize } = require('../models');

exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { shippingAddress, paymentMethod } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ error: 'Shipping address and payment method are required' });
    }

    const cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const { getShareholding } = require('../utils/shareholderHelper');
    let totalAmount = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.product;

      if (!product.isActive) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Product ' + product.name + ' is no longer available' });
      }

      if (product.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Insufficient stock for ' + product.name });
      }

      let finalPrice = parseFloat(product.price);
      let discountApplied = 0;

      if (product.minSharesForDiscount > 0 && product.shareholderDiscount > 0) {
        const shareholding = await getShareholding(userId, product.sellerId);
        if (shareholding >= product.minSharesForDiscount) {
          discountApplied = finalPrice * (product.shareholderDiscount / 100);
          finalPrice = finalPrice - discountApplied;
        }
      }

      totalAmount += finalPrice * item.quantity;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: finalPrice,
        discountApplied: discountApplied * item.quantity
      });

      await product.update(
        { stock: product.stock - item.quantity },
        { transaction }
      );
    }

    const order = await Order.create({
      userId,
      totalAmount,
      status: 'pending',
      shippingAddress,
      paymentMethod
    }, { transaction });

    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order.id,
        ...item
      }, { transaction });
    }

    await CartItem.destroy({
      where: { cartId: cart.id },
      transaction
    });

    await transaction.commit();

    const createdOrder = await Order.findByPk(order.id, {
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: createdOrder
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const orders = await Order.findAll({
      where: { userId },
      include: [{
        model: OrderItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Order.count({ where: { userId } });

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: { id: orderId, userId },
      include: [{
        model: OrderItem,
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

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber } = req.body;

    const order = await Order.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
    }
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    await order.update(updateData);

    res.json({
      message: 'Order status updated',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: { id: orderId, userId },
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    }

    for (const item of order.items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        await product.update(
          { stock: product.stock + item.quantity },
          { transaction }
        );
      }
    }

    await order.update({ status: 'cancelled' }, { transaction });

    await transaction.commit();

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};

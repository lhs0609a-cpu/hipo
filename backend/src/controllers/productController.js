const { Product, User } = require('../models');
const { Op } = require('sequelize');

exports.getProducts = async (req, res) => {
  try {
    const { category, sellerId, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: '%' + search + '%' } },
        { description: { [Op.like]: '%' + search + '%' } }
      ];
    }

    const products = await Product.findAll({
      where,
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'username', 'profileImage']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await Product.count({ where });

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;

    const product = await Product.findByPk(productId, {
      include: [{
        model: User,
        as: 'seller',
        attributes: ['id', 'username', 'profileImage', 'trustLevel']
      }]
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let discountEligible = false;
    let shareholding = 0;

    if (userId && product.minSharesForDiscount > 0) {
      const { getShareholding } = require('../utils/shareholderHelper');
      shareholding = await getShareholding(userId, product.sellerId);
      discountEligible = shareholding >= product.minSharesForDiscount;
    }

    const productData = product.toJSON();
    productData.discountEligible = discountEligible;
    productData.userShareholding = shareholding;

    res.json({ product: productData });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const {
      name,
      description,
      price,
      imageUrl,
      stock,
      category,
      shareholderDiscount,
      minSharesForDiscount
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const product = await Product.create({
      sellerId,
      name,
      description,
      price,
      imageUrl,
      stock: stock || 0,
      category,
      shareholderDiscount: shareholderDiscount || 0,
      minSharesForDiscount: minSharesForDiscount || 0
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const sellerId = req.user.id;
    const updateData = req.body;

    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.sellerId !== sellerId) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    await product.update(updateData);

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const sellerId = req.user.id;

    const product = await Product.findByPk(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.sellerId !== sellerId) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    await product.update({ isActive: false });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

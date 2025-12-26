const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    shareholderDiscount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Discount percentage for shareholders (0-100)'
    },
    minSharesForDiscount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Minimum shares required for discount'
    }
  }, {
    tableName: 'products',
    underscored: true,
    timestamps: true
  });

  Product.associate = (models) => {
    Product.belongsTo(models.User, {
      foreignKey: 'sellerId',
      as: 'seller'
    });

    Product.hasMany(models.CartItem, {
      foreignKey: 'productId',
      as: 'cartItems'
    });

    Product.hasMany(models.OrderItem, {
      foreignKey: 'productId',
      as: 'orderItems'
    });
  };

  return Product;
};

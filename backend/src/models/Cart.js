const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cart = sequelize.define('Cart', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'carts',
    underscored: true,
    timestamps: true
  });

  Cart.associate = (models) => {
    Cart.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Cart.hasMany(models.CartItem, {
      foreignKey: 'cartId',
      as: 'items'
    });
  };

  return Cart;
};

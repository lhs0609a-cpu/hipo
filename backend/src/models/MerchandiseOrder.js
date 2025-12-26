const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MerchandiseOrder = sequelize.define('MerchandiseOrder', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    merchandiseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'merchandises',
        key: 'id'
      },
      field: 'merchandise_id',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id',
      comment: '주문자'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '주문 수량'
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_price',
      comment: '총 주문 금액'
    },
    shareholdingAtOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shareholding_at_order',
      comment: '주문 당시 보유 주식 수'
    },
    isEarlyAccess: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_early_access',
      comment: '주주 우선 구매 여부'
    },
    orderStatus: {
      type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'),
      defaultValue: 'PENDING',
      field: 'order_status',
      comment: '주문 상태'
    },
    shippingAddress: {
      type: DataTypes.JSON,
      field: 'shipping_address',
      comment: '배송 주소 정보'
    },
    trackingNumber: {
      type: DataTypes.STRING,
      field: 'tracking_number',
      comment: '송장 번호'
    }
  }, {
    tableName: 'merchandise_orders',
    timestamps: true,
    indexes: [
      { fields: ['merchandise_id'] },
      { fields: ['user_id'] },
      { fields: ['order_status'] },
      { fields: ['is_early_access'] }
    ]
  });

  MerchandiseOrder.associate = (models) => {
    MerchandiseOrder.belongsTo(models.Merchandise, {
      foreignKey: 'merchandiseId',
      as: 'merchandise'
    });

    MerchandiseOrder.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'buyer'
    });
  };

  return MerchandiseOrder;
};

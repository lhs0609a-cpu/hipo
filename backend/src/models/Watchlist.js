const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Watchlist = sequelize.define('Watchlist', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: '사용자 ID',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'stock_id',
      comment: '주식 ID',
      references: {
        model: 'stocks',
        key: 'id'
      }
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '메모'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'watchlist',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'stock_id'],
        name: 'unique_user_stock'
      },
      { fields: ['user_id'] },
      { fields: ['stock_id'] }
    ]
  });

  Watchlist.associate = (models) => {
    // 사용자
    Watchlist.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    // 주식
    Watchlist.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });
  };

  return Watchlist;
};

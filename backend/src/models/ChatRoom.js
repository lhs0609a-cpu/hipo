const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatRoom = sequelize.define('ChatRoom', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    stockId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stocks',
        key: 'id'
      },
      field: 'stock_id'
    },
    tier: {
      type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
      allowNull: false
    },
    adminUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'admin_user_id'
    },
    maxMembers: {
      type: DataTypes.INTEGER,
      field: 'max_members'
    },
    currentMembers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'current_members'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'chat_rooms',
    indexes: [
      { fields: ['stock_id'] },
      { fields: ['tier'] },
      { unique: true, fields: ['stock_id', 'tier'] }
    ]
  });

  ChatRoom.associate = (models) => {
    // 주식
    ChatRoom.belongsTo(models.Stock, {
      foreignKey: 'stockId',
      as: 'stock'
    });

    // 관리자
    ChatRoom.belongsTo(models.User, {
      foreignKey: 'adminUserId',
      as: 'admin'
    });

    // 메시지들
    ChatRoom.hasMany(models.Message, {
      foreignKey: 'roomId',
      as: 'messages'
    });
  };

  return ChatRoom;
};

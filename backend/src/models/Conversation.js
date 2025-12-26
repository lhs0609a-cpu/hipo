const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Conversation = sequelize.define('Conversation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user1Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    user2Id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'conversations',
    underscored: true,
    timestamps: true
  });

  Conversation.associate = (models) => {
    Conversation.belongsTo(models.User, {
      foreignKey: 'user1Id',
      as: 'user1'
    });

    Conversation.belongsTo(models.User, {
      foreignKey: 'user2Id',
      as: 'user2'
    });

    Conversation.hasMany(models.Message, {
      foreignKey: 'conversationId',
      as: 'messages'
    });
  };

  return Conversation;
};

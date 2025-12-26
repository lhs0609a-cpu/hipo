const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Like = sequelize.define('Like', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      },
      field: 'post_id',
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    }
  }, {
    tableName: 'likes',
    updatedAt: false,
    indexes: [
      { fields: ['post_id'] },
      { fields: ['user_id'] },
      { unique: true, fields: ['post_id', 'user_id'] }
    ]
  });

  Like.associate = (models) => {
    Like.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });

    Like.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Like;
};

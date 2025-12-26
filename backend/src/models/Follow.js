const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Follow = sequelize.define('Follow', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    followerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'follower_id'
    },
    followingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'following_id'
    }
  }, {
    tableName: 'follows',
    updatedAt: false,
    indexes: [
      { fields: ['follower_id'] },
      { fields: ['following_id'] },
      { unique: true, fields: ['follower_id', 'following_id'] }
    ]
  });

  Follow.associate = (models) => {
    Follow.belongsTo(models.User, {
      foreignKey: 'followerId',
      as: 'follower'
    });

    Follow.belongsTo(models.User, {
      foreignKey: 'followingId',
      as: 'following'
    });
  };

  return Follow;
};

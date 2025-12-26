const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Bookmark = sequelize.define('Bookmark', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'post_id'
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
    tableName: 'bookmarks',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'post_id']
      }
    ]
  });

  Bookmark.associate = (models) => {
    Bookmark.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Bookmark.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });
  };

  return Bookmark;
};

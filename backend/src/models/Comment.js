const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Comment = sequelize.define('Comment', {
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
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    shareholding: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shareholding',
      comment: '댓글 작성 시점의 주식 보유량 (우선 노출용)'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_pinned',
      comment: '고정 댓글 여부 (최대주주 자동 고정)'
    }
  }, {
    tableName: 'comments',
    updatedAt: false,
    indexes: [
      { fields: ['post_id'] },
      { fields: ['user_id'] }
    ]
  });

  Comment.associate = (models) => {
    Comment.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });

    Comment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });
  };

  return Comment;
};

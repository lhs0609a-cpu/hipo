const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommentLimit = sequelize.define('CommentLimit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '댓글을 작성한 대상 사용자'
    },
    month: {
      type: DataTypes.STRING(7),
      allowNull: false,
      comment: 'YYYY-MM 형식'
    },
    commentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'comment_limits',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'target_user_id', 'month']
      }
    ]
  });

  CommentLimit.associate = (models) => {
    CommentLimit.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    CommentLimit.belongsTo(models.User, {
      foreignKey: 'targetUserId',
      as: 'targetUser'
    });
  };

  return CommentLimit;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
      type: DataTypes.TEXT
    },
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url'
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'likes_count'
    },
    commentsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'comments_count'
    },
    isPremium: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_premium',
      comment: '프리미엄 콘텐츠 여부 (우량 주주 이상만 조회 가능)'
    },
    visibilityType: {
      type: DataTypes.ENUM('PUBLIC', 'SHAREHOLDERS_ONLY', 'MINIMUM_SHARES'),
      defaultValue: 'PUBLIC',
      field: 'visibility_type',
      comment: '공개 범위 유형: PUBLIC(전체 공개), SHAREHOLDERS_ONLY(주주만), MINIMUM_SHARES(최소 보유 주식 수)'
    },
    minimumShares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'minimum_shares',
      comment: '최소 보유 주식 수 (visibilityType이 MINIMUM_SHARES인 경우)'
    }
  }, {
    tableName: 'posts',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['created_at'] }
    ]
  });

  Post.associate = (models) => {
    Post.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });

    Post.hasMany(models.Comment, {
      foreignKey: 'postId',
      as: 'comments'
    });

    Post.hasMany(models.Like, {
      foreignKey: 'postId',
      as: 'likes'
    });

    Post.belongsToMany(models.Hashtag, {
      through: 'post_hashtags',
      foreignKey: 'post_id',
      otherKey: 'hashtag_id',
      as: 'hashtags'
    });
  };

  return Post;
};

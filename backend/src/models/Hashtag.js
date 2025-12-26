const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Hashtag = sequelize.define('Hashtag', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '해시태그 이름 (# 제외)'
    },
    count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '해시태그가 사용된 횟수'
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
    tableName: 'hashtags',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['count']
      }
    ]
  });

  Hashtag.associate = (models) => {
    Hashtag.belongsToMany(models.Post, {
      through: 'post_hashtags',
      foreignKey: 'hashtag_id',
      otherKey: 'post_id',
      as: 'posts'
    });
  };

  return Hashtag;
};

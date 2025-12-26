const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Story = sequelize.define('Story', {
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
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    tableName: 'stories',
    underscored: true,
    timestamps: true
  });

  Story.associate = (models) => {
    Story.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });

    Story.belongsToMany(models.User, {
      through: 'story_views',
      foreignKey: 'story_id',
      otherKey: 'user_id',
      as: 'viewers'
    });
  };

  return Story;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ContentRequestVote = sequelize.define('ContentRequestVote', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    requestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'content_requests',
        key: 'id'
      },
      field: 'request_id',
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
    vote: {
      type: DataTypes.ENUM('YES', 'NO'),
      allowNull: false,
      comment: '찬성/반대'
    }
  }, {
    tableName: 'content_request_votes',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['request_id', 'user_id']
      },
      { fields: ['request_id'] },
      { fields: ['user_id'] }
    ]
  });

  ContentRequestVote.associate = (models) => {
    ContentRequestVote.belongsTo(models.ContentRequest, {
      foreignKey: 'requestId',
      as: 'request'
    });

    ContentRequestVote.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'voter'
    });
  };

  return ContentRequestVote;
};

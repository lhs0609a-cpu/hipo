const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityNoticeRead = sequelize.define('CommunityNoticeRead', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    noticeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'community_notices',
        key: 'id'
      },
      field: 'notice_id',
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
    readAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'read_at',
      comment: '읽은 일시'
    }
  }, {
    tableName: 'community_notice_reads',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['notice_id', 'user_id']
      },
      { fields: ['notice_id'] },
      { fields: ['user_id'] }
    ]
  });

  CommunityNoticeRead.associate = (models) => {
    CommunityNoticeRead.belongsTo(models.CommunityNotice, {
      foreignKey: 'noticeId',
      as: 'notice'
    });

    CommunityNoticeRead.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'reader'
    });
  };

  return CommunityNoticeRead;
};

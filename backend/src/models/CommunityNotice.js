const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityNotice = sequelize.define('CommunityNotice', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    communityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'shareholder_communities',
        key: 'id'
      },
      field: 'community_id',
      onDelete: 'CASCADE'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'created_by',
      comment: '공지 작성자 (방장 또는 상장인)'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '공지 제목'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '공지 내용'
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_pinned',
      comment: '고정 여부'
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '우선순위 (높을수록 상단)'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count',
      comment: '조회 수'
    }
  }, {
    tableName: 'community_notices',
    timestamps: true,
    indexes: [
      { fields: ['community_id'] },
      { fields: ['created_by'] },
      { fields: ['is_pinned'] },
      { fields: ['priority'] }
    ]
  });

  CommunityNotice.associate = (models) => {
    CommunityNotice.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    CommunityNotice.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'author'
    });

    CommunityNotice.hasMany(models.CommunityNoticeRead, {
      foreignKey: 'noticeId',
      as: 'reads'
    });
  };

  return CommunityNotice;
};

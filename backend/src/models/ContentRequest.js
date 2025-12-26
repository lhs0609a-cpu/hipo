const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ContentRequest = sequelize.define('ContentRequest', {
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
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'requested_by',
      comment: '요청한 방장 ID'
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'creator_id',
      comment: '상장인 ID'
    },
    requestType: {
      type: DataTypes.ENUM('LIVE_STREAM', 'EXCLUSIVE_VIDEO', 'QA_SESSION', 'BEHIND_SCENE', 'CUSTOM'),
      allowNull: false,
      field: 'request_type',
      comment: '요청 콘텐츠 타입'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '요청 제목 (예: "다음 주 촬영 현장 라이브 원해요?")'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '요청 세부 내용'
    },
    status: {
      type: DataTypes.ENUM('VOTING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'),
      defaultValue: 'VOTING',
      comment: '요청 상태'
    },
    votingEndsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'voting_ends_at',
      comment: '투표 마감 일시'
    },
    yesVotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'yes_votes',
      comment: '찬성 투표 수'
    },
    noVotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'no_votes',
      comment: '반대 투표 수'
    },
    totalVoters: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_voters',
      comment: '총 투표 참여자 수'
    },
    isMajorityApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_majority_approved',
      comment: '과반 찬성 여부'
    },
    creatorResponse: {
      type: DataTypes.TEXT,
      field: 'creator_response',
      comment: '상장인 답변'
    },
    scheduledAt: {
      type: DataTypes.DATE,
      field: 'scheduled_at',
      comment: '콘텐츠 예정 일시 (승인 시)'
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at',
      comment: '콘텐츠 제공 완료 일시'
    },
    contentUrl: {
      type: DataTypes.STRING,
      field: 'content_url',
      comment: '제공된 콘텐츠 URL'
    }
  }, {
    tableName: 'content_requests',
    timestamps: true,
    indexes: [
      { fields: ['community_id', 'status'] },
      { fields: ['creator_id', 'status'] },
      { fields: ['requested_by'] },
      { fields: ['voting_ends_at'] }
    ]
  });

  ContentRequest.associate = (models) => {
    ContentRequest.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    ContentRequest.belongsTo(models.User, {
      foreignKey: 'requestedBy',
      as: 'requester'
    });

    ContentRequest.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });

    ContentRequest.hasMany(models.ContentRequestVote, {
      foreignKey: 'requestId',
      as: 'votes'
    });
  };

  return ContentRequest;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityPoll = sequelize.define('CommunityPoll', {
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
      comment: '투표 생성자 (방장)'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '투표 제목'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '투표 설명'
    },
    votingPower: {
      type: DataTypes.ENUM('ONE_PERSON_ONE_VOTE', 'ONE_SHARE_ONE_VOTE'),
      defaultValue: 'ONE_SHARE_ONE_VOTE',
      field: 'voting_power',
      comment: '투표권: 1인 1표 또는 1주 1표'
    },
    resultVisibility: {
      type: DataTypes.ENUM('IMMEDIATE', 'AFTER_VOTE', 'AFTER_END'),
      defaultValue: 'IMMEDIATE',
      field: 'result_visibility',
      comment: '결과 공개 시점'
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'ends_at',
      comment: '투표 마감 일시'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'ENDED', 'CANCELLED'),
      defaultValue: 'ACTIVE',
      comment: '투표 상태'
    },
    totalVotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_votes',
      comment: '총 투표 수'
    },
    participantCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'participant_count',
      comment: '투표 참여 인원'
    }
  }, {
    tableName: 'community_polls',
    timestamps: true,
    indexes: [
      { fields: ['community_id'] },
      { fields: ['created_by'] },
      { fields: ['status'] },
      { fields: ['ends_at'] }
    ]
  });

  CommunityPoll.associate = (models) => {
    CommunityPoll.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'communityId',
      as: 'community'
    });

    CommunityPoll.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    CommunityPoll.hasMany(models.CommunityPollOption, {
      foreignKey: 'pollId',
      as: 'options',
      onDelete: 'CASCADE'
    });

    CommunityPoll.hasMany(models.CommunityPollVote, {
      foreignKey: 'pollId',
      as: 'votes',
      onDelete: 'CASCADE'
    });
  };

  return CommunityPoll;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityPollOption = sequelize.define('CommunityPollOption', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    pollId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'community_polls',
        key: 'id'
      },
      field: 'poll_id',
      onDelete: 'CASCADE'
    },
    text: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '선택지 텍스트'
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '선택지 순서'
    },
    voteCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'vote_count',
      comment: '총 투표 수 (주식 기반일 경우 총 주식 수)'
    },
    voterCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'voter_count',
      comment: '투표한 사람 수'
    }
  }, {
    tableName: 'community_poll_options',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['poll_id'] },
      { fields: ['order'] }
    ]
  });

  CommunityPollOption.associate = (models) => {
    CommunityPollOption.belongsTo(models.CommunityPoll, {
      foreignKey: 'pollId',
      as: 'poll'
    });

    CommunityPollOption.hasMany(models.CommunityPollVote, {
      foreignKey: 'optionId',
      as: 'votes',
      onDelete: 'CASCADE'
    });
  };

  return CommunityPollOption;
};

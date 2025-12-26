const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommunityPollVote = sequelize.define('CommunityPollVote', {
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
    optionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'community_poll_options',
        key: 'id'
      },
      field: 'option_id',
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
    votePower: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'vote_power',
      comment: '투표 가중치 (1주 = 1표 방식일 경우 주식 수)'
    },
    shareholdingAtVote: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'shareholding_at_vote',
      comment: '투표 시점의 주식 보유량'
    }
  }, {
    tableName: 'community_poll_votes',
    timestamps: true,
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['poll_id', 'user_id']
      },
      { fields: ['poll_id'] },
      { fields: ['option_id'] },
      { fields: ['user_id'] }
    ]
  });

  CommunityPollVote.associate = (models) => {
    CommunityPollVote.belongsTo(models.CommunityPoll, {
      foreignKey: 'pollId',
      as: 'poll'
    });

    CommunityPollVote.belongsTo(models.CommunityPollOption, {
      foreignKey: 'optionId',
      as: 'option'
    });

    CommunityPollVote.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'voter'
    });
  };

  return CommunityPollVote;
};

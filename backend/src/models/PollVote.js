const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PollVote = sequelize.define('PollVote', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    pollId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'polls',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    optionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'poll_options',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    shareholding: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '투표 당시 보유 주식 수 (가중치)'
    }
  }, {
    tableName: 'poll_votes',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['poll_id']
      },
      {
        fields: ['option_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['poll_id', 'user_id', 'option_id']
      }
    ]
  });

  PollVote.associate = (models) => {
    PollVote.belongsTo(models.Poll, {
      foreignKey: 'pollId',
      as: 'poll'
    });

    PollVote.belongsTo(models.PollOption, {
      foreignKey: 'optionId',
      as: 'option'
    });

    PollVote.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'voter'
    });
  };

  return PollVote;
};

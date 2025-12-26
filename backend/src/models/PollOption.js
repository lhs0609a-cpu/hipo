const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PollOption = sequelize.define('PollOption', {
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
    text: {
      type: DataTypes.STRING,
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '선택지 순서'
    },
    votesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '득표 수'
    }
  }, {
    tableName: 'poll_options',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['poll_id']
      }
    ]
  });

  PollOption.associate = (models) => {
    PollOption.belongsTo(models.Poll, {
      foreignKey: 'pollId',
      as: 'poll'
    });

    PollOption.hasMany(models.PollVote, {
      foreignKey: 'optionId',
      as: 'votes',
      onDelete: 'CASCADE'
    });
  };

  return PollOption;
};

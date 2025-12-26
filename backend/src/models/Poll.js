const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Poll = sequelize.define('Poll', {
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
      },
      comment: '투표를 생성한 사용자'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: '투표 종료 시간'
    },
    status: {
      type: DataTypes.ENUM('active', 'closed', 'cancelled'),
      defaultValue: 'active'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '공개 투표 여부'
    },
    allowMultipleChoices: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '다중 선택 허용 여부'
    },
    requiresShareholderStatus: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '주주만 투표 가능 여부'
    },
    minSharesRequired: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '투표에 필요한 최소 주식 수'
    }
  }, {
    tableName: 'polls',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['ends_at']
      }
    ]
  });

  Poll.associate = (models) => {
    Poll.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'creator'
    });

    Poll.hasMany(models.PollOption, {
      foreignKey: 'pollId',
      as: 'options',
      onDelete: 'CASCADE'
    });

    Poll.hasMany(models.PollVote, {
      foreignKey: 'pollId',
      as: 'votes',
      onDelete: 'CASCADE'
    });
  };

  return Poll;
};

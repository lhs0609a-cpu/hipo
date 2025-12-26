const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const QA = sequelize.define('QA', {
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
      comment: '질문을 작성한 사용자'
    },
    targetUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '질문을 받는 대상 사용자'
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'answered', 'rejected'),
      defaultValue: 'pending'
    },
    weekNumber: {
      type: DataTypes.STRING(7),
      allowNull: false,
      comment: 'YYYY-WW 형식 (예: 2024-01)'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '공개 여부'
    }
  }, {
    tableName: 'qas',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['target_user_id']
      },
      {
        fields: ['week_number']
      },
      {
        fields: ['status']
      }
    ]
  });

  QA.associate = (models) => {
    QA.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'questioner'
    });

    QA.belongsTo(models.User, {
      foreignKey: 'targetUserId',
      as: 'answerer'
    });
  };

  return QA;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Feedback = sequelize.define('Feedback', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '피드백 작성자 (비로그인 가능)'
    },
    type: {
      type: DataTypes.ENUM('bug', 'feature', 'general', 'complaint', 'praise'),
      allowNull: false,
      defaultValue: 'general',
      comment: '피드백 유형'
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '제목'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '상세 내용'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '연락받을 이메일 (선택)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'reviewing', 'resolved', 'closed'),
      defaultValue: 'pending',
      comment: '처리 상태'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      comment: '우선순위'
    },
    adminResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'admin_response',
      comment: '관리자 답변'
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'responded_at',
      comment: '답변 시간'
    },
    respondedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'responded_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '답변한 관리자'
    }
  }, {
    tableName: 'feedbacks',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  Feedback.associate = (models) => {
    Feedback.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });

    Feedback.belongsTo(models.User, {
      foreignKey: 'respondedBy',
      as: 'responder'
    });
  };

  return Feedback;
};

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatReport = sequelize.define('ChatReport', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    messageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'chat_messages',
        key: 'id'
      },
      field: 'message_id',
      onDelete: 'CASCADE'
    },
    reportedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'reported_by',
      comment: '신고자 ID'
    },
    reportReason: {
      type: DataTypes.ENUM('SPAM', 'SCAM', 'HARASSMENT', 'PROFANITY', 'IMPERSONATION', 'OTHER'),
      allowNull: false,
      field: 'report_reason',
      comment: '신고 사유'
    },
    reasonDetail: {
      type: DataTypes.TEXT,
      field: 'reason_detail',
      comment: '상세 신고 내용'
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED'),
      defaultValue: 'PENDING',
      comment: '신고 처리 상태'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'reviewed_by',
      comment: '검토한 운영진 ID'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at',
      comment: '검토 일시'
    },
    actionTaken: {
      type: DataTypes.ENUM('MESSAGE_DELETED', 'USER_WARNED', 'USER_BANNED', 'NO_ACTION'),
      field: 'action_taken',
      comment: '취해진 조치'
    },
    actionNote: {
      type: DataTypes.TEXT,
      field: 'action_note',
      comment: '조치 메모'
    }
  }, {
    tableName: 'chat_reports',
    timestamps: true,
    indexes: [
      { fields: ['message_id'] },
      { fields: ['reported_by'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  });

  ChatReport.associate = (models) => {
    ChatReport.belongsTo(models.ChatMessage, {
      foreignKey: 'messageId',
      as: 'message'
    });

    ChatReport.belongsTo(models.User, {
      foreignKey: 'reportedBy',
      as: 'reporter'
    });

    ChatReport.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer'
    });
  };

  return ChatReport;
};

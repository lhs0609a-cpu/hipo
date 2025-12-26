const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SuspiciousActivity = sequelize.define('SuspiciousActivity', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id',
      comment: '의심 활동 유저 ID'
    },
    activityType: {
      type: DataTypes.ENUM(
        'ADMIN_POSITION_TRADING',
        'FINANCIAL_SCAM',
        'PHISHING_LINK',
        'MASS_SPAM',
        'COORDINATED_MANIPULATION',
        'SUSPICIOUS_TRADE_PATTERN',
        'OTHER'
      ),
      allowNull: false,
      field: 'activity_type',
      comment: '의심 활동 유형'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '의심 활동 설명'
    },
    relatedUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'related_user_id',
      comment: '연관된 유저 ID (예: 거래 상대방)'
    },
    relatedCommunityId: {
      type: DataTypes.UUID,
      references: {
        model: 'shareholder_communities',
        key: 'id'
      },
      field: 'related_community_id',
      comment: '연관된 커뮤니티 ID'
    },
    evidenceData: {
      type: DataTypes.JSON,
      field: 'evidence_data',
      comment: '증거 데이터 (메시지 내역, 거래 내역 등)'
    },
    detectionMethod: {
      type: DataTypes.ENUM('AI_FILTER', 'USER_REPORT', 'PATTERN_ANALYSIS', 'MANUAL_REVIEW'),
      defaultValue: 'AI_FILTER',
      field: 'detection_method',
      comment: '탐지 방법'
    },
    riskLevel: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      defaultValue: 'MEDIUM',
      field: 'risk_level',
      comment: '위험 등급'
    },
    status: {
      type: DataTypes.ENUM('DETECTED', 'UNDER_INVESTIGATION', 'CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED'),
      defaultValue: 'DETECTED',
      comment: '처리 상태'
    },
    investigatedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'investigated_by',
      comment: '조사한 운영진 ID'
    },
    investigationNote: {
      type: DataTypes.TEXT,
      field: 'investigation_note',
      comment: '조사 메모'
    },
    actionTaken: {
      type: DataTypes.TEXT,
      field: 'action_taken',
      comment: '취해진 조치'
    },
    resolvedAt: {
      type: DataTypes.DATE,
      field: 'resolved_at',
      comment: '해결 일시'
    }
  }, {
    tableName: 'suspicious_activities',
    timestamps: true,
    indexes: [
      { fields: ['user_id', 'activity_type'] },
      { fields: ['activity_type', 'status'] },
      { fields: ['risk_level', 'status'] },
      { fields: ['detection_method'] },
      { fields: ['created_at'] }
    ]
  });

  SuspiciousActivity.associate = (models) => {
    SuspiciousActivity.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'suspectedUser'
    });

    SuspiciousActivity.belongsTo(models.User, {
      foreignKey: 'relatedUserId',
      as: 'relatedUser'
    });

    SuspiciousActivity.belongsTo(models.ShareholderCommunity, {
      foreignKey: 'relatedCommunityId',
      as: 'relatedCommunity'
    });

    SuspiciousActivity.belongsTo(models.User, {
      foreignKey: 'investigatedBy',
      as: 'investigator'
    });
  };

  return SuspiciousActivity;
};

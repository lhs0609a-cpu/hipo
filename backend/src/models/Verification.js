const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Verification = sequelize.define('Verification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      comment: '인증 상태'
    },
    verificationType: {
      type: DataTypes.ENUM('celebrity', 'influencer', 'athlete', 'professional', 'business', 'other'),
      allowNull: false,
      field: 'verification_type',
      comment: '인증 유형'
    },
    realName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'real_name',
      comment: '실명'
    },
    occupation: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '직업/분야'
    },
    category: {
      type: DataTypes.STRING(50),
      comment: '카테고리'
    },
    proofDocuments: {
      type: DataTypes.TEXT,
      field: 'proof_documents',
      comment: '인증 서류 URL (JSON 배열)',
      get() {
        const value = this.getDataValue('proofDocuments');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('proofDocuments', JSON.stringify(value));
      }
    },
    socialLinks: {
      type: DataTypes.TEXT,
      field: 'social_links',
      comment: '소셜 미디어 링크 (JSON)',
      get() {
        const value = this.getDataValue('socialLinks');
        return value ? JSON.parse(value) : {};
      },
      set(value) {
        this.setDataValue('socialLinks', JSON.stringify(value));
      }
    },
    followerCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'follower_count',
      comment: '공개 플랫폼 팔로워 수'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '인증 요청 설명'
    },
    newsKeywords: {
      type: DataTypes.STRING(500),
      field: 'news_keywords',
      comment: '뉴스 검색용 키워드 제안'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      field: 'reviewed_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '검토한 관리자 ID'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at',
      comment: '검토 일시'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      field: 'rejection_reason',
      comment: '거부 사유'
    },
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'submitted_at',
      comment: '제출 일시'
    },
    autoVerificationScore: {
      type: DataTypes.INTEGER,
      field: 'auto_verification_score',
      comment: '자동 검증 점수 (0-100)'
    },
    autoVerificationResult: {
      type: DataTypes.TEXT,
      field: 'auto_verification_result',
      comment: '자동 검증 결과 (JSON)',
      get() {
        const value = this.getDataValue('autoVerificationResult');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('autoVerificationResult', JSON.stringify(value));
      }
    },
    autoVerificationDecision: {
      type: DataTypes.ENUM('auto_approved', 'auto_rejected', 'review_required', 'not_verified'),
      defaultValue: 'not_verified',
      field: 'auto_verification_decision',
      comment: '자동 검증 판정'
    }
  }, {
    tableName: 'verifications',
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['status'] },
      { fields: ['verification_type'] },
      { fields: ['reviewed_by'] }
    ]
  });

  Verification.associate = (models) => {
    Verification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    Verification.belongsTo(models.User, {
      foreignKey: 'reviewedBy',
      as: 'reviewer'
    });
  };

  return Verification;
};

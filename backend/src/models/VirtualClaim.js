const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VirtualClaim = sequelize.define('VirtualClaim', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    virtualUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'virtual_user_id',
      comment: '인수 대상 가상 계정 ID'
    },
    claimantUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'claimant_user_id',
      comment: '인수 요청자 (실제 유저) ID'
    },
    claimantEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'claimant_email',
      comment: '요청자 이메일'
    },
    claimantRealName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'claimant_real_name',
      comment: '요청자 실명'
    },
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'approved', 'rejected', 'cancelled'),
      defaultValue: 'pending',
      comment: '인수 요청 상태'
    },
    proofDocuments: {
      type: DataTypes.TEXT,
      field: 'proof_documents',
      comment: '인증 서류 URL (JSON 배열)'
    },
    socialLinks: {
      type: DataTypes.JSON,
      field: 'social_links',
      comment: '본인 소셜 링크'
    },
    verificationMethod: {
      type: DataTypes.ENUM('social_post', 'id_document', 'agency_letter', 'video_call', 'other'),
      field: 'verification_method',
      comment: '인증 방법'
    },
    verificationCode: {
      type: DataTypes.STRING(20),
      unique: true,
      field: 'verification_code',
      comment: 'SNS 인증 코드'
    },
    verificationCodeExpiresAt: {
      type: DataTypes.DATE,
      field: 'verification_code_expires_at',
      comment: '코드 만료 시간'
    },
    verificationNote: {
      type: DataTypes.TEXT,
      field: 'verification_note',
      comment: '인증 메모'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      field: 'reviewed_by',
      comment: '검토 관리자 ID'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at',
      comment: '검토 일시'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      field: 'rejection_reason',
      comment: '거절 사유'
    },
    adminNotes: {
      type: DataTypes.TEXT,
      field: 'admin_notes',
      comment: '관리자 메모'
    },
    mergedFromUserId: {
      type: DataTypes.UUID,
      field: 'merged_from_user_id',
      comment: '병합된 기존 계정 ID'
    },
    mergeDetails: {
      type: DataTypes.JSON,
      field: 'merge_details',
      comment: '병합 상세 내역 (이전된 Holdings, Transactions, PO 등)'
    },
    stockSnapshotAtClaim: {
      type: DataTypes.JSON,
      field: 'stock_snapshot_at_claim',
      comment: '인수 시점 주식 스냅샷'
    }
  }, {
    tableName: 'virtual_claims',
    underscored: true,
    indexes: [
      { fields: ['virtual_user_id'] },
      { fields: ['claimant_user_id'] },
      { fields: ['status'] },
      { fields: ['verification_code'], unique: true }
    ]
  });

  VirtualClaim.associate = (models) => {
    VirtualClaim.belongsTo(models.User, {
      foreignKey: 'virtualUserId',
      as: 'virtualUser'
    });
    VirtualClaim.belongsTo(models.User, {
      foreignKey: 'claimantUserId',
      as: 'claimant'
    });
  };

  return VirtualClaim;
};

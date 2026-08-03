const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CelebSuggestion = sequelize.define('CelebSuggestion', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    suggestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'suggested_by',
      comment: '추천한 유저 ID'
    },
    celebName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'celeb_name',
      comment: '셀럽 이름'
    },
    category: {
      type: DataTypes.ENUM('entertainment', 'sports', 'creator', 'influencer', 'other'),
      defaultValue: 'other',
      comment: '카테고리'
    },
    occupation: {
      type: DataTypes.STRING(100),
      comment: '직업'
    },
    reason: {
      type: DataTypes.TEXT,
      comment: '추천 이유'
    },
    socialLinks: {
      type: DataTypes.JSON,
      field: 'social_links',
      comment: '공식 SNS 링크'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'duplicate'),
      defaultValue: 'pending',
      comment: '추천 상태'
    },
    upvoteCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'upvote_count',
      comment: '상장을 기다리는 이용자 수 (중복 없이 1인 1표)'
    },
    upvoterIds: {
      type: DataTypes.JSON,
      defaultValue: [],
      field: 'upvoter_ids',
      comment: '기다린다고 표시한 유저 ID 목록 (중복 방지)'
    },
    /**
     * 기대지수 — 반드시 단조 증가한다.
     *
     * 이 값이 감소하면 "이 인물에 대한 기대가 떨어졌다"는 부정적 평가의 공표가 되어
     * 주가와 동일한 법적 리스크를 갖게 된다. 그래서 감소 경로를 아예 두지 않는다.
     * 갱신은 utils/publicityGuard.bumpExpectation 을 통해서만 한다.
     */
    expectationScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      field: 'expectation_score',
      comment: '기대지수 (누적, 감소 불가). 인물의 가치가 아니라 이용자 수요의 누적치'
    },
    expectationUpdatedAt: {
      type: DataTypes.DATE,
      field: 'expectation_updated_at',
      comment: '기대지수 최종 갱신 시각'
    },
    reviewedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
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
    createdVirtualUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'created_virtual_user_id',
      comment: '승인 후 생성된 가상 셀럽 ID'
    }
  }, {
    tableName: 'celeb_suggestions',
    underscored: true,
    indexes: [
      { fields: ['suggested_by'] },
      { fields: ['status'] },
      { fields: ['upvote_count'] },
      { fields: ['expectation_score'] },
      { fields: ['celeb_name'] }
    ]
  });

  CelebSuggestion.associate = (models) => {
    CelebSuggestion.belongsTo(models.User, {
      foreignKey: 'suggestedBy',
      as: 'suggester'
    });
    CelebSuggestion.belongsTo(models.User, {
      foreignKey: 'createdVirtualUserId',
      as: 'createdVirtualUser'
    });
  };

  return CelebSuggestion;
};

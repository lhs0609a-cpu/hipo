const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TradingCompetition = sequelize.define('TradingCompetition', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      comment: '대회 제목'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '대회 설명'
    },
    competitionType: {
      type: DataTypes.ENUM(
        'WEEKLY',           // 주간 대회
        'MONTHLY',          // 월간 대회
        'SEASONAL',         // 시즌 대회
        'SPECIAL'           // 특별 이벤트
      ),
      allowNull: false,
      field: 'competition_type',
      comment: '대회 유형'
    },
    rankingType: {
      type: DataTypes.ENUM(
        'PROFIT_RATE',      // 수익률 순위
        'TOTAL_PROFIT',     // 총 수익 순위
        'TRADE_COUNT',      // 거래 횟수
        'WIN_RATE'          // 승률
      ),
      allowNull: false,
      defaultValue: 'PROFIT_RATE',
      field: 'ranking_type',
      comment: '순위 산정 기준'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date',
      comment: '시작 일시'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'end_date',
      comment: '종료 일시'
    },
    registrationStartDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'registration_start_date',
      comment: '참가 신청 시작'
    },
    registrationEndDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'registration_end_date',
      comment: '참가 신청 마감'
    },
    initialCapital: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1000000,
      field: 'initial_capital',
      comment: '초기 자본 (가상 PO)'
    },
    entryFee: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'entry_fee',
      comment: '참가비 (PO 코인)'
    },
    maxParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'max_participants',
      comment: '최대 참가자 수'
    },
    prizePool: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'prize_pool',
      comment: '상금 풀 (PO 코인)'
    },
    prizeDistribution: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'prize_distribution',
      comment: '상금 분배 (JSON: {1: 50000, 2: 30000, 3: 20000})'
    },
    rules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: '대회 규칙 (JSON)'
    },
    participantCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'participant_count',
      comment: '참가자 수'
    },
    status: {
      type: DataTypes.ENUM(
        'UPCOMING',         // 예정
        'REGISTRATION',     // 참가 신청 중
        'ONGOING',          // 진행 중
        'COMPLETED',        // 완료
        'CANCELLED'         // 취소
      ),
      defaultValue: 'UPCOMING',
      comment: '대회 상태'
    },
    bannerImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'banner_image',
      comment: '배너 이미지 URL'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  }, {
    tableName: 'trading_competitions',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['status'] },
      { fields: ['competition_type'] },
      { fields: ['start_date'] },
      { fields: ['end_date'] }
    ]
  });

  TradingCompetition.associate = (models) => {
    // 참가자
    TradingCompetition.hasMany(models.CompetitionParticipant, {
      foreignKey: 'competitionId',
      as: 'participants'
    });

    // 대회 거래
    TradingCompetition.hasMany(models.CompetitionTrade, {
      foreignKey: 'competitionId',
      as: 'trades'
    });
  };

  return TradingCompetition;
};

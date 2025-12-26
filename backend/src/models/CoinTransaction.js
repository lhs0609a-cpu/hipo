const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CoinTransaction = sequelize.define('CoinTransaction', {
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
      field: 'user_id'
    },
    coinType: {
      type: DataTypes.ENUM('AC', 'PC'),
      allowNull: false,
      field: 'coin_type',
      comment: 'Activity Coin 또는 Premium Coin'
    },
    transactionType: {
      type: DataTypes.ENUM('EARN', 'SPEND', 'WITHDRAW', 'PURCHASE', 'REWARD', 'BONUS', 'REFUND'),
      allowNull: false,
      field: 'transaction_type',
      comment: '거래 유형'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment: '코인 수량 (음수 = 지출, 양수 = 획득)'
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'balance_after',
      comment: '거래 후 잔액'
    },
    source: {
      type: DataTypes.ENUM(
        'LOGIN',
        'POST_CREATE',
        'COMMENT_CREATE',
        'LIKE_RECEIVED',
        'SHARE',
        'DAILY_MISSION',
        'CONSECUTIVE_LOGIN',
        'STOCK_PURCHASE',
        'STOCK_SELL',
        'STOCK_DIVIDEND',
        'STOCK_PRICE_INCREASE',
        'REFERRAL_INVITE',
        'REFERRAL_ACTIVITY',
        'CONTENT_REACTION',
        'EARLY_INVESTMENT',
        'ADMIN_REWARD',
        'ATTENDANCE',
        'POLL_VOTE',
        'CREATOR_REVIEW',
        'SEASON_PASS',
        'MISSION_COMPLETE',
        'WITHDRAWAL',
        'PURCHASE_WITH_MONEY',
        'VIDEO_WATCH',
        'CHAT_MESSAGE',
        'OTHER'
      ),
      allowNull: false,
      comment: '코인 획득/사용 출처'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '거래 설명'
    },
    relatedId: {
      type: DataTypes.UUID,
      field: 'related_id',
      comment: '연관 엔티티 ID (게시물, 댓글, 주식 등)'
    },
    relatedType: {
      type: DataTypes.STRING,
      field: 'related_type',
      comment: '연관 엔티티 타입 (Post, Comment, Stock 등)'
    },
    metadata: {
      type: DataTypes.JSON,
      comment: '추가 메타데이터'
    }
  }, {
    tableName: 'coin_transactions',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['user_id', 'created_at'] },
      { fields: ['coin_type'] },
      { fields: ['transaction_type'] },
      { fields: ['source'] },
      { fields: ['related_id', 'related_type'] }
    ]
  });

  CoinTransaction.associate = (models) => {
    CoinTransaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return CoinTransaction;
};

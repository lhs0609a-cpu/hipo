const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    username: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    profileImage: {
      type: DataTypes.STRING(255),
      field: 'profile_image'
    },
    bio: {
      type: DataTypes.TEXT
    },
    marketCap: {
      type: DataTypes.INTEGER,
      defaultValue: 5000,
      field: 'market_cap'
    },
    trustLevel: {
      type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'),
      defaultValue: 'bronze',
      field: 'trust_level'
    },
    trustMultiplier: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.3,
      field: 'trust_multiplier'
    },
    poBalance: {
      type: DataTypes.INTEGER,
      defaultValue: 10000,
      field: 'po_balance'
    },
    balance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '지갑 잔액 (원) - 충전 가능한 캐시'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: 'last_login_at'
    },
    referralCode: {
      type: DataTypes.STRING(20),
      unique: true,
      field: 'referral_code',
      comment: '추천 코드'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified',
      comment: '주식 보유 인증 여부 (최소 3명 10주 이상 7일 보유)'
    },
    verifiedAt: {
      type: DataTypes.DATE,
      field: 'verified_at',
      comment: '인증 완료 일시'
    },
    botSuspicionScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'bot_suspicion_score',
      comment: '봇 의심 점수 (0-100, 70+ = 제재)'
    },
    displayName: {
      type: DataTypes.STRING(100),
      field: 'display_name',
      comment: '표시 이름'
    },
    isCreator: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_creator',
      comment: '상장인 여부'
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user',
      comment: '사용자 역할'
    },
    realName: {
      type: DataTypes.STRING(100),
      field: 'real_name',
      comment: '실제 이름 (뉴스 검색용)'
    },
    occupation: {
      type: DataTypes.STRING(100),
      comment: '직업 (예: 가수, 배우, 운동선수)'
    },
    category: {
      type: DataTypes.STRING(50),
      comment: '카테고리 (예: 연예인, 스포츠, 인플루언서)'
    },
    newsKeywords: {
      type: DataTypes.STRING(500),
      field: 'news_keywords',
      comment: '뉴스 검색용 키워드 (쉼표로 구분)'
    },
    pushToken: {
      type: DataTypes.STRING(255),
      field: 'push_token',
      comment: 'Expo 푸시 알림 토큰'
    },
    pushPlatform: {
      type: DataTypes.ENUM('ios', 'android', 'web'),
      field: 'push_platform',
      comment: '푸시 알림 플랫폼'
    },
    notificationSettings: {
      type: DataTypes.JSON,
      field: 'notification_settings',
      defaultValue: {
        trading: true,
        dividend: true,
        priceAlert: true,
        social: true,
        system: true
      },
      comment: '알림 설정 (JSON)'
    }
  }, {
    tableName: 'users',
    indexes: [
      { fields: ['email'] },
      { fields: ['username'] },
      { fields: ['trust_level'] },
      { fields: ['push_token'] }
    ]
  });

  User.associate = (models) => {
    // 발행한 주식
    User.hasOne(models.Stock, {
      foreignKey: 'userId',
      as: 'issuedStock'
    });

    // 보유한 주식들
    User.hasMany(models.Holding, {
      foreignKey: 'holderId',
      as: 'holdings'
    });

    // 매수 거래
    User.hasMany(models.Transaction, {
      foreignKey: 'buyerId',
      as: 'purchases'
    });

    // 매도 거래
    User.hasMany(models.Transaction, {
      foreignKey: 'sellerId',
      as: 'sales'
    });

    // 활동 내역
    User.hasMany(models.Activity, {
      foreignKey: 'userId',
      as: 'activities'
    });

    // 받은 배당
    User.hasMany(models.Dividend, {
      foreignKey: 'holderId',
      as: 'receivedDividends'
    });
  };

  return User;
};

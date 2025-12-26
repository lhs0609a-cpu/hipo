const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Merchandise = sequelize.define('Merchandise', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'creator_id',
      comment: '굿즈를 판매하는 크리에이터'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: '굿즈 이름'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '굿즈 설명'
    },
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url',
      comment: '굿즈 이미지 URL'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '가격'
    },
    totalStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_stock',
      comment: '전체 재고'
    },
    availableStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'available_stock',
      comment: '남은 재고'
    },
    merchandiseType: {
      type: DataTypes.ENUM('GENERAL', 'SIGNED', 'NUMBERED', 'LIMITED'),
      defaultValue: 'GENERAL',
      field: 'merchandise_type',
      comment: '굿즈 유형: 일반, 싸인본, 넘버링, 한정판'
    },
    minSharesRequired: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'min_shares_required',
      comment: '우선 구매를 위한 최소 주식 수'
    },
    shareholderOnly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'shareholder_only',
      comment: '주주 전용 굿즈 여부'
    },
    earlyAccessStartsAt: {
      type: DataTypes.DATE,
      field: 'early_access_starts_at',
      comment: '주주 우선 판매 시작 시간'
    },
    publicSaleStartsAt: {
      type: DataTypes.DATE,
      field: 'public_sale_starts_at',
      comment: '일반 판매 시작 시간'
    },
    salesEndsAt: {
      type: DataTypes.DATE,
      field: 'sales_ends_at',
      comment: '판매 종료 시간'
    },
    status: {
      type: DataTypes.ENUM('UPCOMING', 'EARLY_ACCESS', 'PUBLIC_SALE', 'SOLD_OUT', 'ENDED'),
      defaultValue: 'UPCOMING',
      comment: '판매 상태'
    }
  }, {
    tableName: 'merchandises',
    timestamps: true,
    indexes: [
      { fields: ['creator_id'] },
      { fields: ['status'] },
      { fields: ['merchandise_type'] },
      { fields: ['early_access_starts_at'] },
      { fields: ['public_sale_starts_at'] }
    ]
  });

  Merchandise.associate = (models) => {
    Merchandise.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });

    Merchandise.hasMany(models.MerchandiseOrder, {
      foreignKey: 'merchandiseId',
      as: 'orders'
    });
  };

  return Merchandise;
};

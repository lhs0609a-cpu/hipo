const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NFT = sequelize.define('NFT', {
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
      comment: 'NFT를 발행한 크리에이터'
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'owner_id',
      comment: '현재 NFT 소유자'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'NFT 이름'
    },
    description: {
      type: DataTypes.TEXT,
      comment: 'NFT 설명'
    },
    imageUrl: {
      type: DataTypes.STRING,
      field: 'image_url',
      comment: 'NFT 이미지 URL'
    },
    tokenId: {
      type: DataTypes.STRING,
      unique: true,
      field: 'token_id',
      comment: '고유 토큰 ID'
    },
    edition: {
      type: DataTypes.INTEGER,
      comment: '에디션 번호 (한정판)'
    },
    totalEditions: {
      type: DataTypes.INTEGER,
      field: 'total_editions',
      comment: '전체 에디션 수'
    },
    nftType: {
      type: DataTypes.ENUM('SHAREHOLDER_BADGE', 'LIMITED_EDITION', 'EARLY_INVESTOR', 'SPECIAL_EVENT', 'CUSTOM'),
      defaultValue: 'CUSTOM',
      field: 'nft_type',
      comment: 'NFT 타입: 주주 배지, 한정판, 초기 투자자, 특별 이벤트, 커스텀'
    },
    minSharesRequired: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'min_shares_required',
      comment: 'NFT 수령을 위한 최소 주식 수'
    },
    isTransferable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_transferable',
      comment: '재판매/전송 가능 여부'
    },
    metadata: {
      type: DataTypes.JSON,
      comment: '추가 메타데이터 (속성, 레어도 등)'
    },
    airdropDate: {
      type: DataTypes.DATE,
      field: 'airdrop_date',
      comment: '에어드랍 일시'
    }
  }, {
    tableName: 'nfts',
    timestamps: true,
    indexes: [
      { fields: ['creator_id'] },
      { fields: ['owner_id'] },
      { fields: ['nft_type'] },
      { fields: ['token_id'], unique: true }
    ]
  });

  NFT.associate = (models) => {
    NFT.belongsTo(models.User, {
      foreignKey: 'creatorId',
      as: 'creator'
    });

    NFT.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner'
    });

    NFT.hasMany(models.NFTTransfer, {
      foreignKey: 'nftId',
      as: 'transfers'
    });
  };

  return NFT;
};

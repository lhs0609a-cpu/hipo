const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NFTTransfer = sequelize.define('NFTTransfer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nftId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'nfts',
        key: 'id'
      },
      field: 'nft_id',
      onDelete: 'CASCADE'
    },
    fromUserId: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'from_user_id',
      comment: '이전 소유자 (null = 최초 발행)'
    },
    toUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'to_user_id',
      comment: '새 소유자'
    },
    transferType: {
      type: DataTypes.ENUM('AIRDROP', 'PURCHASE', 'TRANSFER', 'GIFT'),
      allowNull: false,
      field: 'transfer_type',
      comment: '전송 유형: 에어드랍, 구매, 전송, 선물'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      comment: '거래 가격 (구매 시)'
    }
  }, {
    tableName: 'nft_transfers',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['nft_id'] },
      { fields: ['from_user_id'] },
      { fields: ['to_user_id'] },
      { fields: ['transfer_type'] }
    ]
  });

  NFTTransfer.associate = (models) => {
    NFTTransfer.belongsTo(models.NFT, {
      foreignKey: 'nftId',
      as: 'nft'
    });

    NFTTransfer.belongsTo(models.User, {
      foreignKey: 'fromUserId',
      as: 'fromUser'
    });

    NFTTransfer.belongsTo(models.User, {
      foreignKey: 'toUserId',
      as: 'toUser'
    });
  };

  return NFTTransfer;
};

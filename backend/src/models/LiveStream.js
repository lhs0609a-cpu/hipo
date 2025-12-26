const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LiveStream = sequelize.define('LiveStream', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '라이브를 시작한 사용자'
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    streamKey: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '스트리밍 키 (RTMP 등)'
    },
    streamUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '스트리밍 URL'
    },
    status: {
      type: DataTypes.ENUM('scheduled', 'live', 'ended', 'cancelled'),
      defaultValue: 'scheduled'
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '예정 시간'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '실제 시작 시간'
    },
    endedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '종료 시간'
    },
    accessTier: {
      type: DataTypes.ENUM('PUBLIC', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'MAJOR_SHAREHOLDER'),
      defaultValue: 'PUBLIC',
      comment: '접근 권한 티어 (MAJOR_SHAREHOLDER = 대주주 1000주 이상)'
    },
    viewerCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '현재 시청자 수'
    },
    totalViews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '총 조회수'
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isRecorded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '녹화 여부'
    },
    recordingUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: '녹화 영상 URL'
    }
  }, {
    tableName: 'live_streams',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['scheduled_at']
      }
    ]
  });

  LiveStream.associate = (models) => {
    LiveStream.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'streamer'
    });
  };

  return LiveStream;
};

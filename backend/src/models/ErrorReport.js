const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ErrorReport = sequelize.define('ErrorReport', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: '오류 발생 사용자'
    },
    severity: {
      type: DataTypes.ENUM('critical', 'error', 'warning', 'info'),
      defaultValue: 'error',
      comment: '심각도'
    },
    type: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '오류 유형 (e.g. TypeError, NetworkError)'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '오류 메시지'
    },
    stack: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '스택 트레이스'
    },
    componentStack: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'component_stack',
      comment: 'React 컴포넌트 스택'
    },
    screenName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'screen_name',
      comment: '오류 발생 화면'
    },
    deviceInfo: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'device_info',
      comment: '기기 정보 (OS, 버전, 모델 등)'
    },
    appVersion: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'app_version',
      comment: '앱 버전'
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_resolved',
      comment: '해결 여부'
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at'
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'resolved_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '관리자 메모'
    }
  }, {
    tableName: 'error_reports',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['severity'] },
      { fields: ['type'] },
      { fields: ['is_resolved'] },
      { fields: ['created_at'] }
    ]
  });

  ErrorReport.associate = (models) => {
    ErrorReport.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    ErrorReport.belongsTo(models.User, {
      foreignKey: 'resolvedBy',
      as: 'resolver'
    });
  };

  return ErrorReport;
};

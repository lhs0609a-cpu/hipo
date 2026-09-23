const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LoginHistory = sequelize.define('LoginHistory', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    ipAddress: { type: DataTypes.STRING(64), field: 'ip_address' },
    userAgent: { type: DataTypes.STRING(500), field: 'user_agent' },
    successful: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    tableName: 'login_history',
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['user_id', 'created_at'] }],
  });

  LoginHistory.associate = (models) => {
    LoginHistory.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };
  return LoginHistory;
};

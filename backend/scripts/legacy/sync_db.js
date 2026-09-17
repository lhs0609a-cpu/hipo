const { sequelize } = require('./src/models');

async function syncDatabase() {
  try {
    console.log('🔄 Starting database synchronization...');

    // Sync all models with alter option to update existing tables
    await sequelize.sync({ alter: true });

    console.log('✅ Database synchronized successfully!');
    console.log('All tables have been updated to match the current models.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
    process.exit(1);
  }
}

syncDatabase();

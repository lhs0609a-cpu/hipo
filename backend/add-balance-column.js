const { sequelize } = require('./src/config/database');

async function addBalanceColumn() {
  try {
    // Add balance column to users table
    await sequelize.query('ALTER TABLE users ADD COLUMN balance INTEGER DEFAULT 0;');
    console.log('✅ Balance column added successfully');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('⚠️  Balance column already exists');
    } else {
      console.error('❌ Error adding balance column:', error.message);
    }
  } finally {
    await sequelize.close();
  }
}

addBalanceColumn();

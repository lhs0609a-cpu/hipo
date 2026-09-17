const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database_new.sqlite',
  logging: console.log
});

async function migrate() {
  try {
    console.log('🔄 Adding missing columns to posts table...');

    const queryInterface = sequelize.getQueryInterface();

    // Add is_premium column
    try {
      await queryInterface.addColumn('posts', 'is_premium', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
      console.log('✅ Added is_premium column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('⚠️  is_premium column already exists');
      } else {
        throw error;
      }
    }

    // Add visibility_type column
    try {
      await queryInterface.addColumn('posts', 'visibility_type', {
        type: DataTypes.STRING,
        defaultValue: 'PUBLIC'
      });
      console.log('✅ Added visibility_type column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('⚠️  visibility_type column already exists');
      } else {
        throw error;
      }
    }

    // Add minimum_shares column
    try {
      await queryInterface.addColumn('posts', 'minimum_shares', {
        type: DataTypes.INTEGER,
        defaultValue: 0
      });
      console.log('✅ Added minimum_shares column');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('⚠️  minimum_shares column already exists');
      } else {
        throw error;
      }
    }

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

migrate()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

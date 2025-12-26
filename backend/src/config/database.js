const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use PostgreSQL in production (Vercel), SQLite in development
const sequelize = process.env.POSTGRES_URL
  ? new Sequelize(process.env.POSTGRES_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database_new.sqlite',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: {
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    });

// Test connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to database:', error.message);
    // Don't exit in serverless environment
    if (process.env.VERCEL) {
      console.log('⚠️ Running in Vercel without database connection');
      return false;
    }
    process.exit(1);
  }
}

module.exports = { sequelize, testConnection };

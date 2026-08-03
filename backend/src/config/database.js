const { Sequelize } = require('sequelize');
require('dotenv').config();

// PostgreSQL URL (Supabase, Vercel, Railway 등)
const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// =====================================================
// 쿼리 로깅 설정 (보안 강화)
// =====================================================
// 민감한 테이블의 쿼리는 로깅에서 제외
const SENSITIVE_TABLES = ['users', 'refresh_tokens', 'wallets', 'wallet_transactions'];

const createSafeLogger = () => {
  if (process.env.NODE_ENV !== 'development' || process.env.DISABLE_QUERY_LOG === 'true') {
    return false;
  }

  return (sql) => {
    // 민감한 테이블 관련 쿼리는 로깅하지 않음
    const lowerSql = sql.toLowerCase();
    const isSensitive = SENSITIVE_TABLES.some(table => lowerSql.includes(table));

    if (isSensitive) {
      // 민감한 쿼리는 테이블명만 로깅
      const match = sql.match(/(?:FROM|INTO|UPDATE)\s+["`]?(\w+)["`]?/i);
      const tableName = match ? match[1] : 'unknown';
      console.log(`[DB] Query on sensitive table: ${tableName} (content hidden)`);
    } else {
      console.log(`[DB] ${sql}`);
    }
  };
};

// Use PostgreSQL in production, SQLite in development
const sequelize = postgresUrl
  ? new Sequelize(postgresUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      logging: createSafeLogger(),
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
      logging: createSafeLogger(),
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

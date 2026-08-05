const { Sequelize } = require('sequelize');
require('dotenv').config();

// PostgreSQL URL (Supabase, Vercel, Railway 등)
const postgresUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

/**
 * 전용 스키마.
 *
 * HIPO 는 테이블이 100개다. 이걸 public 에 그대로 쏟으면 같은 DB 를 쓰는 다른 앱과
 * 충돌한다. 실제로 users / products / orders / posts / comments / messages /
 * notifications / transactions / events / payments / likes / follows 12개가
 * 흔한 이름이라 정면으로 부딪힌다.
 *
 * 개발 모드의 sync({ alter: true }) 는 기존 테이블 구조를 HIPO 모델에 맞춰
 * 바꿔 버리므로, 격리하지 않으면 남의 데이터를 망가뜨린다.
 *
 * SQLite 는 스키마 개념이 없으므로 PostgreSQL 일 때만 적용한다.
 */
const DB_SCHEMA = (process.env.DB_SCHEMA || 'hipo').trim();
const usePostgres = Boolean(postgresUrl);

/** 모든 모델에 공통 적용되는 정의 */
const commonDefine = {
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  // PostgreSQL 에서만 스키마를 붙인다
  ...(usePostgres ? { schema: DB_SCHEMA } : {}),
};

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
      define: commonDefine
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database_new.sqlite',
      logging: createSafeLogger(),
      define: commonDefine
    });

/**
 * 스키마를 만든다. Sequelize 의 sync() 는 테이블만 만들고 스키마는 만들지 않으므로,
 * 동기화 전에 반드시 먼저 호출해야 한다.
 *
 * @returns {Promise<string|null>} 사용 중인 스키마 (SQLite 면 null)
 */
async function ensureSchema() {
  if (!usePostgres) return null;

  // 스키마명은 환경변수에서 오므로 식별자로 안전하게 인용한다
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(DB_SCHEMA)) {
    throw new Error(`유효하지 않은 DB_SCHEMA 이름입니다: ${DB_SCHEMA}`);
  }

  await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${DB_SCHEMA}"`);
  console.log(`🗂️  스키마 준비 완료: ${DB_SCHEMA}`);
  return DB_SCHEMA;
}

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

module.exports = { sequelize, testConnection, ensureSchema, DB_SCHEMA, usePostgres };

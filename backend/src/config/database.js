const { Sequelize } = require('sequelize');
require('dotenv').config();

// 모든 모델에 공통 적용되는 옵션.
//
// underscored: true 만으로 타임스탬프 컬럼은 created_at / updated_at 으로 매핑된다.
// 여기에 createdAt: 'created_at' 을 함께 주면 컬럼명이 아니라 **속성명 자체**가
// created_at 으로 바뀌어, 코드 전반이 쓰는 where: { createdAt: ... } 가
// 알 수 없는 키로 취급돼 "no such column: X.createdAt" 로 실패한다.
// (관리자 통계/차트, 배당 집계, 봇 탐지 등이 전부 여기에 걸려 있었다.)
const defineOptions = {
  timestamps: true,
  underscored: true
};

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
      define: defineOptions
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database_new.sqlite',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      define: defineOptions
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

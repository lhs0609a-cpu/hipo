#!/usr/bin/env node
/**
 * 스키마 동기화 CLI
 *
 *   npm run migrate            # alter 모드 (기본) — 누락 컬럼/테이블 추가
 *   npm run migrate -- --mode=sync   # 없는 테이블만 생성, 기존 테이블 손대지 않음
 *   npm run migrate -- --mode=force  # 전체 DROP 후 재생성 (데이터 전부 삭제)
 *
 * 이 프로젝트의 스키마 원본은 `src/models/*.js` 이고, 실제 반영은 Sequelize의
 * sync()가 담당한다. 별도 마이그레이션 파일 체계를 두면 모델 정의와 이중 관리가
 * 되므로 두지 않는다. 대신 "언제 sync가 도는지"를 명시적으로 만드는 것이 이 파일의 목적이다.
 *
 * 과거에는 server.js가 부팅할 때마다 무조건 sync({ alter: true })를 실행했다.
 * 모델 96개에 대해 운영 중 스키마를 건드리는 것은 위험하므로,
 * 지금은 DB_SYNC 환경변수로 제어하고(기본: 운영=none, 개발=alter) 이 CLI로 수동 실행한다.
 */

require('dotenv').config();

const { sequelize, testConnection } = require('./database');

const VALID_MODES = ['alter', 'sync', 'force'];

function parseMode(argv) {
  const arg = argv.find((a) => a.startsWith('--mode='));
  const mode = arg ? arg.split('=')[1] : 'alter';

  if (!VALID_MODES.includes(mode)) {
    console.error(`❌ 알 수 없는 모드: ${mode} (사용 가능: ${VALID_MODES.join(', ')})`);
    process.exit(1);
  }
  return mode;
}

async function migrate() {
  const mode = parseMode(process.argv.slice(2));
  const isProduction = process.env.NODE_ENV === 'production';

  if (mode === 'force') {
    if (isProduction && process.env.ALLOW_DESTRUCTIVE_MIGRATE !== 'yes') {
      console.error('❌ 운영 환경에서 force 모드는 막혀 있습니다.');
      console.error('   정말 전체 데이터를 삭제하려면 ALLOW_DESTRUCTIVE_MIGRATE=yes 를 함께 설정하세요.');
      process.exit(1);
    }
    console.warn('⚠️  force 모드: 모든 테이블을 DROP 후 재생성합니다 (데이터 전부 삭제)');
  }

  await testConnection();

  // sync()는 "그 시점까지 define된 모델"만 대상으로 한다. 반드시 먼저 등록할 것.
  const models = require('../models');
  const modelCount = Object.keys(models).length - 1; // sequelize 키 제외
  console.log(`🗂  모델 ${modelCount}개 등록됨`);

  const options =
    mode === 'force' ? { force: true } : mode === 'alter' ? { alter: true } : {};

  const startedAt = Date.now();
  await sequelize.sync(options);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  const [tables] = await sequelize.query(
    sequelize.getDialect() === 'sqlite'
      ? "SELECT count(*) AS count FROM sqlite_master WHERE type='table'"
      : "SELECT count(*) AS count FROM information_schema.tables WHERE table_schema = 'public'"
  );

  console.log(`✅ 스키마 동기화 완료 (${mode} 모드, ${elapsed}s) — 테이블 ${tables[0].count}개`);

  await sequelize.close();
}

migrate().catch((error) => {
  console.error('❌ 스키마 동기화 실패:', error.message);
  process.exit(1);
});

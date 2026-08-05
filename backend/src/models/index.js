const { sequelize, DB_SCHEMA, usePostgres } = require('../config/database');
const fs = require('fs');
const path = require('path');

const models = {};

// 모든 모델 파일 읽기
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== 'index.js' &&
      file.slice(-3) === '.js'
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize);
    models[model.name] = model;
  });

/**
 * 외래키 참조에 스키마를 붙인다.
 *
 * 모델들은 references 를 문자열로 쓴다 (115곳이 `model: 'users'` 형태).
 * 스키마를 지정하지 않던 시절에는 문제가 없었지만, 전용 스키마를 쓰면
 * 두 가지가 깨진다.
 *
 *  1. 참조 대상이 search_path(=public)에서 해석돼 엉뚱한 테이블을 가리킨다
 *  2. sync() 의 생성 순서 정렬이 깨진다. Sequelize 는 references 를 보고
 *     테이블 생성 순서를 정하는데, 문자열 'users' 와 스키마가 붙은
 *     { schema:'hipo', tableName:'users' } 를 같은 대상으로 보지 못한다.
 *     그래서 users 를 만들기 전에 users 를 참조하는 테이블을 먼저 만들려다
 *     relation "hipo.users" does not exist 로 기동이 실패했다.
 *
 * 참조를 { schema, tableName } 형태로 정규화해 둘 다 해결한다.
 */
if (usePostgres && DB_SCHEMA) {
  for (const model of Object.values(models)) {
    for (const attr of Object.values(model.rawAttributes || {})) {
      const ref = attr.references;
      if (ref && typeof ref.model === 'string') {
        ref.model = { tableName: ref.model, schema: DB_SCHEMA };
      }
    }
    // 정규화한 참조를 모델에 다시 반영한다
    model.refreshAttributes?.();
  }
}

// 모델 관계 설정
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// sequelize와 모델들을 export
module.exports = {
  sequelize,
  ...models
};

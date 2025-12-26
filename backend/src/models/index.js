const { sequelize } = require('../config/database');
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

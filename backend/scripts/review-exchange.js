// Isolated local smoke-test server. Never connects to an existing database.
process.env.NODE_ENV = 'test';
process.env.POSTGRES_URL = '';
process.env.DB_STORAGE = ':memory:';
process.env.JWT_SECRET = 'hipo-local-review-only';
const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const models = require('../src/models');

(async () => {
  if (models.sequelize.getDialect() !== 'sqlite' || models.sequelize.options.storage !== ':memory:') throw new Error('Review requires an in-memory database');
  await models.sequelize.sync({ force: true });
  const issuer = await models.User.create({ email: 'issuer@review.example', username: 'ReviewCreator', displayName: '리뷰 크리에이터', password: 'unused', poBalance: 0 });
  const buyer = await models.User.create({ email: 'buyer@review.example', username: 'ReviewBuyer', displayName: '리뷰 투자자', password: 'unused', poBalance: 10000 });
  const seller = await models.User.create({ email: 'seller@review.example', username: 'ReviewSeller', password: 'unused', poBalance: 0 });
  await models.Wallet.create({ userId: buyer.id, poBalance: 10000 });
  await models.Wallet.create({ userId: seller.id, poBalance: 0 });
  const stock = await models.Stock.create({ userId: issuer.id, sharePrice: 100, previousClose: 100, totalShares: 1000, issuedShares: 100, availableShares: 100 });
  await models.Holding.create({ holderId: seller.id, stockId: stock.id, shares: 100, averagePrice: 80 });
  await models.StockOrder.create({ engineVersion: 2, userId: seller.id, targetUserId: issuer.id, stockId: stock.id, orderType: 'SELL', orderMode: 'limit', quantity: 40, pricePerShare: 100, limitPrice: 100, totalAmount: 4000, isTriggered: true, status: 'PENDING', expiresAt: new Date(Date.now() + 86400000) });
  // The portable review install may not contain bcrypt's platform-native binary.
  // bcryptjs is API-compatible and is used only by this isolated in-memory server.
  const bcryptPath = require.resolve('bcrypt');
  require.cache[bcryptPath] = { id: bcryptPath, filename: bcryptPath, loaded: true, exports: require('bcryptjs'), children: [], paths: [] };
  const app = require('../server');
  const server = http.createServer(app);
  require('../src/config/socket').initSocket(server);
  const fixturePath = path.resolve(__dirname, '../../tmp/review-session.json');
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, JSON.stringify({ token: jwt.sign({ userId: buyer.id }, process.env.JWT_SECRET), user: { id: buyer.id, email: buyer.email, username: buyer.username, displayName: buyer.displayName, poBalance: 10000 }, stockId: stock.id }, null, 2));
  server.listen(5657, '127.0.0.1', () => console.log('Isolated exchange review: http://127.0.0.1:5657'));
})().catch(error => { console.error(error); process.exit(1); });

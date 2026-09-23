process.env.DB_STORAGE = ':memory:';
// Keep an explicit empty value so dotenv cannot load a production connection.
process.env.POSTGRES_URL = '';
jest.mock('../src/config/socket', () => ({ getIO: () => ({ emit: jest.fn(), to: () => ({ emit: jest.fn() }) }), sendDividendNotification: jest.fn() }));
const { sequelize, User, Stock, Holding, StockOrder, StockTrade, PriceHistory, Wallet } = require('../src/models');
const controller = require('../src/controllers/stockOrderController');
const matching = require('../src/services/orderMatchingService');
const { getOrderBook } = require('../src/services/orderBookService');

let issuer, buyer, seller, stock;
async function call(handler, user, body = {}, params = {}, query = {}) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  await handler({ user, body, params, query }, res);
  return res;
}
function submit(user, type, quantity, price, extra = {}) {
  return call(controller.createOrder, user, { stockId: stock.id, orderType: type, orderMode: 'limit', quantity, limitPrice: price, ...extra });
}
beforeAll(async () => {
  if (sequelize.getDialect() !== 'sqlite' || sequelize.options.storage !== ':memory:') throw new Error('Tests require an in-memory database');
  await sequelize.sync({ force: true });
});
beforeEach(async () => {
  for (const name of ['Notification', 'CoinTransaction', 'Withdrawal', 'Dividend', 'StockTransaction', 'IPOSubscription', 'IPOOffering', 'PreIPOInvestment', 'PreIPORound', 'WalletTransaction', 'Payment']) {
    await sequelize.models[name].destroy({ where: {} });
  }
  await StockTrade.destroy({ where: {} });
  await sequelize.models.StockAlertHistory.destroy({ where: {} });
  await sequelize.models.StockAlert.destroy({ where: {} });
  await sequelize.models.Watchlist.destroy({ where: {} });
  await sequelize.models.Transaction.destroy({ where: {} });
  await PriceHistory.destroy({ where: {} });
  await StockOrder.destroy({ where: {} });
  await Holding.destroy({ where: {} });
  await Stock.destroy({ where: {} });
  await Wallet.destroy({ where: {} });
  await User.destroy({ where: {} });
  issuer = await User.create({ email: 'issuer@example.com', username: 'issuer', password: 'test', poBalance: 0 });
  buyer = await User.create({ email: 'buyer@example.com', username: 'buyer', password: 'test', poBalance: 10000 });
  seller = await User.create({ email: 'seller@example.com', username: 'seller', password: 'test', poBalance: 0 });
  await Wallet.create({ userId: buyer.id, poBalance: 10000 });
  await Wallet.create({ userId: seller.id, poBalance: 0 });
  stock = await Stock.create({ userId: issuer.id, sharePrice: 100, previousClose: 100 });
  await Holding.create({ holderId: seller.id, stockId: stock.id, shares: 100, averagePrice: 80 });
});

test('PO spending cannot consume reserved funds and cash conversion cannot create unfunded PO', async () => {
  const wallet = require('../src/controllers/poWalletController');
  await buyer.update({ poBalance: 20000, balance: 500 });
  const bid = await submit(buyer, 'BUY', 150, 100);
  const bank = { amount: 10000, bankName: '은행', accountNumber: '12345', accountHolder: '사용자' };
  expect((await call(wallet.convertPOToCash, buyer, bank)).statusCode).toBe(400);
  expect((await call(wallet.chargePO, buyer, { amount: 501 })).statusCode).toBe(400);
  const charged = await call(wallet.chargePO, buyer, { amount: 500 });
  expect(charged.body.newBalance).toBe(20500);
  expect((await buyer.reload()).balance).toBe(0);
  await call(controller.cancelOrder, buyer, {}, { orderId: bid.body.order.id });
  const withdrawn = await call(wallet.convertPOToCash, buyer, bank);
  expect(withdrawn.statusCode).toBe(201);
  expect(withdrawn.body.newBalance).toBe(10500);
  expect(withdrawn.body.withdrawal.bankInfo.accountNumber).toBe('12345');
  expect(Number((await Wallet.findOne({ where: { userId: buyer.id } })).poBalance)).toBe(10500);
  expect((await call(wallet.processWithdrawal, buyer, { status: 'REJECTED' }, { withdrawalId: withdrawn.body.withdrawal.id })).statusCode).toBe(403);
  await issuer.update({ role: 'admin' });
  expect((await call(wallet.processWithdrawal, issuer, { status: 'REJECTED' }, { withdrawalId: withdrawn.body.withdrawal.id })).statusCode).toBe(200);
  expect((await buyer.reload()).poBalance).toBe(20500);
  const history = await call(require('../src/controllers/walletController').getPOHistory, buyer, {}, {}, { type: 'all' });
  expect(history.body.transactions.length).toBeGreaterThan(0);
  expect((await call(wallet.processWithdrawal, issuer, { status: 'REJECTED' }, { withdrawalId: withdrawn.body.withdrawal.id })).statusCode).toBe(400);
  expect((await buyer.reload()).poBalance).toBe(20500);
});

test('PO transfers preserve order reservations and update both account ledgers atomically', async () => {
  const wallet = require('../src/controllers/walletController');
  await submit(buyer, 'BUY', 90, 100);
  expect((await call(wallet.transferPO, buyer, { recipient: seller.username, amount: 1001 })).statusCode).toBe(400);

  const transferred = await call(wallet.transferPO, buyer, { recipient: seller.email, amount: 1000 });
  expect(transferred.statusCode).toBe(201);
  expect(transferred.body.balance).toBe(9000);
  expect((await buyer.reload()).poBalance).toBe(9000);
  expect((await seller.reload()).poBalance).toBe(1000);
  expect(Number((await Wallet.findOne({ where: { userId: buyer.id } })).poBalance)).toBe(9000);
  expect(Number((await Wallet.findOne({ where: { userId: seller.id } })).poBalance)).toBe(1000);
  expect(await sequelize.models.CoinTransaction.count({ where: { userId: buyer.id } })).toBe(1);
  expect(await sequelize.models.CoinTransaction.count({ where: { userId: seller.id } })).toBe(1);
});

test('IPO subscriptions respect open order reservations and cancellation refunds both balances once', async () => {
  const ipo = require('../src/services/ipoOfferingService');
  const offering = await sequelize.models.IPOOffering.create({ stockId: stock.id, userId: issuer.id, offeringPrice: 100,
    totalShares: 100, maxSubscriptionShares: 100, status: 'subscription', subscriptionStartAt: new Date(Date.now() - 1000), subscriptionEndAt: new Date(Date.now() + 60000) });
  const bid = await submit(buyer, 'BUY', 95, 100);
  await expect(ipo.subscribe(offering.id, buyer.id, 10)).rejects.toThrow('PO');
  await expect(ipo.subscribe(offering.id, buyer.id, -1)).rejects.toThrow();
  await call(controller.cancelOrder, buyer, {}, { orderId: bid.body.order.id });
  const subscribed = await ipo.subscribe(offering.id, buyer.id, 10);
  expect((await buyer.reload()).poBalance).toBe(9000);
  expect(subscribed.competitionRate).toBe('10.00');
  await ipo.cancelSubscription(subscribed.subscription.id, buyer.id);
  expect((await buyer.reload()).poBalance).toBe(10000);
  expect(Number((await Wallet.findOne({ where: { userId: buyer.id } })).poBalance)).toBe(10000);
  await expect(ipo.cancelSubscription(subscribed.subscription.id, buyer.id)).rejects.toThrow();
});

test('share transfers respect reservations and shareholder benefits read actual holdings', async () => {
  const transfer = require('../src/services/shareTransferService');
  const { getShareholding } = require('../src/utils/shareholderHelper');
  await submit(seller, 'SELL', 80, 100);
  await expect(transfer(seller.id, buyer.id, issuer.id, 21)).rejects.toThrow('예약');
  await transfer(seller.id, buyer.id, issuer.id, 20);
  expect(await getShareholding(buyer.id, issuer.id)).toBe(20);
  expect(await getShareholding(seller.id, issuer.id)).toBe(80);
  const history = await require('../src/services/shareholderHistoryService')(issuer.id, 1, 20);
  expect(history.transactions[0].transactionType).toBe('transfer');
  expect(history.transactions[0].buyer.id).toBe(buyer.id);
  expect(await Holding.sum('shares', { where: { stockId: stock.id } })).toBe(100);
  await expect(transfer(issuer.id, buyer.id, issuer.id, 1, true)).rejects.toThrow('발행');
});

test('issuer buyback settles seller cash and shares and creates real trade records', async () => {
  await issuer.update({ poBalance: 10000 });
  await stock.update({ issuedShares: 100, availableShares: 100 });
  await submit(seller, 'SELL', 10, 100);
  const result = await require('../src/services/buybackService')(issuer.id, 4, 100);
  expect(result.sharesBought).toBe(4);
  expect(result.totalSpent).toBe(400);
  expect(result.treasuryShares).toBe(4);
  expect((await seller.reload()).poBalance).toBe(400);
  expect((await issuer.reload()).poBalance).toBe(9600);
  expect(await Holding.sum('shares', { where: { stockId: stock.id } })).toBe(96);
  expect(await StockTrade.count()).toBe(1);
  expect((await getOrderBook(stock.id)).asks[0].quantity).toBe(6);
});

test('special dividends use available PO and synchronize recipient wallets', async () => {
  const dividend = require('../src/controllers/dividendController');
  await issuer.update({ poBalance: 1000 });
  const other = await Stock.create({ userId: buyer.id, sharePrice: 100, previousClose: 100 });
  const bid = await call(controller.createOrder, issuer, { stockId: other.id, orderType: 'BUY', orderMode: 'limit', quantity: 9, limitPrice: 100 });
  expect((await call(dividend.paySpecialDividend, issuer, { amount: 2 })).statusCode).toBe(400);
  await call(controller.cancelOrder, issuer, {}, { orderId: bid.body.order.id });
  expect((await call(dividend.paySpecialDividend, issuer, { amount: -1 })).statusCode).toBe(400);
  expect((await call(dividend.paySpecialDividend, issuer, { amount: 2 })).statusCode).toBe(200);
  expect((await issuer.reload()).poBalance).toBe(800);
  expect((await seller.reload()).poBalance).toBe(200);
  expect(Number((await Wallet.findOne({ where: { userId: seller.id } })).poBalance)).toBe(200);
});

test('legacy reconciliation requires evidence, excludes old orders and is idempotent', async () => {
  const migration = require('../src/services/exchangeMigration');
  const bid = await submit(buyer, 'BUY', 10, 100);
  await StockOrder.update({ engineVersion: 1 }, { where: { id: bid.body.order.id } });
  expect((await getOrderBook(stock.id)).bids).toEqual([]);
  await expect(migration.migrate()).rejects.toThrow('evidence');
  const resolutions = [{ orderId: bid.body.order.id, action: 'cancel', refundPO: 0, evidence: 'test: virtual reservation, no debit' }];
  expect((await migration.migrate(resolutions)).reconciledOrders).toBe(1);
  expect((await migration.migrate(resolutions)).reconciledOrders).toBe(0);
  expect((await buyer.reload()).poBalance).toBe(10000);
});

test('Pre-IPO funds settle once and lockup shares cannot be sold or transferred before expiry', async () => {
  const service = require('../src/services/preIPOService');
  const round = await sequelize.models.PreIPORound.create({ userId: issuer.id, pricePerShare: 100, totalShares: 100, remainingShares: 100,
    maxInvestmentShares: 100, eligibilityType: 'public', status: 'active', startAt: new Date(Date.now() - 1000), endAt: new Date(Date.now() + 60000), lockupDays: 30 });
  const bid = await submit(buyer, 'BUY', 95, 100);
  await expect(service.invest(round.id, buyer.id, 10)).rejects.toThrow('PO');
  await call(controller.cancelOrder, buyer, {}, { orderId: bid.body.order.id });
  await service.invest(round.id, buyer.id, 10);
  expect((await buyer.reload()).poBalance).toBe(9000);
  await service.convertToIPO(round.id, stock.id);
  expect((await issuer.reload()).poBalance).toBe(1000);
  expect((await submit(buyer, 'SELL', 1, 100)).statusCode).toBe(400);
  await expect(require('../src/services/shareTransferService')(buyer.id, seller.id, issuer.id, 1)).rejects.toThrow('예약');
  await expect(service.convertToIPO(round.id, stock.id)).rejects.toThrow();
  expect((await issuer.reload()).poBalance).toBe(1000);
  await sequelize.models.PreIPOInvestment.update({ lockupEndAt: new Date(Date.now() - 1000) }, { where: { roundId: round.id } });
  expect((await submit(buyer, 'SELL', 1, 100)).statusCode).toBe(200);
});

test('IPO allocation pays issuer, refunds excess, preserves average cost and cannot repeat', async () => {
  const ipo = require('../src/services/ipoOfferingService');
  const offering = await sequelize.models.IPOOffering.create({ stockId: stock.id, userId: issuer.id, offeringPrice: 100,
    totalShares: 5, maxSubscriptionShares: 20, status: 'subscription', minSuccessRate: 0,
    subscriptionStartAt: new Date(Date.now() - 1000), subscriptionEndAt: new Date(Date.now() + 60000) });
  await ipo.subscribe(offering.id, buyer.id, 10);
  await offering.update({ subscriptionEndAt: new Date(Date.now() - 1) });
  await ipo.processAllocation(offering.id);
  expect((await buyer.reload()).poBalance).toBe(9500);
  expect((await issuer.reload()).poBalance).toBe(500);
  const holding = await Holding.findOne({ where: { holderId: buyer.id, stockId: stock.id } });
  expect(holding.shares).toBe(5);
  expect(holding.averagePrice).toBe(100);
  await expect(ipo.processAllocation(offering.id)).rejects.toThrow();
});

test('cash payment confirmation credits once and PO conversion consumes that cash once', async () => {
  const express = require('express');
  const request = require('supertest');
  const jwt = require('jsonwebtoken');
  const app = express();
  app.use(express.json());
  app.use('/api/payment', require('../src/routes/payment'));
  const paymentService = require('../src/services/tossPaymentService');
  const confirmation = jest.spyOn(paymentService, 'confirmPayment').mockResolvedValue({ success: true, data: { method: '카드', status: 'DONE' } });
  const token = jwt.sign({ userId: buyer.id }, process.env.JWT_SECRET);
  try {
    const created = await request(app).post('/api/payment/charge/request').set('Authorization', `Bearer ${token}`).send({ amount: 1000 });
    expect(created.status).toBe(200);
    const payload = { orderId: created.body.orderId, paymentKey: 'test-confirmation', amount: 1000 };
    const paid = await request(app).post('/api/payment/charge/confirm').set('Authorization', `Bearer ${token}`).send(payload);
    expect(paid.status).toBe(200);
    expect((await buyer.reload()).balance).toBe(created.body.totalAmount);
    const duplicate = await request(app).post('/api/payment/charge/confirm').set('Authorization', `Bearer ${token}`).send(payload);
    expect(duplicate.status).toBe(400);
    expect(confirmation).toHaveBeenCalledTimes(1);
    const wallet = require('../src/controllers/poWalletController');
    expect((await call(wallet.chargePO, buyer, { amount: created.body.totalAmount })).statusCode).toBe(200);
    expect((await call(wallet.chargePO, buyer, { amount: 1 })).statusCode).toBe(400);
  } finally { confirmation.mockRestore(); }
});

test('concurrent PO spending and order reservation cannot use the same cash', async () => {
  const spend = async () => {
    const t = await require('../src/services/tradingTransaction')();
    try { await require('../src/services/poAccountService').changeBalance(buyer.id, -5000, t); await t.commit(); return true; }
    catch (error) { await t.rollback(); return false; }
  };
  const [spent, ordered] = await Promise.all([spend(), submit(buyer, 'BUY', 70, 100)]);
  expect(Number(spent) + Number(ordered.statusCode === 200)).toBe(1);
  const balance = await require('../src/services/poAccountService').account(buyer.id);
  expect(balance.availableBalance).toBeGreaterThanOrEqual(0);
});

test('activity dividends debit the issuer and credit real holdings without creating extra PO', async () => {
  await issuer.update({ poBalance: 1000 });
  await stock.update({ totalShares: 100, issuedShares: 100 });
  const result = await require('../src/utils/dividendCalculator').distributeDividends(issuer.id, 1000, 'POST_CREATE');
  expect(result.totalDividendPaid).toBeGreaterThan(0);
  expect((await issuer.reload()).poBalance + (await seller.reload()).poBalance).toBe(1000);
  expect(Number((await Wallet.findOne({ where: { userId: seller.id } })).poBalance)).toBe(result.totalDividendPaid);
  expect(await sequelize.models.Dividend.count()).toBe(1);
});

test('schema migration adds missing exchange columns without deleting users or holdings', async () => {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn('stock_orders', 'engine_version');
  for (const column of ['added_price', 'price_alert', 'alert_condition']) await qi.removeColumn('watchlist', column);
  await require('../src/services/exchangeMigration').migrate();
  expect((await qi.describeTable('stock_orders')).engine_version).toBeDefined();
  expect((await qi.describeTable('watchlist')).price_alert).toBeDefined();
  expect(await User.count()).toBe(3);
  expect(await Holding.sum('shares')).toBe(100);
  expect((await submit(buyer, 'BUY', 1, 100)).statusCode).toBe(200);
});
afterAll(async () => { await sequelize.close(); });

test('partial fills conserve balances and shares, update candles, and expose remaining depth', async () => {
  const ask = await submit(seller, 'SELL', 10, 100);
  expect(ask.statusCode).toBe(200);
  const bid = await submit(buyer, 'BUY', 4, 110);
  expect(bid.body.order.status).toBe('FILLED');
  expect(bid.body.order.averageFilledPrice).toBe(100);
  expect((await buyer.reload()).poBalance).toBe(9600);
  expect((await seller.reload()).poBalance).toBe(400);
  expect(Number((await Wallet.findOne({ where: { userId: buyer.id } })).poBalance)).toBe(9600);
  expect(Number((await Wallet.findOne({ where: { userId: seller.id } })).poBalance)).toBe(400);
  expect(await Holding.sum('shares', { where: { stockId: stock.id } })).toBe(100);
  expect((await getOrderBook(stock.id)).asks[0].quantity).toBe(6);
  expect(await PriceHistory.count()).toBe(5);
  const ledger = await call(require('../src/controllers/walletController').getPOHistory, buyer, {}, {}, { type: 'all' });
  expect(Number(ledger.body.transactions[0].amount)).toBe(-400);
  const detail = await call(controller.getOrderDetail, seller, {}, { orderId: ask.body.order.id });
  expect(detail.body.order.trades).toHaveLength(1);
});

test('open buy orders reserve buying power and cancellation releases it', async () => {
  const first = await submit(buyer, 'BUY', 90, 100);
  expect((await submit(buyer, 'BUY', 20, 100)).statusCode).toBe(400);
  expect((await call(controller.cancelOrder, buyer, {}, { orderId: first.body.order.id })).statusCode).toBe(200);
  expect((await submit(buyer, 'BUY', 20, 100)).statusCode).toBe(200);
});

test('simultaneous orders cannot reserve the same funds twice', async () => {
  const results = await Promise.all([submit(buyer, 'BUY', 70, 100), submit(buyer, 'BUY', 70, 100)]);
  expect(results.map(result => result.statusCode).sort()).toEqual([200, 400]);
});

test('open sell orders reserve shares', async () => {
  await submit(seller, 'SELL', 80, 100);
  expect((await submit(seller, 'SELL', 30, 100)).statusCode).toBe(400);
});

test('expired orders never execute or appear in depth', async () => {
  const ask = await submit(seller, 'SELL', 10, 100);
  await StockOrder.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: ask.body.order.id } });
  await submit(buyer, 'BUY', 10, 100);
  expect(await StockTrade.count()).toBe(0);
  expect((await getOrderBook(stock.id)).asks).toEqual([]);
  await matching.runMatchingCycle();
  expect((await StockOrder.findByPk(ask.body.order.id)).status).toBe('CANCELLED');
});

test('self trades cannot create volume or money', async () => {
  await buyer.update({ poBalance: 10000 });
  await Holding.create({ holderId: buyer.id, stockId: stock.id, shares: 10, averagePrice: 100 });
  await submit(buyer, 'SELL', 5, 100);
  await submit(buyer, 'BUY', 5, 100);
  expect(await StockTrade.count()).toBe(0);
  expect((await buyer.reload()).poBalance).toBe(10000);
});

test('market orders consume real liquidity and cancel unfilled remainder', async () => {
  await submit(seller, 'SELL', 3, 100);
  const result = await submit(buyer, 'BUY', 5, 110, { orderMode: 'market' });
  expect(result.body.order.filledQuantity).toBe(3);
  expect(result.body.order.status).toBe('CANCELLED');
  expect((await getOrderBook(stock.id)).bids).toHaveLength(0);
  expect((await buyer.reload()).poBalance).toBe(9700);
});

test('untriggered stop orders stay hidden and trigger into actual bids', async () => {
  const stop = await submit(seller, 'SELL', 5, 90, { orderMode: 'stop_loss', stopPrice: 90 });
  expect((await getOrderBook(stock.id)).asks).toHaveLength(0);
  await submit(buyer, 'BUY', 5, 85);
  await stock.update({ sharePrice: 85 });
  await matching.runMatchingCycle();
  const order = await StockOrder.findByPk(stop.body.order.id);
  expect(order.status).toBe('FILLED');
  expect(order.averageFilledPrice).toBe(85);
});

test.each([1.5, -1, '10', null, 0])('rejects invalid quantity %s', async quantity => {
  expect((await submit(buyer, 'BUY', quantity, 100)).statusCode).toBe(400);
});

test('suspended securities reject orders', async () => {
  await stock.update({ status: 'suspended' });
  expect((await submit(buyer, 'BUY', 1, 100)).statusCode).toBe(400);
});

test('only the owner can cancel or inspect a private order', async () => {
  const ask = await submit(seller, 'SELL', 10, 100);
  expect((await call(controller.cancelOrder, buyer, {}, { orderId: ask.body.order.id })).statusCode).toBe(404);
  expect((await call(controller.getOrderDetail, buyer, {}, { orderId: ask.body.order.id })).statusCode).toBe(404);
});

test('amend replaces remaining quantity and a rejected amendment preserves the original', async () => {
  const first = await submit(buyer, 'BUY', 10, 100);
  const rejected = await call(controller.amendOrder, buyer, { quantity: 200, limitPrice: 100 }, { orderId: first.body.order.id });
  expect(rejected.statusCode).toBe(400);
  expect((await StockOrder.findByPk(first.body.order.id)).status).toBe('PENDING');
  const amended = await call(controller.amendOrder, buyer, { quantity: 20, limitPrice: 90 }, { orderId: first.body.order.id });
  expect(amended.statusCode).toBe(200);
  expect(amended.body.order.id).not.toBe(first.body.order.id);
  expect((await getOrderBook(stock.id)).bids).toEqual([expect.objectContaining({ price: 90, quantity: 20 })]);
  const account = await call(controller.getTradingAccount, buyer, {}, { stockId: stock.id });
  expect(account.body.availableBalance).toBe(8200);
});

test('price priority consumes the cheaper ask first and reports exact total across prices', async () => {
  await submit(seller, 'SELL', 1, 101);
  await submit(seller, 'SELL', 2, 100);
  const result = await submit(buyer, 'BUY', 3, 110);
  expect(result.body.order.filledAmount).toBe(301);
  expect(Number(result.body.order.averageFilledPrice)).toBeCloseTo(301 / 3, 5);
  expect((await buyer.reload()).poBalance).toBe(9699);
  expect((await stock.reload()).sharePrice).toBe(101);
  expect(stock.dayVolume).toBe(3);
});

test('database failure rolls back cash, holdings, trades and order fills together', async () => {
  const ask = await submit(seller, 'SELL', 5, 100);
  const write = jest.spyOn(PriceHistory, 'create').mockRejectedValueOnce(new Error('simulated storage failure'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  await submit(buyer, 'BUY', 5, 100);
  write.mockRestore(); log.mockRestore();
  expect(await StockTrade.count()).toBe(0);
  expect((await buyer.reload()).poBalance).toBe(10000);
  expect((await seller.reload()).poBalance).toBe(0);
  expect((await StockOrder.findByPk(ask.body.order.id)).filledQuantity).toBe(0);
});

test('price limits and an active circuit breaker reject orders', async () => {
  expect((await submit(buyer, 'BUY', 1, 131)).statusCode).toBe(400);
  expect((await submit(seller, 'SELL', 1, 69)).statusCode).toBe(400);
  await stock.update({ circuitBreakerTriggered: true, circuitBreakerEndTime: new Date(Date.now() + 60000) });
  expect((await submit(buyer, 'BUY', 1, 100)).statusCode).toBe(400);
});

test('stop-limit can trigger above the target for a sell and retains its limit', async () => {
  const stop = await submit(seller, 'SELL', 5, 110, { orderMode: 'stop_limit', stopPrice: 105, triggerCondition: 'gte' });
  await stock.update({ sharePrice: 105 });
  await matching.runMatchingCycle();
  expect((await StockOrder.findByPk(stop.body.order.id)).isTriggered).toBe(true);
  expect((await getOrderBook(stock.id)).asks[0].price).toBe(110);
  expect(await StockTrade.count()).toBe(0);
});

test('HTTP market buy route returns actual filled quantity and both participants see their own trade side', async () => {
  const express = require('express');
  const request = require('supertest');
  const jwt = require('jsonwebtoken');
  const app = express();
  app.use(express.json());
  app.use('/api/stocks', require('../src/routes/stock'));
  app.use('/api/stock-market', require('../src/routes/stockMarket'));
  await submit(seller, 'SELL', 3, 100);
  const token = jwt.sign({ userId: buyer.id }, process.env.JWT_SECRET);
  const response = await request(app).post('/api/stocks/buy').set('Authorization', `Bearer ${token}`).send({ stockId: stock.id, shares: 5 });
  expect(response.status).toBe(200);
  expect(response.body.transaction).toEqual(expect.objectContaining({ shares: 3, totalCost: 300 }));
  const sellerToken = jwt.sign({ userId: seller.id }, process.env.JWT_SECRET);
  const history = await request(app).get('/api/stocks/me/transactions').set('Authorization', `Bearer ${sellerToken}`);
  expect(history.status).toBe(200);
  expect(history.body.transactions[0].transactionType).toBe('SELL');
  const overview = await request(app).get('/api/stock-market/overview');
  expect(overview.status).toBe(200);
  expect(overview.body.todayTrades).toBe(1);
  expect(overview.body.todayVolume).toBe(300);
});

test('watchlist alert creates an active monitored rule and preserves the reference price', async () => {
  const watchlist = require('../src/controllers/watchlistController');
  expect((await call(watchlist.addToWatchlist, buyer, { stockId: stock.id })).statusCode).toBe(200);
  const alert = await call(watchlist.setWatchlistAlert, buyer, { priceAlert: 110, alertCondition: 'gte' }, { stockId: stock.id });
  expect(alert.statusCode).toBe(200);
  const rule = await sequelize.models.StockAlert.findOne({ where: { userId: buyer.id } });
  expect(rule.alertType).toBe('PRICE_ABOVE');
  expect(rule.targetPrice).toBe(110);
  const items = await call(watchlist.getWatchlist, buyer);
  expect(items.body.watchlist[0].addedPrice).toBe(100);
});

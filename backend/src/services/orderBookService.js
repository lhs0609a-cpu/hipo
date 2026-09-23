const { Op } = require('sequelize');
const { StockOrder, Stock, Holding, PreIPOInvestment } = require('../models');
const { priceBounds, isTradable } = require('./marketRules');

const activeWhere = () => ({
  engineVersion: 2,
  status: { [Op.in]: ['PENDING', 'PARTIAL'] },
  [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }]
});

async function reservations(userId, stockId, transaction) {
  const orders = await StockOrder.findAll({ where: { userId, ...activeWhere() }, transaction });
  let lockedShares = 0;
  if (stockId) {
    const holding = await Holding.findOne({ where: { holderId: userId, stockId }, transaction });
    if (holding) lockedShares = Number(await PreIPOInvestment.sum('finalShares', { where: {
      userId, holdingId: holding.id, status: 'converted', lockupEndAt: { [Op.gt]: new Date() }
    }, transaction }) || 0);
  }
  return orders.reduce((result, order) => {
    const remaining = Math.max(0, order.quantity - order.filledQuantity);
    if (order.orderType === 'BUY' && order.stockId) result.cash += remaining * Number(order.limitPrice || order.pricePerShare);
    if (order.orderType === 'SELL' && order.stockId === stockId) result.shares += remaining;
    return result;
  }, { cash: 0, shares: lockedShares, lockedShares });
}

async function getOrderBook(stockId) {
  const stock = await Stock.findByPk(stockId);
  if (!stock) return null;
  const orders = await StockOrder.findAll({ where: {
    stockId, ...activeWhere(), isTriggered: true,
    orderMode: { [Op.in]: ['limit', 'stop_limit'] }
  } });
  const levels = { BUY: new Map(), SELL: new Map() };
  for (const order of orders) {
    const price = Number(order.limitPrice);
    const quantity = order.quantity - order.filledQuantity;
    if (!(price > 0 && quantity > 0)) continue;
    const level = levels[order.orderType].get(price) || { price, quantity: 0, orderCount: 0 };
    level.quantity += quantity;
    level.orderCount++;
    levels[order.orderType].set(price, level);
  }
  const bids = [...levels.BUY.values()].sort((a, b) => b.price - a.price).slice(0, 10);
  const asks = [...levels.SELL.values()].sort((a, b) => a.price - b.price).slice(0, 10);
  const maximum = Math.max(1, ...bids.concat(asks).map(level => level.quantity));
  for (const level of bids.concat(asks)) {
    level.percentage = level.quantity / maximum * 100;
    level.totalVolume = level.price * level.quantity;
  }
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const spread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;
  const bounds = await priceBounds(stock);
  return { bids, asks, bestBid, bestAsk, spread, ...bounds, tradable: isTradable(stock),
    spreadPercent: spread === null ? null : Number((spread / stock.sharePrice * 100).toFixed(2)),
    currentPrice: stock.sharePrice, priceChangePercent: Number(stock.priceChangePercent),
    totalBidQuantity: [...levels.BUY.values()].reduce((sum, level) => sum + level.quantity, 0),
    totalAskQuantity: [...levels.SELL.values()].reduce((sum, level) => sum + level.quantity, 0)
  };
}

module.exports = { activeWhere, reservations, getOrderBook };

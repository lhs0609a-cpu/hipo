const { Op } = require('sequelize');
const { PriceHistory } = require('../models');

function tradingDay(now = new Date()) {
  return new Date(Math.floor((now.getTime() + 9 * 3600000) / 86400000) * 86400000 - 9 * 3600000);
}
function isTradable(stock) {
  return stock && stock.status === 'active' && !(stock.circuitBreakerTriggered && stock.circuitBreakerEndTime && new Date(stock.circuitBreakerEndTime) > new Date());
}
async function priceBounds(stock, transaction) {
  const previous = await PriceHistory.findOne({ where: { stockId: stock.id, timeframe: '1d', timestamp: { [Op.lt]: tradingDay() } }, order: [['timestamp', 'DESC']], transaction });
  const referencePrice = Number(previous?.close || stock.previousClose || stock.sharePrice);
  const rate = Number(stock.dailyPriceLimit ?? 30) / 100;
  return { referencePrice, lowerLimit: Math.max(1, Math.ceil(referencePrice * (1 - rate))), upperLimit: Math.floor(referencePrice * (1 + rate)) };
}
module.exports = { tradingDay, isTradable, priceBounds };

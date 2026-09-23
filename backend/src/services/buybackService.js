const { Stock, StockOrder, Holding } = require('../models');
const { Op } = require('sequelize');
const tradingTransaction = require('./tradingTransaction');
const { activeWhere } = require('./orderBookService');
const { account, positiveAmount } = require('./poAccountService');
const { isTradable, priceBounds } = require('./marketRules');
const matching = require('./orderMatchingService');

module.exports = async function buyback(userId, quantity, maxPrice) {
  positiveAmount(quantity);
  const t = await tradingTransaction();
  try {
    const stock = await Stock.findOne({ where: { userId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!stock || !isTradable(stock)) throw new Error('매입 가능한 발행 종목이 없습니다');
    const price = maxPrice ?? stock.sharePrice;
    positiveAmount(price);
    positiveAmount(quantity * price);
    const bounds = await priceBounds(stock, t);
    if (price < bounds.lowerLimit || price > bounds.upperLimit) throw new Error('가격 제한 범위를 벗어났습니다');
    if ((await account(userId, t)).availableBalance < quantity * price) throw new Error('매입 가능한 PO가 부족합니다');
    const order = await StockOrder.create({ engineVersion: 2, userId, targetUserId: userId, stockId: stock.id, orderType: 'BUY', orderMode: 'market',
      quantity, limitPrice: price, pricePerShare: price, totalAmount: quantity * price, isTriggered: true }, { transaction: t });
    const sellers = await StockOrder.findAll({ where: { ...activeWhere(), stockId: stock.id, orderType: 'SELL', isTriggered: true,
      userId: { [Op.ne]: userId }, orderMode: { [Op.in]: ['limit', 'stop_limit'] }, limitPrice: { [Op.between]: [bounds.lowerLimit, price] } },
      order: [['limitPrice', 'ASC'], ['createdAt', 'ASC'], ['id', 'ASC']], transaction: t, lock: t.LOCK.UPDATE });
    let spent = 0;
    for (const sell of sellers) {
      const remaining = quantity - order.filledQuantity;
      if (remaining <= 0) break;
      const before = order.filledQuantity;
      await matching.executeMatch(order, sell, Math.min(remaining, sell.quantity - sell.filledQuantity), Number(sell.limitPrice), t);
      spent += (order.filledQuantity - before) * Number(sell.limitPrice);
    }
    const filled = order.filledQuantity;
    if (filled < quantity) await order.update({ status: 'CANCELLED', cancelledAt: new Date(), cancelReason: '자사주 매입 잔량 취소' }, { transaction: t });
    if (filled > 0) {
      const holding = await Holding.findOne({ where: { holderId: userId, stockId: stock.id }, transaction: t });
      if (holding.shares === filled) await holding.destroy({ transaction: t });
      else await holding.update({ shares: holding.shares - filled }, { transaction: t });
      await stock.reload({ transaction: t });
      await stock.update({ treasuryShares: Number(stock.treasuryShares || 0) + filled, issuedShares: Math.max(0, stock.issuedShares - filled),
        shareholderCount: await Holding.count({ where: { stockId: stock.id, shares: { [Op.gt]: 0 } }, transaction: t }),
        marketCapTotal: stock.sharePrice * Math.max(0, stock.issuedShares - filled),
        availableShares: Math.max(0, stock.availableShares - filled) }, { transaction: t });
    }
    await t.commit();
    return { sharesBought: filled, totalSpent: spent, averagePrice: filled ? spent / filled : 0, treasuryShares: stock.treasuryShares, orderId: order.id };
  } catch (error) { if (!t.finished) await t.rollback(); throw error; }
};

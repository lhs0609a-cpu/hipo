const { User, Stock, Holding, StockTransaction } = require('../models');
const { reservations } = require('./orderBookService');
const { positiveAmount } = require('./poAccountService');
const { isTradable } = require('./marketRules');
const tradingTransaction = require('./tradingTransaction');

module.exports = async function transferShares(fromUserId, toUserId, targetUserId, quantity, grant = false) {
  positiveAmount(quantity);
  if (fromUserId === toUserId) throw new Error('본인에게 양도할 수 없습니다');
  if (grant && fromUserId !== targetUserId) throw new Error('본인의 발행 주식만 부여할 수 있습니다');
  const t = await tradingTransaction();
  try {
    const stock = await Stock.findOne({ where: { userId: targetUserId }, transaction: t, lock: t.LOCK.UPDATE });
    if (!stock || !isTradable(stock)) throw new Error('양도 가능한 종목이 아닙니다');
    if (!await User.findByPk(toUserId, { transaction: t })) throw new Error('받는 사용자를 찾을 수 없습니다');
    let cost = 0;
    if (grant) {
      if (stock.availableShares - stock.issuedShares < quantity) throw new Error('발행 가능한 주식이 부족합니다');
      await stock.update({ issuedShares: stock.issuedShares + quantity }, { transaction: t });
    } else {
      const holding = await Holding.findOne({ where: { holderId: fromUserId, stockId: stock.id }, transaction: t });
      const reserved = await reservations(fromUserId, stock.id, t);
      if (!holding || holding.shares - reserved.shares < quantity) throw new Error('매도 예약분을 제외한 보유 주식이 부족합니다');
      cost = quantity * Number(holding.averagePrice || 0);
      if (holding.shares === quantity) await holding.destroy({ transaction: t });
      else await holding.update({ shares: holding.shares - quantity }, { transaction: t });
    }
    const [recipient, created] = await Holding.findOrCreate({ where: { holderId: toUserId, stockId: stock.id },
      defaults: { shares: quantity, averagePrice: Math.floor(cost / quantity) }, transaction: t });
    if (!created) await recipient.update({ shares: recipient.shares + quantity,
      averagePrice: Math.floor((Number(recipient.averagePrice || 0) * recipient.shares + cost) / (recipient.shares + quantity)) }, { transaction: t });
    await StockTransaction.create({ buyerId: toUserId, sellerId: fromUserId, stockId: stock.id, quantity,
      pricePerShare: 0, totalAmount: 0, transactionType: grant ? 'grant' : 'transfer' }, { transaction: t });
    await stock.update({ shareholderCount: await Holding.count({ where: { stockId: stock.id, shares: { [require('sequelize').Op.gt]: 0 } }, transaction: t }),
      marketCapTotal: stock.sharePrice * stock.issuedShares }, { transaction: t });
    await t.commit();
  } catch (error) { if (!t.finished) await t.rollback(); throw error; }
};

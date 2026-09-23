const { DataTypes, Op, QueryTypes } = require('sequelize');
const { sequelize, StockOrder, User, Wallet } = require('../models');
const tradingTransaction = require('./tradingTransaction');

// No inferred refunds: an operator supplies reconciled amounts and ledger references.
async function inspect() {
  const qi = sequelize.getQueryInterface();
  const columns = await qi.describeTable('stock_orders');
  const legacy = await sequelize.query(`SELECT id, user_id, order_type, quantity, filled_quantity, status FROM stock_orders
    WHERE status IN ('PENDING', 'PARTIAL')${columns.engine_version ? ' AND (engine_version IS NULL OR engine_version <> 2)' : ''}`, { type: QueryTypes.SELECT });
  return { dialect: sequelize.getDialect(), legacyOrders: legacy, requiresReconciliation: legacy.length > 0 };
}

async function migrate(resolutions = []) {
  const t = await tradingTransaction();
  try {
    const report = await inspect();
    const decisions = new Map(resolutions.map(item => [item.orderId, item]));
    for (const order of report.legacyOrders) {
      const decision = decisions.get(order.id);
      if (!decision || decision.action !== 'cancel' || !Number.isSafeInteger(decision.refundPO) || decision.refundPO < 0 ||
          !decision.evidence || decision.refundPO > 2147483647) {
        throw new Error(`기존 주문 ${order.id}: action=cancel, 확인된 refundPO, evidence가 필요합니다`);
      }
    }
    const qi = sequelize.getQueryInterface();
    const orders = await qi.describeTable('stock_orders', { transaction: t });
    if (!orders.engine_version) await qi.addColumn('stock_orders', 'engine_version', { type: DataTypes.INTEGER, allowNull: true }, { transaction: t });
    const watchlist = await qi.describeTable('watchlist', { transaction: t });
    for (const [name, definition] of Object.entries({
      added_price: { type: DataTypes.INTEGER, allowNull: true },
      price_alert: { type: DataTypes.INTEGER, allowNull: true },
      alert_condition: { type: DataTypes.STRING(3), defaultValue: 'gte' }
    })) if (!watchlist[name]) await qi.addColumn('watchlist', name, definition, { transaction: t });
    if (sequelize.getDialect() === 'postgres') {
      // SQLite already stores UUID text / fractional numbers without table rebuilds.
      await sequelize.query('ALTER TABLE price_histories ALTER COLUMN stock_id TYPE UUID USING stock_id::text::uuid', { transaction: t });
      await sequelize.query('ALTER TABLE stock_orders ALTER COLUMN average_filled_price TYPE DECIMAL(15,6)', { transaction: t });
      for (const table of ['payments', 'wallet_transactions']) {
        await sequelize.query(`ALTER TABLE ${table} ALTER COLUMN user_id TYPE UUID USING user_id::text::uuid`, { transaction: t });
      }
      await sequelize.query(`ALTER TYPE "enum_coin_transactions_coin_type" ADD VALUE IF NOT EXISTS 'PO'`, { transaction: t });
    }
    for (const old of report.legacyOrders) {
      const decision = decisions.get(old.id);
      const user = await User.findByPk(old.user_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (decision.refundPO > 0) {
        const balance = Number(user.poBalance) + decision.refundPO;
        if (balance > 2147483647) throw new Error('환불 후 잔액 한도 초과');
        await user.update({ poBalance: balance }, { transaction: t });
        const [wallet] = await Wallet.findOrCreate({ where: { userId: user.id }, defaults: { poBalance: balance }, transaction: t });
        await wallet.update({ poBalance: balance }, { transaction: t });
      }
      await StockOrder.update({ status: 'CANCELLED', cancelledAt: new Date(), engineVersion: 1,
        cancelReason: `원장 이관 환불 ${decision.refundPO} PO / ${decision.evidence}`.slice(0, 255) }, { where: { id: old.id }, transaction: t });
    }
    await t.commit();
    return { migrated: true, reconciledOrders: report.legacyOrders.length };
  } catch (error) { if (!t.finished) await t.rollback(); throw error; }
}
module.exports = { inspect, migrate };

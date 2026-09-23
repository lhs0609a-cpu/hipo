const { sequelize } = require('../models');

// SQLite has one writer. Serialize local trading transactions including timer cycles.
let tail = Promise.resolve();
module.exports = async function tradingTransaction() {
  let release;
  const previous = tail;
  tail = new Promise(resolve => { release = resolve; });
  await previous;
  try {
    const transaction = await sequelize.transaction();
    if (sequelize.getDialect() === 'postgres') {
      try {
        // One lock order across workers, orders, IPO subscriptions and PO spending.
        await sequelize.query('SELECT pg_advisory_xact_lock(731904221)', { transaction });
      } catch (error) { await transaction.rollback(); throw error; }
    }
    for (const method of ['commit', 'rollback']) {
      const original = transaction[method].bind(transaction);
      transaction[method] = async (...args) => {
        try { return await original(...args); } finally { release(); }
      };
    }
    return transaction;
  } catch (error) { release(); throw error; }
};

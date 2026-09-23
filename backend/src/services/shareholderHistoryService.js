const { sequelize, Stock, User } = require('../models');
const { QueryTypes, Op } = require('sequelize');

module.exports = async function history(targetUserId, page, limit) {
  const stock = await Stock.findOne({ where: { userId: targetUserId } });
  if (!stock) return { transactions: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  const source = `SELECT id, buyer_id, seller_id, stock_id, shares AS quantity, price_per_share, total_amount, transaction_type, created_at FROM transactions WHERE stock_id = :stockId
    UNION ALL SELECT id, buyer_id, seller_id, stock_id, quantity, price_per_share, total_amount, transaction_type, created_at FROM stock_transactions WHERE stock_id = :stockId AND transaction_type IN ('transfer', 'grant')`;
  const replacements = { stockId: stock.id, limit, offset: (page - 1) * limit };
  const [totals] = await sequelize.query(`SELECT COUNT(*) AS total FROM (${source}) AS history`, { replacements, type: QueryTypes.SELECT });
  const rows = await sequelize.query(`SELECT * FROM (${source}) AS history ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset`, { replacements, type: QueryTypes.SELECT });
  const ids = [...new Set(rows.flatMap(row => [row.buyer_id, row.seller_id]).filter(Boolean))];
  const users = await User.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'username', 'profileImage'] });
  const lookup = new Map(users.map(user => [user.id, user]));
  const transactions = rows.map(row => ({ id: row.id, stockId: row.stock_id, buyerId: row.buyer_id, sellerId: row.seller_id,
    buyer: lookup.get(row.buyer_id), seller: lookup.get(row.seller_id), quantity: row.quantity, pricePerShare: row.price_per_share,
    totalAmount: row.total_amount, transactionType: row.transaction_type, createdAt: row.created_at }));
  return { transactions, pagination: { page, limit, total: Number(totals.total), totalPages: Math.ceil(Number(totals.total) / limit) } };
};

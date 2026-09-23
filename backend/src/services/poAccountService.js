const { User, Wallet, CoinTransaction } = require('../models');
const { reservations } = require('./orderBookService');

function positiveAmount(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 2147483647) {
    const error = new Error('금액은 1 이상인 정수여야 합니다');
    error.status = 400;
    throw error;
  }
}

async function account(userId, transaction) {
  const user = await User.findByPk(userId, { transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) });
  if (!user) throw new Error('사용자를 찾을 수 없습니다');
  const reserved = await reservations(userId, null, transaction);
  return { user, reservedBalance: reserved.cash, availableBalance: Math.max(0, Number(user.poBalance) - reserved.cash) };
}

async function changeBalance(userId, delta, transaction, entry = {}) {
  if (!transaction) throw new Error('PO 변경에는 트랜잭션이 필요합니다');
  positiveAmount(Math.abs(delta));
  const { user, availableBalance } = await account(userId, transaction);
  if (delta < 0 && availableBalance < -delta) {
    const error = new Error('주문 예약금을 제외한 사용 가능 PO가 부족합니다');
    error.status = 400;
    error.available = availableBalance;
    throw error;
  }
  const balance = Number(user.poBalance) + delta;
  if (!Number.isSafeInteger(balance) || balance > 2147483647) throw new Error('잔액 한도를 초과합니다');
  await user.update({ poBalance: balance }, { transaction });
  const [wallet] = await Wallet.findOrCreate({ where: { userId }, defaults: { poBalance: balance }, transaction });
  await wallet.update({ poBalance: balance }, { transaction });
  if (entry.record !== false) await CoinTransaction.create({ userId, coinType: 'PO',
    transactionType: entry.transactionType || (delta < 0 ? 'SPEND' : 'EARN'), source: entry.source || 'OTHER',
    amount: delta, balanceAfter: balance, description: entry.description || (delta < 0 ? 'PO 사용' : 'PO 입금'), relatedId: entry.relatedId || null }, { transaction });
  return { user, wallet, balance };
}

module.exports = { account, changeBalance, positiveAmount };

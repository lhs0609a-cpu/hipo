const { User, Wallet, Withdrawal, CoinTransaction } = require('../models');
const tradingTransaction = require('../services/tradingTransaction');
const { account, changeBalance, positiveAmount } = require('../services/poAccountService');

const failure = (res, error) => res.status(error.status || 500).json({ error: error.message });
const invalid = message => Object.assign(new Error(message), { status: 400 });

exports.getWalletBalance = async (req, res) => {
  try {
    const { user, availableBalance, reservedBalance } = await account(req.user.id);
    const wallet = await Wallet.findOne({ where: { userId: user.id } });
    const balance = Number(user.poBalance);
    res.json({ balance, poBalance: balance, availableBalance, reservedBalance, cashBalance: user.balance || 0,
      wallet: { balance, poBalance: balance, availableBalance, reservedBalance,
        totalEarned: Number(wallet?.totalPOEarned || 0), totalWithdrawn: Number(wallet?.totalPOWithdrawn || 0) } });
  } catch (error) { failure(res, error); }
};

// Verified payment completion credits User.balance. Exchange that cash exactly once.
exports.chargePO = async (req, res) => {
  const t = await tradingTransaction();
  try {
    const { amount } = req.body;
    positiveAmount(amount);
    const { user } = await account(req.user.id, t);
    if (Number(user.balance || 0) < amount) throw invalid('결제 완료된 현금 잔액이 부족합니다. 먼저 충전해주세요');
    await user.update({ balance: Number(user.balance) - amount }, { transaction: t });
    const { balance } = await changeBalance(user.id, amount, t, { record: false });
    await CoinTransaction.create({ userId: user.id, coinType: 'PO', transactionType: 'PURCHASE', source: 'PURCHASE_WITH_MONEY',
      amount, balanceAfter: balance, description: '현금 잔액을 PO로 전환' }, { transaction: t });
    await t.commit();
    res.json({ message: 'PO 전환이 완료되었습니다', charged: amount, bonus: 0, total: amount, newBalance: balance, cashBalance: user.balance });
  } catch (error) { if (!t.finished) await t.rollback(); failure(res, error); }
};
exports.depositCoins = exports.chargePO;

exports.convertPOToCash = async (req, res) => {
  const t = await tradingTransaction();
  try {
    const { amount, bankName, accountNumber, accountHolder } = req.body;
    positiveAmount(amount);
    if (amount < 10000) throw invalid('최소 환전 금액은 10,000 PO입니다');
    if (![bankName, accountNumber, accountHolder].every(value => typeof value === 'string' && value.trim().length > 0 && value.length <= 100)) {
      throw invalid('은행명, 계좌번호, 예금주를 입력해주세요');
    }
    const { balance } = await changeBalance(req.user.id, -amount, t, { record: false });
    const fee = Math.floor(amount * 0.1);
    const withdrawal = await Withdrawal.create({ userId: req.user.id, amount, feePercentage: 10, feeAmount: fee,
      netAmount: amount - fee, bankInfo: { bankName, accountNumber, accountHolder, asset: 'PO' }, status: 'PENDING' }, { transaction: t });
    await CoinTransaction.create({ userId: req.user.id, coinType: 'PO', transactionType: 'WITHDRAW', source: 'WITHDRAWAL',
      amount: -amount, balanceAfter: balance, relatedId: withdrawal.id, description: 'PO 환전 신청' }, { transaction: t });
    await t.commit();
    res.status(201).json({ message: '환전 신청이 접수되었습니다', withdrawal, amount, fee, netAmount: amount - fee, newBalance: balance });
  } catch (error) { if (!t.finished) await t.rollback(); failure(res, error); }
};
exports.requestWithdrawal = exports.convertPOToCash;

exports.processWithdrawal = async (req, res) => {
  const admin = await User.findByPk(req.user.id);
  if (admin?.role !== 'admin') return res.status(403).json({ error: '관리자 권한이 필요합니다' });
  const t = await tradingTransaction();
  try {
    const { status, rejectionReason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) throw invalid('유효하지 않은 상태입니다');
    const withdrawal = await Withdrawal.findByPk(req.params.withdrawalId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!withdrawal || withdrawal.status !== 'PENDING') throw invalid('대기 중인 환전 신청을 찾을 수 없습니다');
    if (withdrawal.bankInfo?.asset !== 'PO') throw invalid('기존 환전 신청은 원장 확인 후 처리해야 합니다');
    if (status === 'REJECTED') {
      const { balance } = await changeBalance(withdrawal.userId, Number(withdrawal.amount), t, { record: false });
      await CoinTransaction.create({ userId: withdrawal.userId, coinType: 'PO', transactionType: 'REFUND', source: 'WITHDRAWAL',
        amount: Number(withdrawal.amount), balanceAfter: balance, relatedId: withdrawal.id, description: '환전 거절 환불' }, { transaction: t });
    } else {
      await Wallet.increment('totalPOWithdrawn', { by: Number(withdrawal.amount), where: { userId: withdrawal.userId }, transaction: t });
    }
    await withdrawal.update({ status, rejectionReason: status === 'REJECTED' ? rejectionReason || '관리자 거절' : null, processedAt: new Date() }, { transaction: t });
    await t.commit();
    res.json({ message: status === 'APPROVED' ? '환전이 승인되었습니다' : '환전 신청이 거절되고 PO가 반환되었습니다', withdrawal });
  } catch (error) { if (!t.finished) await t.rollback(); failure(res, error); }
};

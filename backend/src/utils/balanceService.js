/**
 * 잔고 관리 유틸리티
 * User.poBalance와 Wallet.poBalance를 항상 함께 업데이트하여 불일치를 방지
 */

const { User, Wallet } = require('../models');

/**
 * 사용자의 PO 잔고를 업데이트한다 (User + Wallet 동시)
 *
 * @param {string} userId - 사용자 UUID
 * @param {number} amount - 변경 금액 (양수=입금, 음수=출금)
 * @param {object} options
 * @param {object} options.transaction - Sequelize 트랜잭션 (필수 권장)
 * @param {object} [options.walletFields] - Wallet에 추가로 업데이트할 필드 (예: { totalPOSpent: 100 })
 * @returns {{ user: object, wallet: object|null, newBalance: number }}
 */
async function updateBalance(userId, amount, { transaction, walletFields = {} } = {}) {
  // User 조회 및 업데이트
  const user = await User.findByPk(userId, { transaction });
  if (!user) {
    throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
  }

  const newBalance = user.poBalance + amount;
  if (newBalance < 0) {
    throw new Error(`PO가 부족합니다. 현재: ${user.poBalance}, 필요: ${Math.abs(amount)}`);
  }

  await user.update({ poBalance: newBalance }, { transaction });

  // Wallet 조회 및 업데이트
  const wallet = await Wallet.findOne({
    where: { userId },
    transaction
  });

  if (wallet) {
    const walletUpdate = {
      poBalance: parseFloat(wallet.poBalance) + amount,
      ...walletFields
    };

    // walletFields 내 숫자 필드는 기존 값에 더하기 (increment 방식)
    for (const [key, val] of Object.entries(walletFields)) {
      if (typeof val === 'number' && wallet[key] !== undefined) {
        walletUpdate[key] = parseFloat(wallet[key] || 0) + val;
      }
    }

    await wallet.update(walletUpdate, { transaction });
  }

  return { user, wallet, newBalance };
}

module.exports = { updateBalance };

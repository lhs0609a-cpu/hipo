#!/usr/bin/env node
/**
 * 환매 준비 포인트 백필.
 *
 * 환매 풀 도입 이전에 발행된 종목들은 buybackReserve 가 0 이라, 그대로 두면
 * 기존 주주가 매도를 못 한다(있던 기능이 사라진 것처럼 보인다).
 *
 * 여기서는 이미 발행된 물량에 대해 "그때 적립됐어야 할 만큼"을 소급 적립한다.
 *
 *   준비 포인트 = 발행주식수 × 현재가 × BUYBACK_RESERVE_RATE
 *
 * ⚠️ 이 포인트는 게임 내 카운터다. 실제 자금을 옮기는 작업이 아니며,
 *    누구의 잔고도 차감하지 않는다. 과거 매도로 이미 발행된 PO 를
 *    회수하지도 않는다(그건 유저 잔고를 건드리는 일이라 별도 판단이 필요).
 *
 *   node scripts/backfillBuybackReserve.js            # 미리보기
 *   node scripts/backfillBuybackReserve.js --write    # 적용
 *   node scripts/backfillBuybackReserve.js --write --rate=0.7
 */

require('dotenv').config();

const { sequelize } = require('../src/config/database');
const { Stock, User } = require('../src/models');
const { BUYBACK_RESERVE_RATE } = require('../src/config/pointEconomy');

const WRITE = process.argv.includes('--write');
const rateArg = process.argv.find((a) => a.startsWith('--rate='));
const RATE = rateArg ? parseFloat(rateArg.split('=')[1]) : BUYBACK_RESERVE_RATE;

if (!Number.isFinite(RATE) || RATE < 0 || RATE > 1) {
  console.error('--rate 는 0~1 사이여야 합니다');
  process.exit(1);
}

async function main() {
  await sequelize.authenticate();

  const stocks = await Stock.findAll({
    include: [{ model: User, as: 'issuer', attributes: ['username', 'displayName'] }],
  });

  const rows = [];
  let totalToFund = 0;

  for (const stock of stocks) {
    const issued = parseInt(stock.issuedShares, 10) || 0;
    const price = parseFloat(stock.sharePrice) || 0;
    const current = Number(stock.buybackReserve) || 0;

    if (issued <= 0 || price <= 0) continue;

    const target = Math.floor(issued * price * RATE);
    const delta = target - current;
    if (delta <= 0) continue;

    rows.push({
      stockId: stock.id,
      name: stock.issuer?.displayName || stock.issuer?.username || stock.id.slice(0, 8),
      issued,
      price,
      current,
      target,
      delta,
    });
    totalToFund += delta;

    if (WRITE) {
      await stock.increment(
        { buybackReserve: delta, buybackReserveFunded: delta },
        {}
      );
    }
  }

  console.log('');
  console.log(WRITE ? '=== 적용 완료 ===' : '=== 미리보기 (변경 없음) ===');
  console.log(`적립 비율          : ${(RATE * 100).toFixed(0)}%`);
  console.log(`대상 종목          : ${rows.length} / 전체 ${stocks.length}`);
  console.log(`적립할 총 포인트   : ${totalToFund.toLocaleString()} PO`);
  console.log('');

  for (const r of rows.sort((a, b) => b.delta - a.delta).slice(0, 20)) {
    console.log(
      `  ${r.name.padEnd(16)} 발행 ${String(r.issued).padStart(7)}주 × ${String(r.price).padStart(6)} ` +
      `→ 준비금 ${r.current.toLocaleString()} → ${r.target.toLocaleString()} (+${r.delta.toLocaleString()})`
    );
  }
  if (rows.length > 20) console.log(`  … 외 ${rows.length - 20}종목`);

  if (!WRITE) {
    console.log('');
    console.log('적용하려면: node scripts/backfillBuybackReserve.js --write');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error('백필 실패:', err);
  process.exit(1);
});

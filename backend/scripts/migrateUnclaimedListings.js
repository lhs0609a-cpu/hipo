#!/usr/bin/env node
/**
 * 동의 전 인물 데이터 정리 마이그레이션.
 *
 * 구버전 플로우는 본인 동의 없이 다음을 만들었다.
 *   - 가격이 붙은 종목 (Stock.sharePrice)
 *   - 조작된 90일치 시세 이력 (PriceHistory)
 *   - 실명 / 사진 / SNS 링크
 *   - 시가총액 (User.marketCap)
 *
 * 이 스크립트는 아직 본인 확인이 끝나지 않은(virtualStatus !== 'claimed') 프로필에 대해
 * 위 항목을 제거하거나 비공개 처리한다.
 *
 * 주주가 이미 존재하는 종목은 삭제하지 않는다. 보유 기록을 지우면 유저 자산이
 * 사라지기 때문이다. 대신 거래를 막고 비공개(delisted)로 돌린 뒤 수동 처리 대상으로 보고한다.
 *
 *   node scripts/migrateUnclaimedListings.js            # 미리보기 (변경 없음)
 *   node scripts/migrateUnclaimedListings.js --write    # 실제 적용
 */

require('dotenv').config();

const { sequelize } = require('../src/config/database');
const { User, Stock, Holding, PriceHistory } = require('../src/models');

const WRITE = process.argv.includes('--write');

async function main() {
  await sequelize.authenticate();

  const unclaimed = await User.findAll({
    where: { isVirtual: true },
    include: [{ model: Stock, as: 'issuedStock', required: false }],
  });

  const targets = unclaimed.filter((u) => u.virtualStatus !== 'claimed');

  const report = {
    profilesScanned: targets.length,
    identityCleared: 0,
    marketCapCleared: 0,
    stocksDeleted: 0,
    stocksSuspended: [],
    priceHistoryDeleted: 0,
  };

  for (const user of targets) {
    const stock = user.issuedStock;

    // ── 1. 신원·초상 정보 제거
    const identityPatch = {};
    if (user.profileImage) identityPatch.profileImage = null;
    if (user.realName) identityPatch.realName = null;
    if (user.newsKeywords) identityPatch.newsKeywords = null;
    if (user.externalLinks) identityPatch.externalLinks = null;
    if (Object.keys(identityPatch).length) {
      if (WRITE) await user.update(identityPatch);
      report.identityCleared += 1;
    }

    // ── 2. 시가총액 제거 (동의 전에는 값을 매기지 않는다)
    if (user.marketCap && Number(user.marketCap) !== 0) {
      if (WRITE) await user.update({ marketCap: 0 });
      report.marketCapCleared += 1;
    }

    if (!stock) continue;

    // ── 3. 조작된 시세 이력 삭제
    const historyCount = await PriceHistory.count({ where: { stockId: stock.id } });
    if (historyCount > 0) {
      if (WRITE) await PriceHistory.destroy({ where: { stockId: stock.id } });
      report.priceHistoryDeleted += historyCount;
    }

    // ── 4. 종목 처리 — 주주가 있으면 지우지 않는다
    const holderCount = await Holding.count({ where: { stockId: stock.id } });

    if (holderCount === 0) {
      if (WRITE) await stock.destroy();
      report.stocksDeleted += 1;
    } else {
      if (WRITE) {
        await stock.update({
          status: 'delisted',
          isVirtualListing: true, // 거래 가드에 확실히 걸리도록
        });
      }
      report.stocksSuspended.push({
        userId: user.id,
        displayName: user.displayName,
        stockId: stock.id,
        holderCount,
        sharePrice: stock.sharePrice,
      });
    }
  }

  console.log('');
  console.log(WRITE ? '=== 적용 완료 ===' : '=== 미리보기 (변경 없음) ===');
  console.log(`검사한 동의 전 프로필      : ${report.profilesScanned}`);
  console.log(`신원·사진 정보 제거        : ${report.identityCleared}`);
  console.log(`시가총액 초기화            : ${report.marketCapCleared}`);
  console.log(`삭제한 종목 (주주 없음)    : ${report.stocksDeleted}`);
  console.log(`삭제한 시세 이력 레코드    : ${report.priceHistoryDeleted}`);
  console.log(`거래중단 처리 (주주 있음)  : ${report.stocksSuspended.length}`);

  if (report.stocksSuspended.length) {
    console.log('');
    console.log('⚠️  아래 종목은 이미 주주가 있어 자동 삭제하지 않았습니다.');
    console.log('   거래는 중단시켰지만, 보유분 환불/정산 방침은 별도 결정이 필요합니다.');
    console.log('');
    for (const s of report.stocksSuspended) {
      console.log(`   · ${s.displayName} (주주 ${s.holderCount}명, 최종가 ${s.sharePrice}) stockId=${s.stockId}`);
    }
  }

  if (!WRITE) {
    console.log('');
    console.log('실제로 적용하려면: node scripts/migrateUnclaimedListings.js --write');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error('마이그레이션 실패:', err);
  process.exit(1);
});

/**
 * 티어 자동 업데이트 스케줄러
 *
 * - 매 시간마다 전체 주식 티어 점수 재계산
 * - 승급/강등 처리
 * - 티어 변동 알림 발송
 */

const tierService = require('../services/tierService');
const { Stock, User, Notification } = require('../models');
const { Op } = require('sequelize');

let isRunning = false;

/**
 * 전체 주식 티어 업데이트 실행
 */
async function runTierUpdate() {
  if (isRunning) {
    console.log('⚠️ 티어 업데이트가 이미 실행 중입니다.');
    return;
  }

  isRunning = true;

  try {
    console.log('🔄 티어 자동 업데이트 시작...');
    const startTime = Date.now();

    const results = await tierService.updateAllTiers({ batchSize: 50 });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ 티어 자동 업데이트 완료 (${duration}초)`);
    console.log(`   총 처리: ${results.total}개`);
    console.log(`   업데이트: ${results.updated}개`);
    console.log(`   승급: ${results.upgraded}개`);
    console.log(`   강등: ${results.downgraded}개`);
    console.log(`   유지: ${results.unchanged}개`);
    console.log(`   오류: ${results.errors}개`);

    // 티어 변동이 있는 경우 알림 발송
    if (results.upgraded > 0 || results.downgraded > 0) {
      await sendTierChangeNotifications();
    }

    return results;
  } catch (error) {
    console.error('❌ 티어 자동 업데이트 오류:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * 티어 변동 알림 발송
 */
async function sendTierChangeNotifications() {
  try {
    // 최근 1시간 이내에 티어가 변경된 주식 조회
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const changedStocks = await Stock.findAll({
      where: {
        tierUpdatedAt: { [Op.gte]: oneHourAgo }
      },
      include: [
        { model: User, as: 'issuer', attributes: ['id', 'displayName'] }
      ]
    });

    for (const stock of changedStocks) {
      const tierInfo = tierService.getTierInfo(stock.tier);

      // 발행자에게 알림
      await Notification.create({
        userId: stock.userId,
        type: 'tier_change',
        title: `${tierInfo.icon} 티어 변경!`,
        message: `축하합니다! 티어가 ${tierInfo.displayName}(으)로 변경되었습니다.`,
        data: {
          stockId: stock.id,
          newTier: stock.tier,
          tierScore: stock.tierScore
        }
      });
    }

    console.log(`📨 ${changedStocks.length}개의 티어 변경 알림 발송 완료`);
  } catch (error) {
    console.error('티어 변경 알림 발송 오류:', error);
  }
}

/**
 * 거래량 통계 업데이트 (매일 자정)
 */
async function updateVolumeStatistics() {
  try {
    console.log('📊 거래량 통계 업데이트 시작...');

    const { Transaction, sequelize } = require('../models');

    // 7일 전, 30일 전 기준일
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 주간 거래량 업데이트
    const weeklyVolumes = await Transaction.findAll({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      attributes: [
        'stockId',
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'volume']
      ],
      group: ['stockId'],
      raw: true
    });

    for (const item of weeklyVolumes) {
      await Stock.update(
        { weeklyVolume: parseInt(item.volume) || 0 },
        { where: { id: item.stockId } }
      );
    }

    // 월간 거래량 업데이트
    const monthlyVolumes = await Transaction.findAll({
      where: { createdAt: { [Op.gte]: thirtyDaysAgo } },
      attributes: [
        'stockId',
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'volume']
      ],
      group: ['stockId'],
      raw: true
    });

    for (const item of monthlyVolumes) {
      await Stock.update(
        { monthlyVolume: parseInt(item.volume) || 0 },
        { where: { id: item.stockId } }
      );
    }

    // 평균 일일 거래량 계산 (30일 기준)
    for (const item of monthlyVolumes) {
      const avgDailyVolume = Math.floor((parseInt(item.volume) || 0) / 30);
      await Stock.update(
        { averageDailyVolume: avgDailyVolume },
        { where: { id: item.stockId } }
      );
    }

    console.log(`✅ 거래량 통계 업데이트 완료 (${monthlyVolumes.length}개 주식)`);
  } catch (error) {
    console.error('거래량 통계 업데이트 오류:', error);
  }
}

/**
 * 티어 강등 보호 만료 체크
 */
async function checkTierProtectionExpiry() {
  try {
    const now = new Date();

    // 보호 기간이 만료된 주식 조회
    const expiredStocks = await Stock.findAll({
      where: {
        tierProtectedUntil: { [Op.lte]: now },
        status: 'active'
      }
    });

    if (expiredStocks.length > 0) {
      console.log(`⏰ ${expiredStocks.length}개 주식의 티어 보호 기간 만료`);

      // 해당 주식들의 티어 재평가
      for (const stock of expiredStocks) {
        await tierService.updateStockTier(stock.id);
      }
    }
  } catch (error) {
    console.error('티어 보호 만료 체크 오류:', error);
  }
}

let tierUpdateIntervalId = null;
let volumeUpdateIntervalId = null;
let protectionCheckIntervalId = null;

/**
 * 티어 스케줄러 시작
 */
function startTierScheduler() {
  console.log('⏰ 티어 자동 업데이트 스케줄러 시작');

  // 초기 실행 (10초 후)
  setTimeout(() => {
    updateVolumeStatistics();
    runTierUpdate();
  }, 10000);

  // 1시간마다 티어 업데이트
  tierUpdateIntervalId = setInterval(runTierUpdate, 60 * 60 * 1000);

  // 6시간마다 거래량 통계 업데이트
  volumeUpdateIntervalId = setInterval(updateVolumeStatistics, 6 * 60 * 60 * 1000);

  // 30분마다 보호 기간 만료 체크
  protectionCheckIntervalId = setInterval(checkTierProtectionExpiry, 30 * 60 * 1000);

  console.log('   - 티어 업데이트: 1시간 간격');
  console.log('   - 거래량 통계: 6시간 간격');
  console.log('   - 보호 만료 체크: 30분 간격');
}

/**
 * 티어 스케줄러 중지
 */
function stopTierScheduler() {
  if (tierUpdateIntervalId) {
    clearInterval(tierUpdateIntervalId);
    tierUpdateIntervalId = null;
  }
  if (volumeUpdateIntervalId) {
    clearInterval(volumeUpdateIntervalId);
    volumeUpdateIntervalId = null;
  }
  if (protectionCheckIntervalId) {
    clearInterval(protectionCheckIntervalId);
    protectionCheckIntervalId = null;
  }

  console.log('⏸️ 티어 자동 업데이트 스케줄러 중지');
}

module.exports = {
  startTierScheduler,
  stopTierScheduler,
  runTierUpdate,
  updateVolumeStatistics,
  checkTierProtectionExpiry
};

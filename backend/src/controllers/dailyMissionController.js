const { DailyMission, User, CoinTransaction } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 오늘의 미션 조회
 */
exports.getTodayMissions = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    let mission = await DailyMission.findOne({
      where: {
        userId,
        date: today
      }
    });

    // 오늘 미션이 없으면 생성
    if (!mission) {
      mission = await DailyMission.create({
        userId,
        date: today
      });
    }

    // 미션 달성률 계산
    const completedCount = [
      mission.loginCompleted,
      mission.postCompleted,
      mission.commentCompleted,
      mission.stockPurchaseCompleted,
      mission.referralCompleted
    ].filter(Boolean).length;

    const totalMissions = 5;
    const progress = Math.floor((completedCount / totalMissions) * 100);

    res.json({
      success: true,
      mission: {
        ...mission.toJSON(),
        completedCount,
        totalMissions,
        progress
      }
    });
  } catch (error) {
    console.error('미션 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '미션 조회에 실패했습니다',
      error: error.message
    });
  }
};

/**
 * 출석 체크 (로그인 미션 완료)
 */
exports.checkIn = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    let mission = await DailyMission.findOne({
      where: { userId, date: today },
      transaction
    });

    if (!mission) {
      mission = await DailyMission.create({
        userId,
        date: today,
        loginCompleted: true
      }, { transaction });
    } else if (mission.loginCompleted) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '오늘 이미 출석 체크를 완료했습니다'
      });
    } else {
      await mission.update({ loginCompleted: true }, { transaction });
    }

    // AC 보상 지급
    const user = await User.findByPk(userId, { transaction });
    await user.update({
      acBalance: user.acBalance + 100
    }, { transaction });

    // 코인 거래 내역 저장
    await CoinTransaction.create({
      userId,
      coinType: 'AC',
      amount: 100,
      transactionType: 'earn',
      source: 'daily_mission_login',
      description: '출석 체크 보상'
    }, { transaction });

    // 전체 달성 확인
    await checkAllCompleted(mission, userId, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: '출석 체크 완료! 100 AC를 받았습니다',
      mission,
      reward: {
        type: 'AC',
        amount: 100
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('출석 체크 오류:', error);
    res.status(500).json({
      success: false,
      message: '출석 체크에 실패했습니다',
      error: error.message
    });
  }
};

/**
 * 보너스 보상 수령
 */
exports.claimBonus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const mission = await DailyMission.findOne({
      where: { userId, date: today },
      transaction
    });

    if (!mission) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '오늘의 미션을 찾을 수 없습니다'
      });
    }

    if (!mission.allCompleted) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '모든 미션을 완료해야 보너스를 받을 수 있습니다'
      });
    }

    if (mission.bonusReceived) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 보너스를 받았습니다'
      });
    }

    // 보너스 지급
    const user = await User.findByPk(userId, { transaction });
    await user.update({
      acBalance: user.acBalance + 300
    }, { transaction });

    // 코인 거래 내역 저장
    await CoinTransaction.create({
      userId,
      coinType: 'AC',
      amount: 300,
      transactionType: 'earn',
      source: 'daily_mission_bonus',
      description: '데일리 미션 전체 완료 보너스'
    }, { transaction });

    await mission.update({ bonusReceived: true }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: '보너스 300 AC를 받았습니다!',
      mission,
      reward: {
        type: 'AC',
        amount: 300
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('보너스 수령 오류:', error);
    res.status(500).json({
      success: false,
      message: '보너스 수령에 실패했습니다',
      error: error.message
    });
  }
};

/**
 * 미션 통계 조회
 */
exports.getMissionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 지난 7일 미션 조회
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const missions = await DailyMission.findAll({
      where: {
        userId,
        date: {
          [Op.gte]: sevenDaysAgo.toISOString().split('T')[0]
        }
      },
      order: [['date', 'DESC']]
    });

    // 연속 출석 일수 계산
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const dayMission = missions.find(m => m.date === dateStr);
      if (dayMission && dayMission.loginCompleted) {
        streak++;
      } else {
        break;
      }
    }

    // 총 완료 미션 수
    const totalCompleted = missions.reduce((sum, m) => {
      return sum + [
        m.loginCompleted,
        m.postCompleted,
        m.commentCompleted,
        m.stockPurchaseCompleted,
        m.referralCompleted
      ].filter(Boolean).length;
    }, 0);

    // 전체 달성 일수
    const perfectDays = missions.filter(m => m.allCompleted).length;

    res.json({
      success: true,
      stats: {
        streak,
        totalCompleted,
        perfectDays,
        recentMissions: missions.slice(0, 7)
      }
    });
  } catch (error) {
    console.error('미션 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '미션 통계 조회에 실패했습니다',
      error: error.message
    });
  }
};

/**
 * 전체 미션 완료 여부 확인 (내부 함수)
 */
async function checkAllCompleted(mission, userId, transaction) {
  const allDone = mission.loginCompleted &&
    mission.postCompleted &&
    mission.commentCompleted &&
    mission.stockPurchaseCompleted &&
    mission.referralCompleted;

  if (allDone && !mission.allCompleted) {
    await mission.update({ allCompleted: true }, { transaction });
  }
}

// Export helper function for use in other controllers
exports.updateMissionProgress = async (userId, missionType, transaction = null) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let mission = await DailyMission.findOne({
      where: { userId, date: today },
      transaction
    });

    if (!mission) {
      mission = await DailyMission.create({
        userId,
        date: today
      }, { transaction });
    }

    // 미션 타입에 따라 업데이트
    const updates = {};
    let reward = { type: 'AC', amount: 0 };

    switch (missionType) {
      case 'post':
        if (!mission.postCompleted) {
          updates.postCompleted = true;
          reward.amount = 200;
        }
        break;
      case 'comment':
        if (!mission.commentCompleted) {
          updates.commentCompleted = true;
          reward.amount = 150;
        }
        break;
      case 'stockPurchase':
        if (!mission.stockPurchaseCompleted) {
          updates.stockPurchaseCompleted = true;
          reward.amount = 50;
        }
        break;
      case 'referral':
        if (!mission.referralCompleted) {
          updates.referralCompleted = true;
          reward.type = 'PC';
          reward.amount = 500;
        }
        break;
    }

    if (Object.keys(updates).length > 0) {
      await mission.update(updates, { transaction });

      // 보상 지급
      if (reward.amount > 0) {
        const user = await User.findByPk(userId, { transaction });
        if (reward.type === 'AC') {
          await user.update({
            acBalance: user.acBalance + reward.amount
          }, { transaction });
        } else {
          await user.update({
            pcBalance: user.pcBalance + reward.amount
          }, { transaction });
        }

        // 코인 거래 내역 저장
        await CoinTransaction.create({
          userId,
          coinType: reward.type,
          amount: reward.amount,
          transactionType: 'earn',
          source: `daily_mission_${missionType}`,
          description: `데일리 미션: ${getMissionName(missionType)}`
        }, { transaction });
      }

      // 전체 달성 확인
      await checkAllCompleted(mission, userId, transaction);

      return { success: true, reward };
    }

    return { success: false, message: 'Already completed' };
  } catch (error) {
    console.error('미션 진행도 업데이트 오류:', error);
    return { success: false, error: error.message };
  }
};

function getMissionName(type) {
  const names = {
    post: '게시물 작성',
    comment: '댓글 작성',
    stockPurchase: '주식 매수',
    referral: '친구 초대'
  };
  return names[type] || type;
}

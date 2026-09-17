const { ShareholderCommunity, CommunityMember, User } = require('../models');
const { Op } = require('sequelize');
const { selectRoomAdmin } = require('../controllers/communityAdminController');
const { checkEmptyProfile, SUSPICIOUS_PATTERNS } = require('../utils/botDetector');

// 10분마다 전체 방 스캔하여 자동 방장 교체
async function scanAndUpdateAdmins() {
  try {
    console.log('🔄 방장 자동 교체 스캔 시작...');

    // 모든 활성 커뮤니티 조회
    const communities = await ShareholderCommunity.findAll({
      where: {
        isActive: true
      }
    });

    console.log(`📊 ${communities.length}개의 커뮤니티를 스캔합니다`);

    let changedCount = 0;

    for (const community of communities) {
      try {
        // 해당 커뮤니티의 모든 멤버 조회
        const members = await CommunityMember.findAll({
          where: {
            communityId: community.id,
            isBanned: false
          },
          order: [
            ['currentShareholding', 'DESC'],
            ['joinedAt', 'ASC'],
            ['activityScore', 'DESC']
          ]
        });

        if (members.length === 0) {
          continue;
        }

        // 1순위: 최다 보유 주식
        // 2순위: 보유 기간 (가입일 기준)
        // 3순위: 활동 점수
        const topMember = members[0];

        // 현재 방장과 다르면 교체
        if (community.currentAdminId !== topMember.userId) {
          console.log(`🔄 커뮤니티 ${community.name} (${community.id}): 방장 교체 필요`);
          console.log(`   이전 방장: ${community.currentAdminId}`);
          console.log(`   새 방장: ${topMember.userId} (보유 주식: ${topMember.currentShareholding})`);

          // 방장 교체 실행
          await selectRoomAdmin(community.id);
          changedCount++;
        }
      } catch (error) {
        console.error(`커뮤니티 ${community.id} 처리 중 오류:`, error);
      }
    }

    console.log(`✅ 방장 자동 교체 스캔 완료. ${changedCount}개 커뮤니티에서 방장 교체`);
  } catch (error) {
    console.error('방장 자동 교체 스캔 오류:', error);
  }
}

// 하루 1회, 가입 후 일정 기간이 지나도록 프로필이 비어 있는 계정을 스캔한다.
//
// checkEmptyProfile()은 호출마다 의심 점수를 올리므로 활동 단위(detectBot)에서 부르면
// 프로필 미작성 사용자가 금세 봇으로 몰린다. 그래서 여기서 하루 1회만 돌린다.
async function scanEmptyProfiles() {
  try {
    const cutoff = new Date(
      Date.now() - SUSPICIOUS_PATTERNS.EMPTY_PROFILE.daysAfterSignup * 24 * 60 * 60 * 1000
    );

    // 가입 후 기준일이 지났고, 아직 봇 확정(100점)이 아닌 계정만 대상
    const candidates = await User.findAll({
      where: {
        createdAt: { [Op.lte]: cutoff },
        botSuspicionScore: { [Op.lt]: 100 },
        bio: { [Op.or]: [null, ''] },
        displayName: { [Op.or]: [null, ''] }
      },
      attributes: ['id']
    });

    console.log(`🔍 빈 프로필 스캔: 후보 ${candidates.length}명`);

    let flagged = 0;
    for (const user of candidates) {
      try {
        const result = await checkEmptyProfile(user.id);
        if (result.suspicious) flagged++;
      } catch (error) {
        console.error(`빈 프로필 검사 실패 (user ${user.id}):`, error.message);
      }
    }

    console.log(`✅ 빈 프로필 스캔 완료. ${flagged}명 의심 점수 상승`);
  } catch (error) {
    console.error('빈 프로필 스캔 오류:', error);
  }
}

// 스케줄러 시작 함수
function startAdminScheduler() {
  // 즉시 한 번 실행
  scanAndUpdateAdmins();

  // 10분마다 실행 (600,000ms)
  const intervalId = setInterval(scanAndUpdateAdmins, 600000);

  console.log('⏰ 방장 자동 교체 스케줄러 시작 (10분 간격)');

  // 빈 프로필 스캔은 하루 1회 (86,400,000ms)
  const emptyProfileIntervalId = setInterval(scanEmptyProfiles, 86400000);

  console.log('⏰ 빈 프로필 스캔 스케줄러 시작 (24시간 간격)');

  return { intervalId, emptyProfileIntervalId };
}

// 스케줄러 중지 함수
function stopAdminScheduler(handles) {
  if (!handles) return;

  // 이전 버전은 intervalId 하나만 반환했으므로 둘 다 받아준다
  const ids = typeof handles === 'object'
    ? [handles.intervalId, handles.emptyProfileIntervalId]
    : [handles];

  ids.filter(Boolean).forEach(clearInterval);
  console.log('⏸️  관리 스케줄러 중지');
}

module.exports = {
  startAdminScheduler,
  stopAdminScheduler,
  scanAndUpdateAdmins,
  scanEmptyProfiles
};

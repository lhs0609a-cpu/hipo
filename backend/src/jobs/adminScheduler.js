const { ShareholderCommunity, CommunityMember } = require('../models');
const { selectRoomAdmin } = require('../controllers/communityAdminController');

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

// 스케줄러 시작 함수
function startAdminScheduler() {
  // 즉시 한 번 실행
  scanAndUpdateAdmins();

  // 10분마다 실행 (600,000ms)
  const intervalId = setInterval(scanAndUpdateAdmins, 600000);

  console.log('⏰ 방장 자동 교체 스케줄러 시작 (10분 간격)');

  return intervalId;
}

// 스케줄러 중지 함수
function stopAdminScheduler(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('⏸️  방장 자동 교체 스케줄러 중지');
  }
}

module.exports = {
  startAdminScheduler,
  stopAdminScheduler,
  scanAndUpdateAdmins
};

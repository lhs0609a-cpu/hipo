/**
 * 시드 데이터 스크립트 - 실제 서비스처럼 보이게 데이터 생성
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');
const models = require('../models');

const { User, Stock, Post, Comment, Like, Holding, Transaction, Follow } = models;

// 한국 이름 생성기
const koreanFirstNames = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '지후', '준서', '서연', '지우', '서현', '민서', '하은', '하윤', '윤서', '지민', '채원', '수아'];
const koreanLastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];

// 크리에이터 데이터
const creators = [
  { username: '아이유', displayName: '아이유 (IU)', category: 'entertainment', occupation: '가수', bio: '음악으로 세상을 물들이는 가수 아이유입니다 🎤', trustLevel: 'legend', marketCap: 50000000 },
  { username: '손흥민', displayName: '손흥민', category: 'sports', occupation: '축구선수', bio: '토트넘 홋스퍼 FC 소속 축구선수', trustLevel: 'diamond', marketCap: 45000000 },
  { username: '뷔', displayName: 'V (뷔)', category: 'entertainment', occupation: '가수', bio: 'BTS 멤버 뷔입니다 💜', trustLevel: 'legend', marketCap: 48000000 },
  { username: '제니', displayName: 'JENNIE', category: 'entertainment', occupation: '가수', bio: 'BLACKPINK JENNIE 🖤💗', trustLevel: 'diamond', marketCap: 42000000 },
  { username: '임영웅', displayName: '임영웅', category: 'entertainment', occupation: '가수', bio: '영웅시대와 함께하는 가수 임영웅입니다', trustLevel: 'master', marketCap: 35000000 },
  { username: '이강인', displayName: '이강인', category: 'sports', occupation: '축구선수', bio: 'PSG 소속 축구선수 이강인', trustLevel: 'platinum', marketCap: 28000000 },
  { username: '김연아', displayName: '김연아', category: 'sports', occupation: '피겨스케이터', bio: '피겨 퀸 김연아입니다 ⛸️', trustLevel: 'legend', marketCap: 38000000 },
  { username: '아이브', displayName: 'IVE 공식', category: 'entertainment', occupation: '아이돌', bio: 'IVE 공식 계정입니다 ✨', trustLevel: 'diamond', marketCap: 32000000 },
  { username: '뉴진스', displayName: 'NewJeans', category: 'entertainment', occupation: '아이돌', bio: 'NewJeans 공식 계정 🐰', trustLevel: 'diamond', marketCap: 36000000 },
  { username: '류현진', displayName: '류현진', category: 'sports', occupation: '야구선수', bio: '한화 이글스 투수 류현진입니다 ⚾', trustLevel: 'platinum', marketCap: 25000000 },
  { username: '박서준', displayName: '박서준', category: 'entertainment', occupation: '배우', bio: '배우 박서준입니다 🎬', trustLevel: 'platinum', marketCap: 22000000 },
  { username: '전지현', displayName: '전지현', category: 'entertainment', occupation: '배우', bio: '배우 전지현 공식 계정', trustLevel: 'master', marketCap: 30000000 },
  { username: '페이커', displayName: 'Faker (이상혁)', category: 'creator', occupation: 'e스포츠', bio: 'T1 미드라이너 Faker입니다 🏆', trustLevel: 'legend', marketCap: 40000000 },
  { username: '침착맨', displayName: '침착맨', category: 'creator', occupation: '유튜버', bio: '침착맨입니다. 워후.', trustLevel: 'platinum', marketCap: 18000000 },
  { username: '쯔양', displayName: '쯔양', category: 'creator', occupation: '유튜버', bio: '먹방 유튜버 쯔양입니다 🍜', trustLevel: 'gold', marketCap: 15000000 },
  { username: '우왁굳', displayName: '우왁굳', category: 'creator', occupation: '유튜버', bio: '트위치 스트리머 우왁굳입니다', trustLevel: 'gold', marketCap: 12000000 },
  { username: '고세구', displayName: '고세구', category: 'creator', occupation: '버튜버', bio: '버추얼 아이돌 이세돌 고세구입니다 🐶', trustLevel: 'silver', marketCap: 8000000 },
  { username: '주르르', displayName: '주르르', category: 'creator', occupation: '버튜버', bio: '이세돌 주르르입니다 🦋', trustLevel: 'silver', marketCap: 7500000 },
  { username: '릴파', displayName: '릴파', category: 'creator', occupation: '버튜버', bio: '이세돌 릴파입니다 💙', trustLevel: 'silver', marketCap: 7000000 },
  { username: '도티', displayName: '도티', category: 'creator', occupation: '유튜버', bio: '도티TV 운영자 도티입니다', trustLevel: 'gold', marketCap: 10000000 },
];

// 게시물 내용
const postContents = [
  '오늘 새 앨범 작업 중입니다! 기대해주세요 🎵',
  '팬 여러분 덕분에 여기까지 왔습니다. 항상 감사합니다 💕',
  '오늘 연습 끝! 내일도 화이팅 💪',
  '팬미팅에서 만난 모든 분들 감사합니다 🙏',
  '새로운 도전을 시작합니다. 응원해주세요!',
  '오늘 하루도 수고하셨습니다 ☺️',
  '드디어 발표! 곧 뵙겠습니다 🎉',
  '연습실에서 열심히 준비 중이에요 💦',
  '주말에 쉬면서 충전 중입니다 🌴',
  '여러분의 응원이 큰 힘이 됩니다 ❤️',
  '오늘 촬영 현장에서! 비하인드 곧 공개할게요 📸',
  '항상 최선을 다하겠습니다. 지켜봐주세요!',
  '팬분들 덕분에 매일 행복합니다 😊',
  '이번 무대 정말 기대됩니다! 많이 봐주세요',
  '여러분과 함께해서 행복해요 💖',
];

// 댓글 내용
const commentContents = [
  '항상 응원합니다! 💪',
  '최고예요!! ❤️',
  '팬이에요~ 사랑해요!',
  '대박 기대됩니다!',
  '주식 더 사야겠다 ㅋㅋ',
  '언제나 응원해요!',
  '진짜 최고!!',
  '기다리고 있을게요 💕',
  '화이팅!! 🔥',
  '오늘도 좋은 하루 되세요~',
  '너무 멋져요!!',
  '항상 행복하세요 😊',
  '대주주로서 응원합니다!',
  '주가 올라라!! 🚀',
  '팬미팅 때 봬요!',
];

async function seedData() {
  try {
    console.log('🌱 시드 데이터 생성 시작...\n');

    // 1. 크리에이터 생성
    console.log('👤 크리에이터 생성 중...');
    const creatorUsers = [];
    const hashedPassword = await bcrypt.hash('password123', 10);

    for (const creator of creators) {
      const existingUser = await User.findOne({ where: { username: creator.username } });
      if (existingUser) {
        creatorUsers.push(existingUser);
        console.log(`  - ${creator.username} (기존 사용자)`);
        continue;
      }

      const user = await User.create({
        id: uuidv4(),
        email: `${creator.username.toLowerCase().replace(/\s/g, '')}@hipo.kr`,
        username: creator.username,
        displayName: creator.displayName,
        password: hashedPassword,
        bio: creator.bio,
        category: creator.category,
        occupation: creator.occupation,
        trustLevel: creator.trustLevel,
        marketCap: creator.marketCap,
        poBalance: 1000000,
        isCreator: true,
        isVerified: true,
        referralCode: `${creator.username.substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      });
      creatorUsers.push(user);
      console.log(`  ✓ ${creator.username} 생성`);
    }

    // 2. 일반 사용자 생성 (50명)
    console.log('\n👥 일반 사용자 생성 중...');
    const regularUsers = [];
    for (let i = 0; i < 50; i++) {
      const lastName = koreanLastNames[Math.floor(Math.random() * koreanLastNames.length)];
      const firstName = koreanFirstNames[Math.floor(Math.random() * koreanFirstNames.length)];
      const username = `${lastName}${firstName}${Math.floor(Math.random() * 1000)}`;

      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        regularUsers.push(existingUser);
        continue;
      }

      const trustLevels = ['bronze', 'bronze', 'bronze', 'silver', 'silver', 'gold'];
      const trustLevel = trustLevels[Math.floor(Math.random() * trustLevels.length)];

      const user = await User.create({
        id: uuidv4(),
        email: `user${i}_${Date.now()}@example.com`,
        username,
        displayName: `${lastName}${firstName}`,
        password: hashedPassword,
        bio: `안녕하세요! ${lastName}${firstName}입니다.`,
        trustLevel,
        poBalance: Math.floor(Math.random() * 500000) + 10000,
        referralCode: `USER${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      });
      regularUsers.push(user);
    }
    console.log(`  ✓ ${regularUsers.length}명의 일반 사용자 생성`);

    // 3. 주식 생성
    console.log('\n📈 주식 생성 중...');
    const stocks = [];
    for (const creator of creatorUsers) {
      const existingStock = await Stock.findOne({ where: { userId: creator.id } });
      if (existingStock) {
        stocks.push(existingStock);
        continue;
      }

      const basePrice = Math.floor(Math.random() * 4000) + 500;
      const priceChange = (Math.random() - 0.3) * 30; // -9% ~ +21%
      const issuedShares = Math.floor(Math.random() * 50000) + 10000;
      const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
      const categories = ['entertainment', 'sports', 'creator', 'influencer'];

      const stock = await Stock.create({
        id: uuidv4(),
        userId: creator.id,
        totalShares: 100000,
        issuedShares,
        availableShares: Math.floor(Math.random() * 5000) + 1000,
        sharePrice: basePrice,
        marketCapTotal: basePrice * issuedShares,
        priceChangePercent: priceChange.toFixed(2),
        dividendRate: Math.floor(Math.random() * 20) + 10,
        tier: tiers[Math.floor(Math.random() * tiers.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        shareholderCount: Math.floor(Math.random() * 500) + 50,
        transactionCount: Math.floor(Math.random() * 2000) + 100,
        dayVolume: Math.floor(Math.random() * 10000) + 500,
        status: 'active',
      });
      stocks.push(stock);
      console.log(`  ✓ ${creator.username} 주식 생성 (${basePrice}P, ${priceChange.toFixed(1)}%)`);
    }

    // 4. 주식 보유 (Holding) 생성
    console.log('\n💰 주식 보유 데이터 생성 중...');
    const allUsers = [...creatorUsers, ...regularUsers];
    let holdingCount = 0;

    for (const stock of stocks) {
      // 각 주식당 10-30명의 주주
      const shareholderCount = Math.floor(Math.random() * 20) + 10;
      const shuffledUsers = allUsers.sort(() => Math.random() - 0.5).slice(0, shareholderCount);

      for (const holder of shuffledUsers) {
        if (holder.id === stock.userId) continue; // 발행자 제외

        const existingHolding = await Holding.findOne({
          where: { holderId: holder.id, stockId: stock.id }
        });
        if (existingHolding) continue;

        const shares = Math.floor(Math.random() * 500) + 10;
        await Holding.create({
          id: uuidv4(),
          holderId: holder.id,
          stockId: stock.id,
          shares,
          averagePrice: stock.sharePrice - Math.floor(Math.random() * 200),
        });
        holdingCount++;
      }
    }
    console.log(`  ✓ ${holdingCount}개의 보유 데이터 생성`);

    // 5. 거래 내역 생성
    console.log('\n💸 거래 내역 생성 중...');
    let txCount = 0;

    for (const stock of stocks) {
      // 각 주식당 20-50개의 거래
      const txPerStock = Math.floor(Math.random() * 30) + 20;

      for (let i = 0; i < txPerStock; i++) {
        const buyer = allUsers[Math.floor(Math.random() * allUsers.length)];
        const seller = allUsers[Math.floor(Math.random() * allUsers.length)];
        if (buyer.id === seller.id) continue;

        const shares = Math.floor(Math.random() * 50) + 1;
        const pricePerShare = stock.sharePrice + Math.floor((Math.random() - 0.5) * 200);
        const totalAmount = shares * pricePerShare;

        // 랜덤 시간 (최근 7일)
        const createdAt = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

        await Transaction.create({
          id: uuidv4(),
          buyerId: buyer.id,
          sellerId: seller.id,
          stockId: stock.id,
          shares,
          pricePerShare,
          totalAmount,
          transactionType: 'buy',
          createdAt,
        });
        txCount++;
      }
    }
    console.log(`  ✓ ${txCount}개의 거래 내역 생성`);

    // 6. 게시물 생성
    console.log('\n📝 게시물 생성 중...');
    const posts = [];

    for (const creator of creatorUsers) {
      // 각 크리에이터당 3-8개의 게시물
      const postCount = Math.floor(Math.random() * 5) + 3;

      for (let i = 0; i < postCount; i++) {
        const content = postContents[Math.floor(Math.random() * postContents.length)];
        const createdAt = new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000));

        const post = await Post.create({
          id: uuidv4(),
          userId: creator.id,
          content: `${content}`,
          likesCount: Math.floor(Math.random() * 500) + 10,
          commentsCount: Math.floor(Math.random() * 50) + 5,
          visibilityType: Math.random() > 0.8 ? 'SHAREHOLDERS_ONLY' : 'PUBLIC',
          createdAt,
        });
        posts.push(post);
      }
    }
    console.log(`  ✓ ${posts.length}개의 게시물 생성`);

    // 7. 댓글 생성
    console.log('\n💬 댓글 생성 중...');
    let commentCount = 0;

    for (const post of posts) {
      // 각 게시물당 5-15개의 댓글
      const commentsPerPost = Math.floor(Math.random() * 10) + 5;

      for (let i = 0; i < commentsPerPost; i++) {
        const commenter = allUsers[Math.floor(Math.random() * allUsers.length)];
        const content = commentContents[Math.floor(Math.random() * commentContents.length)];

        await Comment.create({
          id: uuidv4(),
          postId: post.id,
          userId: commenter.id,
          content,
          shareholding: Math.floor(Math.random() * 100),
        });
        commentCount++;
      }
    }
    console.log(`  ✓ ${commentCount}개의 댓글 생성`);

    // 8. 좋아요 생성
    console.log('\n❤️ 좋아요 생성 중...');
    let likeCount = 0;

    for (const post of posts) {
      // 각 게시물당 10-100개의 좋아요
      const likesPerPost = Math.floor(Math.random() * 90) + 10;
      const likers = allUsers.sort(() => Math.random() - 0.5).slice(0, likesPerPost);

      for (const liker of likers) {
        try {
          await Like.create({
            id: uuidv4(),
            postId: post.id,
            userId: liker.id,
          });
          likeCount++;
        } catch (e) {
          // 중복 무시
        }
      }
    }
    console.log(`  ✓ ${likeCount}개의 좋아요 생성`);

    // 9. 팔로우 관계 생성
    console.log('\n👥 팔로우 관계 생성 중...');
    let followCount = 0;

    if (Follow) {
      for (const user of allUsers) {
        // 각 사용자가 3-10명 팔로우
        const followCountPerUser = Math.floor(Math.random() * 7) + 3;
        const toFollow = creatorUsers.sort(() => Math.random() - 0.5).slice(0, followCountPerUser);

        for (const target of toFollow) {
          if (user.id === target.id) continue;
          try {
            await Follow.create({
              id: uuidv4(),
              followerId: user.id,
              followingId: target.id,
            });
            followCount++;
          } catch (e) {
            // 중복 무시
          }
        }
      }
      console.log(`  ✓ ${followCount}개의 팔로우 관계 생성`);
    }

    console.log('\n✅ 시드 데이터 생성 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  크리에이터: ${creatorUsers.length}명`);
    console.log(`  일반 사용자: ${regularUsers.length}명`);
    console.log(`  주식: ${stocks.length}개`);
    console.log(`  보유: ${holdingCount}개`);
    console.log(`  거래: ${txCount}개`);
    console.log(`  게시물: ${posts.length}개`);
    console.log(`  댓글: ${commentCount}개`);
    console.log(`  좋아요: ${likeCount}개`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ 시드 데이터 생성 실패:', error);
    throw error;
  }
}

// 실행
async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공\n');

    await seedData();

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

main();

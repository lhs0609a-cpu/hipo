const { User, Stock, Post, Follow, Like, Comment, Holding, Transaction } = require('./src/models');
const bcrypt = require('bcrypt');

// 한국 이름 생성
const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
const firstNames = ['민준', '서연', '예준', '서윤', '도윤', '지우', '시우', '서현', '주원', '지민', '하준', '서아', '지훈', '민서', '준서', '하은', '지호', '수아', '지안', '윤서'];

// 카테고리별 직업
const categories = {
  actor: { name: '배우', icon: '🎬', trustLevels: ['platinum', 'diamond', 'master', 'legend'] },
  artist: { name: '미술가', icon: '🎨', trustLevels: ['gold', 'platinum', 'diamond'] },
  entrepreneur: { name: '기업가', icon: '💼', trustLevels: ['diamond', 'master', 'legend'] },
  musician: { name: '뮤지션', icon: '🎵', trustLevels: ['silver', 'gold', 'platinum'] },
  athlete: { name: '운동선수', icon: '⚽', trustLevels: ['gold', 'platinum', 'diamond'] },
  writer: { name: '작가', icon: '✍️', trustLevels: ['silver', 'gold', 'platinum'] },
  chef: { name: '요리사', icon: '👨‍🍳', trustLevels: ['silver', 'gold'] },
  developer: { name: '개발자', icon: '💻', trustLevels: ['gold', 'platinum'] },
};

// 포스트 내용 템플릿
const postTemplates = [
  '오늘 정말 좋은 하루였습니다! 여러분은 어떠셨나요? 🌟',
  '새로운 프로젝트를 시작했어요. 많은 응원 부탁드립니다! 💪',
  '팬 여러분께 감사의 인사를 전합니다 ❤️',
  '드디어 완성했습니다! 오랜 시간 준비한 작품이에요 🎨',
  '오늘의 운동 완료! 꾸준함이 답이네요 🏋️',
  '아침 루틴 공유합니다. 여러분은 어떻게 하루를 시작하시나요? ☀️',
  '새로운 도전을 시작합니다. 함께 응원해주세요! 🚀',
  '감사한 하루입니다. 모두 좋은 하루 되세요 🙏',
  '이번 주말 계획 세우고 계신가요? 저는... 🤔',
  '요즘 가장 관심있는 것은 이것입니다! 여러분은요? 💡',
];

async function generateRandomUser(index) {
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const username = `${lastName}${firstName}${index}`;

  const categoryKeys = Object.keys(categories);
  const categoryKey = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
  const category = categories[categoryKey];

  const trustLevel = category.trustLevels[Math.floor(Math.random() * category.trustLevels.length)];
  const trustMultipliers = { bronze: 0.3, silver: 0.5, gold: 0.7, platinum: 1.0, diamond: 1.3, master: 1.5, legend: 2.0 };

  const hashedPassword = await bcrypt.hash('password123', 10);

  return {
    email: `user${index}@hipo.com`,
    username: username,
    password: hashedPassword,
    bio: `${category.icon} ${category.name} | ${trustLevel} 등급`,
    profileImage: null,
    poBalance: Math.floor(Math.random() * 50000) + 10000,
    trustLevel: trustLevel,
    trustMultiplier: trustMultipliers[trustLevel],
    marketCap: Math.floor(Math.random() * 1000000) + 100000,
    isCreator: true,
    isVerified: Math.random() > 0.5,
    referralCode: `REF${index}${Math.random().toString(36).substring(7).toUpperCase()}`,
  };
}

async function seedDatabase() {
  try {
    console.log('🌱 시드 데이터 생성을 시작합니다...');

    // 0. 기존 시드 데이터 삭제 (user1@hipo.com ~ user50@hipo.com)
    console.log('🗑️  기존 시드 데이터 확인 및 삭제 중...');
    const { Op } = require('sequelize');
    const existingUsers = await User.findAll({
      where: {
        email: {
          [Op.like]: 'user%@hipo.com'
        }
      }
    });

    if (existingUsers.length > 0) {
      console.log(`기존 시드 사용자 ${existingUsers.length}명 발견. 삭제 중...`);

      // 관련 데이터 삭제
      for (const user of existingUsers) {
        // 주식 삭제
        await Stock.destroy({ where: { userId: user.id } });
        // 포스트 삭제
        await Post.destroy({ where: { userId: user.id } });
        // 팔로우 삭제
        await Follow.destroy({ where: { [Op.or]: [{ followerId: user.id }, { followingId: user.id }] } });
        // 좋아요 삭제
        await Like.destroy({ where: { userId: user.id } });
        // 댓글 삭제
        await Comment.destroy({ where: { userId: user.id } });
        // 보유 주식 삭제
        await Holding.destroy({ where: { holderId: user.id } });
        // 거래 삭제
        await Transaction.destroy({ where: { [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }] } });
      }

      // 사용자 삭제
      await User.destroy({
        where: {
          email: {
            [Op.like]: 'user%@hipo.com'
          }
        }
      });

      console.log('✅ 기존 시드 데이터 삭제 완료');
    }

    // 1. 50명의 사용자 생성
    console.log('\n👥 사용자 생성 중...');
    const users = [];
    for (let i = 1; i <= 50; i++) {
      const userData = await generateRandomUser(i);
      const user = await User.create(userData);
      users.push(user);
      console.log(`✅ ${i}/50: ${user.username} 생성`);
    }

    // 2. 각 사용자에게 주식 발행
    console.log('\n📈 주식 발행 중...');
    for (const user of users) {
      const basePrice = Math.floor(Math.random() * 9000) + 1000; // 1000-10000
      const totalShares = Math.floor(Math.random() * 9000) + 1000; // 1000-10000

      await Stock.create({
        userId: user.id,
        sharePrice: basePrice,
        totalShares: totalShares,
        issuedShares: Math.floor(totalShares * 0.3), // 30% 발행됨
        dividendRate: Math.floor(Math.random() * 10) + 1, // 1-10%
        marketCapTotal: basePrice * totalShares,
        priceChangePercent: (Math.random() - 0.5) * 10, // -5% ~ +5%
      });
    }
    console.log('✅ 주식 발행 완료');

    // 3. 랜덤 팔로우 관계 생성 (각 사용자가 5-15명 팔로우)
    console.log('\n👥 팔로우 관계 생성 중...');
    for (const user of users) {
      const followCount = Math.floor(Math.random() * 11) + 5; // 5-15명
      const shuffled = [...users].sort(() => 0.5 - Math.random());
      const toFollow = shuffled.slice(0, followCount).filter(u => u.id !== user.id);

      for (const targetUser of toFollow) {
        await Follow.create({
          followerId: user.id,
          followingId: targetUser.id,
        });
      }
    }
    console.log('✅ 팔로우 관계 생성 완료');

    // 4. 각 사용자가 2-5개의 포스트 작성
    console.log('\n📝 포스트 생성 중...');
    const allPosts = [];
    for (const user of users) {
      const postCount = Math.floor(Math.random() * 4) + 2; // 2-5개
      for (let i = 0; i < postCount; i++) {
        const content = postTemplates[Math.floor(Math.random() * postTemplates.length)];
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30)); // 최근 30일 내

        const post = await Post.create({
          userId: user.id,
          content: content,
          imageUrl: null,
          likesCount: 0,
          commentsCount: 0,
          createdAt: createdDate,
        });
        allPosts.push(post);
      }
    }
    console.log(`✅ ${allPosts.length}개의 포스트 생성 완료`);

    // 5. 랜덤 좋아요 생성
    console.log('\n❤️ 좋아요 생성 중...');
    let likeCount = 0;
    for (const post of allPosts) {
      const likers = [...users].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 20) + 1);
      for (const liker of likers) {
        if (liker.id !== post.userId) {
          await Like.create({
            postId: post.id,
            userId: liker.id,
          });
          likeCount++;
        }
      }
      // 좋아요 수 업데이트
      const totalLikes = await Like.count({ where: { postId: post.id } });
      await post.update({ likesCount: totalLikes });
    }
    console.log(`✅ ${likeCount}개의 좋아요 생성 완료`);

    // 6. 랜덤 댓글 생성
    console.log('\n💬 댓글 생성 중...');
    const commentTemplates = [
      '좋은 내용이네요!',
      '응원합니다!',
      '멋져요 👍',
      '대단하시네요!',
      '저도 동감합니다',
      '정말 유익한 정보예요',
      '감사합니다 ❤️',
      '화이팅!',
    ];

    let commentCount = 0;
    for (const post of allPosts) {
      const commenters = [...users].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 5) + 1);
      for (const commenter of commenters) {
        if (commenter.id !== post.userId) {
          const commentContent = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
          await Comment.create({
            postId: post.id,
            userId: commenter.id,
            content: commentContent,
          });
          commentCount++;
        }
      }
      // 댓글 수 업데이트
      const totalComments = await Comment.count({ where: { postId: post.id } });
      await post.update({ commentsCount: totalComments });
    }
    console.log(`✅ ${commentCount}개의 댓글 생성 완료`);

    // 7. 랜덤 주식 거래 생성
    console.log('\n💰 주식 거래 생성 중...');
    const stocks = await Stock.findAll();
    let transactionCount = 0;

    for (let i = 0; i < 100; i++) {
      const buyer = users[Math.floor(Math.random() * users.length)];
      const stock = stocks[Math.floor(Math.random() * stocks.length)];
      const availableShares = stock.totalShares - stock.issuedShares;

      if (buyer.id !== stock.userId && availableShares > 0) {
        const shares = Math.min(Math.floor(Math.random() * 10) + 1, availableShares);
        const totalPrice = shares * stock.sharePrice;

        if (buyer.poBalance >= totalPrice) {
          // 거래 생성
          await Transaction.create({
            buyerId: buyer.id,
            sellerId: stock.userId,
            stockId: stock.id,
            shares: shares,
            pricePerShare: stock.sharePrice,
            totalAmount: totalPrice,
            transactionType: 'buy',
          });

          // 보유 주식 업데이트
          const holding = await Holding.findOne({
            where: { holderId: buyer.id, stockId: stock.id }
          });

          if (holding) {
            await holding.update({ shares: holding.shares + shares });
          } else {
            await Holding.create({
              holderId: buyer.id,
              stockId: stock.id,
              shares: shares,
            });
          }

          // 주식 업데이트
          await stock.update({ issuedShares: stock.issuedShares + shares });

          // 구매자 잔액 업데이트
          await buyer.update({ poBalance: buyer.poBalance - totalPrice });

          transactionCount++;
        }
      }
    }
    console.log(`✅ ${transactionCount}개의 거래 생성 완료`);

    console.log('\n✨ 시드 데이터 생성이 완료되었습니다!');
    console.log(`\n📊 생성된 데이터:
- 사용자: ${users.length}명
- 주식: ${stocks.length}개
- 포스트: ${allPosts.length}개
- 좋아요: ${likeCount}개
- 댓글: ${commentCount}개
- 거래: ${transactionCount}건
    `);

  } catch (error) {
    console.error('❌ 시드 데이터 생성 중 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 오류:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };

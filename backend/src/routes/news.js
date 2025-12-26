const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// NewsAPI.org 사용 (무료 API 키: https://newsapi.org/)
// 또는 네이버 검색 API 사용 가능
const NEWS_API_KEY = process.env.NEWS_API_KEY || 'demo'; // .env에 추가 필요

// 뉴스 검색 키워드 생성 함수 (동명이인 문제 해결)
const buildSearchKeyword = (user) => {
  // 1순위: 커스텀 뉴스 키워드가 있으면 사용
  if (user.newsKeywords) {
    return user.newsKeywords.split(',')[0].trim();
  }

  // 2순위: 실명 + 직업으로 구체화
  if (user.realName && user.occupation) {
    return `${user.realName} ${user.occupation}`;
  }

  // 3순위: 실명만 있으면 사용
  if (user.realName) {
    return user.realName;
  }

  // 4순위: username 사용 (기본)
  return user.username;
};

// 크리에이터 이름으로 뉴스 검색
router.get('/search/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다' });
    }

    const keyword = buildSearchKeyword(user);
    let articles = [];

    // NewsAPI 사용
    if (NEWS_API_KEY && NEWS_API_KEY !== 'demo') {
      try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: keyword,
            language: 'ko',
            sortBy: 'publishedAt',
            pageSize: 10,
            apiKey: NEWS_API_KEY,
          },
        });

        articles = response.data.articles.map(article => ({
          source: article.source.name,
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          author: article.author,
          content: article.content,
        }));
      } catch (error) {
        console.error('NewsAPI 오류:', error.message);
      }
    }

    // 네이버 검색 API 대체 (네이버 개발자 센터에서 키 발급 필요)
    const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
    const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

    if (articles.length === 0 && NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
      try {
        const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
          params: {
            query: keyword,
            display: 10,
            sort: 'date',
          },
          headers: {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
          },
        });

        articles = response.data.items.map(item => ({
          source: '네이버 뉴스',
          title: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
          description: item.description.replace(/<[^>]*>/g, ''),
          url: item.link,
          urlToImage: null,
          publishedAt: item.pubDate,
          author: null,
          content: item.description.replace(/<[^>]*>/g, ''),
        }));
      } catch (error) {
        console.error('네이버 API 오류:', error.message);
      }
    }

    res.json({
      success: true,
      keyword,
      articles,
      count: articles.length,
    });
  } catch (error) {
    console.error('뉴스 검색 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 여러 크리에이터의 뉴스 한번에 가져오기
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: '사용자 ID 배열이 필요합니다' });
    }

    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'username', 'realName', 'occupation', 'newsKeywords'],
    });

    const newsResults = {};

    for (const user of users) {
      const keyword = buildSearchKeyword(user);
      let articles = [];

      // NewsAPI 사용
      if (NEWS_API_KEY && NEWS_API_KEY !== 'demo') {
        try {
          const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
              q: keyword,
              language: 'ko',
              sortBy: 'publishedAt',
              pageSize: 5,
              apiKey: NEWS_API_KEY,
            },
          });

          articles = response.data.articles.map(article => ({
            userId: user.id,
            username: user.username,
            source: article.source.name,
            title: article.title,
            description: article.description,
            url: article.url,
            urlToImage: article.urlToImage,
            publishedAt: article.publishedAt,
          }));
        } catch (error) {
          console.error(`${user.username} 뉴스 검색 오류:`, error.message);
        }
      }

      newsResults[user.id] = articles;
    }

    res.json({
      success: true,
      news: newsResults,
    });
  } catch (error) {
    console.error('배치 뉴스 검색 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// 기본 인플루언서/연예인 키워드 (데이터베이스에 크리에이터가 없을 때 사용)
const DEFAULT_INFLUENCER_KEYWORDS = [
  { name: 'BTS', occupation: '가수', category: '연예인' },
  { name: '아이유', occupation: '가수', category: '연예인' },
  { name: '손흥민', occupation: '축구선수', category: '스포츠' },
  { name: '블랙핑크', occupation: '가수', category: '연예인' },
  { name: '뉴진스', occupation: '가수', category: '연예인' },
  { name: '침착맨', occupation: '유튜버', category: '인플루언서' },
  { name: '김나영', occupation: '유튜버', category: '인플루언서' },
  { name: '백종원', occupation: '요리연구가', category: '인플루언서' },
  { name: '강백호', occupation: '야구선수', category: '스포츠' },
  { name: '임영웅', occupation: '가수', category: '연예인' },
];

// 내가 팔로우/투자한 크리에이터들의 뉴스 모아보기
router.get('/my-creators', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // 'following', 'invested', 'popular', 'all'

    let users = [];

    if (type === 'following') {
      // 팔로우한 사용자
      const follows = await req.user.getFollowing({
        attributes: ['id', 'username', 'trustLevel', 'realName', 'occupation', 'category', 'newsKeywords', 'isVerified'],
        limit: 20,
      });
      users = follows;
    } else if (type === 'invested') {
      // 주식 보유한 크리에이터
      const Stock = require('../models/Stock');
      const StockHolding = require('../models/StockHolding');

      const holdings = await StockHolding.findAll({
        where: { userId },
        include: [{
          model: Stock,
          include: [{ model: User, attributes: ['id', 'username', 'trustLevel', 'realName', 'occupation', 'category', 'newsKeywords', 'isVerified'] }],
        }],
        limit: 20,
      });

      users = holdings.map(h => h.Stock.User).filter(u => u);
    } else if (type === 'popular') {
      // 신뢰도 높은 인기 크리에이터
      users = await User.findAll({
        where: { trustLevel: { [require('sequelize').Op.gte]: 7 } },
        attributes: ['id', 'username', 'trustLevel', 'realName', 'occupation', 'category', 'newsKeywords', 'isVerified'],
        limit: 20,
        order: [['trustLevel', 'DESC']],
      });
    } else {
      // 전체: 팔로우 + 투자 + 인기 크리에이터 조합
      const follows = await req.user.getFollowing({
        attributes: ['id', 'username', 'trustLevel', 'realName', 'occupation', 'category', 'newsKeywords', 'isVerified'],
        limit: 10,
      });

      const popular = await User.findAll({
        where: { trustLevel: { [require('sequelize').Op.gte]: 7 } },
        attributes: ['id', 'username', 'trustLevel', 'realName', 'occupation', 'category', 'newsKeywords', 'isVerified'],
        limit: 10,
        order: [['trustLevel', 'DESC']],
      });

      users = [...follows, ...popular];
    }

    // 중복 제거
    let uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());

    // ⭐ 크리에이터가 없으면 기본 인플루언서 키워드 사용
    const useDefaultKeywords = uniqueUsers.length === 0;

    // 뉴스 검색 정확도 향상을 위해 인증되거나 높은 신뢰도의 크리에이터 우선
    const prioritizedUsers = uniqueUsers.sort((a, b) => {
      // 인증된 사용자 우선
      if (a.isVerified && !b.isVerified) return -1;
      if (!a.isVerified && b.isVerified) return 1;

      // realName이나 newsKeywords가 있는 사용자 우선
      const aHasKeywords = a.realName || a.newsKeywords;
      const bHasKeywords = b.realName || b.newsKeywords;
      if (aHasKeywords && !bHasKeywords) return -1;
      if (!aHasKeywords && bHasKeywords) return 1;

      return 0;
    });

    // 각 크리에이터의 뉴스 가져오기
    const allArticles = [];

    // ⭐ 기본 키워드를 사용할지, 실제 크리에이터를 사용할지 결정
    let searchTargets = [];

    if (useDefaultKeywords) {
      // 기본 인플루언서 키워드 사용
      searchTargets = DEFAULT_INFLUENCER_KEYWORDS.map(keyword => ({
        id: `default-${keyword.name}`,
        username: keyword.name,
        realName: keyword.name,
        occupation: keyword.occupation,
        category: keyword.category,
        trustLevel: 10,
        isVerified: true,
        newsKeywords: `${keyword.name} ${keyword.occupation}`,
      }));
    } else {
      // 실제 크리에이터 사용
      searchTargets = prioritizedUsers.slice(0, 10);
    }

    for (const user of searchTargets) {
      const keyword = buildSearchKeyword(user);

      // 네이버 뉴스 API 사용 (우선)
      const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
      const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

      if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
        try {
          const response = await axios.get('https://openapi.naver.com/v1/search/news.json', {
            params: {
              query: keyword,
              display: 5,
              sort: 'date',
            },
            headers: {
              'X-Naver-Client-Id': NAVER_CLIENT_ID,
              'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            },
          });

          const articles = response.data.items.map(item => ({
            creatorId: user.id,
            creatorName: user.username,
            creatorRealName: user.realName,
            creatorOccupation: user.occupation,
            creatorTrustLevel: user.trustLevel,
            isVerified: user.isVerified,
            searchKeyword: keyword,
            source: '네이버 뉴스',
            title: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
            description: item.description.replace(/<[^>]*>/g, ''),
            url: item.link,
            urlToImage: null,
            publishedAt: item.pubDate,
            author: null,
          }));

          allArticles.push(...articles);
        } catch (error) {
          console.error(`${user.username} 네이버 뉴스 오류:`, error.message);
        }
      } else if (NEWS_API_KEY && NEWS_API_KEY !== 'demo') {
        // NewsAPI 대체
        try {
          const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
              q: keyword,
              language: 'ko',
              sortBy: 'publishedAt',
              pageSize: 3,
              apiKey: NEWS_API_KEY,
            },
          });

          const articles = response.data.articles.map(article => ({
            creatorId: user.id,
            creatorName: user.username,
            creatorRealName: user.realName,
            creatorOccupation: user.occupation,
            creatorTrustLevel: user.trustLevel,
            isVerified: user.isVerified,
            searchKeyword: keyword,
            source: article.source.name,
            title: article.title,
            description: article.description,
            url: article.url,
            urlToImage: article.urlToImage,
            publishedAt: article.publishedAt,
            author: article.author,
          }));

          allArticles.push(...articles);
        } catch (error) {
          console.error(`${user.username} NewsAPI 오류:`, error.message);
        }
      }
    }

    // 최신순 정렬
    allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.json({
      success: true,
      articles: allArticles,
      creators: searchTargets.map(u => ({
        id: u.id,
        username: u.username,
        realName: u.realName,
        occupation: u.occupation,
        category: u.category,
        trustLevel: u.trustLevel,
        isVerified: u.isVerified,
        searchKeyword: buildSearchKeyword(u)
      })),
      usingDefaultKeywords: useDefaultKeywords,
    });
  } catch (error) {
    console.error('내 크리에이터 뉴스 조회 오류:', error);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

module.exports = router;

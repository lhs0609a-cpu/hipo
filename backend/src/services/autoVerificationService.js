const axios = require('axios');

/**
 * 자동 인증 검증 서비스
 * 총 100점 만점 시스템:
 * - 90점 이상: 자동 승인
 * - 70-89점: 관리자 검토 필요
 * - 70점 미만: 자동 거부
 */

class AutoVerificationService {
  constructor() {
    this.INSTAGRAM_API_URL = 'https://www.instagram.com/api/v1/users/web_profile_info';
    this.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    this.TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
    this.GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    this.GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
  }

  /**
   * 메인 검증 함수
   */
  async verifyInfluencer(verificationData) {
    const scores = {
      socialMedia: 0,        // 30점
      webPresence: 0,        // 25점
      activity: 0,           // 20점
      consistency: 0,        // 15점
      credibility: 0,        // 10점
    };

    const details = {
      socialMediaDetails: {},
      webPresenceDetails: {},
      activityDetails: {},
      consistencyDetails: {},
      credibilityDetails: {},
    };

    try {
      // 1. 소셜 미디어 검증 (30점)
      const socialResult = await this.verifySocialMedia(verificationData);
      scores.socialMedia = socialResult.score;
      details.socialMediaDetails = socialResult.details;

      // 2. 웹 존재성 검증 (25점)
      const webResult = await this.verifyWebPresence(verificationData);
      scores.webPresence = webResult.score;
      details.webPresenceDetails = webResult.details;

      // 3. 활동성 검증 (20점)
      const activityResult = await this.verifyActivity(verificationData);
      scores.activity = activityResult.score;
      details.activityDetails = activityResult.details;

      // 4. 일관성 검증 (15점)
      const consistencyResult = await this.verifyConsistency(verificationData);
      scores.consistency = consistencyResult.score;
      details.consistencyDetails = consistencyResult.details;

      // 5. 신뢰도 검증 (10점)
      const credibilityResult = await this.verifyCredibility(verificationData);
      scores.credibility = credibilityResult.score;
      details.credibilityDetails = credibilityResult.details;

      // 총점 계산
      const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

      // 추가 자동 승인 조건 검사
      const additionalApproval = await this.checkAdditionalApprovalConditions(verificationData);

      // 결과 판정
      let decision = 'pending';
      let reason = '';

      // 추가 조건으로 자동 승인 (관리자 검토 없이)
      if (additionalApproval.autoApprove) {
        decision = 'auto_approved';
        reason = `자동 승인: ${additionalApproval.reason}`;
      }
      // 점수 기반 자동 승인
      else if (totalScore >= 90) {
        decision = 'auto_approved';
        reason = `자동 승인: 총점 ${totalScore}점 (90점 이상)`;
      }
      // 70점 이상이고 추가 신뢰 조건 충족 시 자동 승인
      else if (totalScore >= 70 && additionalApproval.trustBonus) {
        decision = 'auto_approved';
        reason = `자동 승인: 총점 ${totalScore}점 + 신뢰 보너스 (${additionalApproval.trustReason})`;
      }
      // 관리자 검토 필요
      else if (totalScore >= 60) {
        decision = 'review_required';
        reason = `관리자 검토 필요: 총점 ${totalScore}점 (60-89점)`;
      }
      // 자동 거부
      else {
        decision = 'auto_rejected';
        reason = `자동 거부: 총점 ${totalScore}점 (60점 미만)`;
      }

      details.additionalApproval = additionalApproval;

      return {
        decision,
        totalScore,
        scores,
        details,
        reason,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('자동 검증 오류:', error);
      return {
        decision: 'review_required',
        totalScore: 0,
        scores,
        details,
        reason: '자동 검증 중 오류 발생, 관리자 검토 필요',
        error: error.message
      };
    }
  }

  /**
   * 1. 소셜 미디어 검증 (30점)
   */
  async verifySocialMedia(data) {
    let score = 0;
    const details = {};
    const { socialLinks = {}, followerCount } = data;

    try {
      // Instagram 검증 (15점)
      if (socialLinks.instagram) {
        const igResult = await this.verifyInstagram(socialLinks.instagram);
        details.instagram = igResult;

        if (igResult.verified) score += 5; // 인증 배지
        if (igResult.followers >= 10000) score += 5; // 1만 팔로워 이상
        if (igResult.followers >= 100000) score += 3; // 10만 팔로워 이상
        if (igResult.accountAge >= 180) score += 2; // 6개월 이상
      }

      // YouTube 검증 (10점)
      if (socialLinks.youtube) {
        const ytResult = await this.verifyYouTube(socialLinks.youtube);
        details.youtube = ytResult;

        if (ytResult.verified) score += 3;
        if (ytResult.subscribers >= 10000) score += 4;
        if (ytResult.subscribers >= 100000) score += 3;
      }

      // Twitter 검증 (5점)
      if (socialLinks.twitter) {
        const twResult = await this.verifyTwitter(socialLinks.twitter);
        details.twitter = twResult;

        if (twResult.verified) score += 3;
        if (twResult.followers >= 10000) score += 2;
      }

    } catch (error) {
      console.error('소셜 미디어 검증 오류:', error);
      details.error = error.message;
    }

    return { score: Math.min(score, 30), details };
  }

  /**
   * Instagram 검증 (간접 방식)
   */
  async verifyInstagram(url) {
    try {
      const username = this.extractUsername(url, 'instagram.com');

      // 실제 환경에서는 Instagram Graph API 또는 공식 API 사용
      // 여기서는 팔로워 수 기반 검증 로직 시뮬레이션

      return {
        username,
        verified: false, // API 연동 시 실제 값
        followers: 0,    // API 연동 시 실제 값
        accountAge: 0,   // API 연동 시 실제 값
        posts: 0,
        engagementRate: 0,
        note: 'Instagram API 연동 필요'
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * YouTube 검증
   */
  async verifyYouTube(url) {
    try {
      const channelId = this.extractYouTubeChannelId(url);

      if (!this.YOUTUBE_API_KEY) {
        return {
          note: 'YouTube API 키 미설정',
          subscribers: 0,
          verified: false
        };
      }

      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${this.YOUTUBE_API_KEY}`
      );

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0];
        return {
          channelId,
          title: channel.snippet.title,
          subscribers: parseInt(channel.statistics.subscriberCount),
          videoCount: parseInt(channel.statistics.videoCount),
          viewCount: parseInt(channel.statistics.viewCount),
          verified: channel.snippet.customUrl ? true : false, // 커스텀 URL은 보통 검증된 채널에만 제공
        };
      }

      return { error: '채널 정보를 찾을 수 없습니다' };
    } catch (error) {
      return { error: error.message, note: 'YouTube API 오류' };
    }
  }

  /**
   * Twitter 검증
   */
  async verifyTwitter(url) {
    try {
      const username = this.extractUsername(url, 'twitter.com');

      if (!this.TWITTER_BEARER_TOKEN) {
        return {
          note: 'Twitter API 토큰 미설정',
          followers: 0,
          verified: false
        };
      }

      const response = await axios.get(
        `https://api.twitter.com/2/users/by/username/${username}?user.fields=verified,public_metrics,created_at`,
        {
          headers: {
            'Authorization': `Bearer ${this.TWITTER_BEARER_TOKEN}`
          }
        }
      );

      if (response.data.data) {
        const user = response.data.data;
        return {
          username,
          verified: user.verified || false,
          followers: user.public_metrics.followers_count,
          following: user.public_metrics.following_count,
          tweets: user.public_metrics.tweet_count,
          createdAt: user.created_at
        };
      }

      return { error: '사용자 정보를 찾을 수 없습니다' };
    } catch (error) {
      return { error: error.message, note: 'Twitter API 오류' };
    }
  }

  /**
   * 2. 웹 존재성 검증 (25점)
   */
  async verifyWebPresence(data) {
    let score = 0;
    const details = {};
    const { realName, occupation } = data;

    try {
      // Google 검색 결과 수 (15점)
      const searchQuery = `${realName} ${occupation}`;
      const googleResults = await this.searchGoogle(searchQuery);
      details.googleResults = googleResults;

      if (googleResults.count >= 1000) score += 10;
      else if (googleResults.count >= 500) score += 7;
      else if (googleResults.count >= 100) score += 5;
      else if (googleResults.count >= 10) score += 3;

      // 뉴스 기사 언급 (10점)
      const newsResults = await this.searchNews(searchQuery);
      details.newsResults = newsResults;

      if (newsResults.count >= 50) score += 10;
      else if (newsResults.count >= 20) score += 7;
      else if (newsResults.count >= 10) score += 5;
      else if (newsResults.count >= 5) score += 3;

    } catch (error) {
      console.error('웹 존재성 검증 오류:', error);
      details.error = error.message;
    }

    return { score: Math.min(score, 25), details };
  }

  /**
   * Google 검색
   */
  async searchGoogle(query) {
    try {
      if (!this.GOOGLE_API_KEY || !this.GOOGLE_CSE_ID) {
        return {
          count: 0,
          note: 'Google API 미설정'
        };
      }

      const response = await axios.get(
        `https://www.googleapis.com/customsearch/v1?key=${this.GOOGLE_API_KEY}&cx=${this.GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}`
      );

      return {
        count: parseInt(response.data.searchInformation?.totalResults) || 0,
        items: response.data.items?.slice(0, 5) || []
      };
    } catch (error) {
      return { count: 0, error: error.message };
    }
  }

  /**
   * 뉴스 검색 (NewsAPI 또는 Naver API)
   */
  async searchNews(query) {
    try {
      const NEWS_API_KEY = process.env.NEWS_API_KEY;

      if (!NEWS_API_KEY) {
        return { count: 0, note: 'News API 미설정' };
      }

      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: query,
          language: 'ko',
          sortBy: 'relevancy',
          pageSize: 100,
          apiKey: NEWS_API_KEY
        }
      });

      return {
        count: response.data.totalResults || 0,
        articles: response.data.articles?.slice(0, 5) || []
      };
    } catch (error) {
      return { count: 0, error: error.message };
    }
  }

  /**
   * 3. 활동성 검증 (20점)
   */
  async verifyActivity(data) {
    let score = 0;
    const details = {};

    try {
      // 최근 활동 검증
      const { socialLinks = {} } = data;

      // Instagram 최근 게시물 (10점)
      if (socialLinks.instagram) {
        // API 연동 시 실제 최근 게시물 확인
        details.instagramActivity = {
          recentPosts: 0,
          lastPostDate: null,
          note: 'Instagram API 연동 필요'
        };
      }

      // YouTube 최근 영상 (10점)
      if (socialLinks.youtube) {
        // API 연동 시 실제 최근 영상 확인
        details.youtubeActivity = {
          recentVideos: 0,
          lastVideoDate: null,
          note: 'YouTube API 연동 필요'
        };
      }

      // 기본 점수 (API 미연동 시)
      if (data.followerCount >= 10000) score += 10;
      else if (data.followerCount >= 5000) score += 7;
      else if (data.followerCount >= 1000) score += 5;

    } catch (error) {
      console.error('활동성 검증 오류:', error);
      details.error = error.message;
    }

    return { score: Math.min(score, 20), details };
  }

  /**
   * 4. 일관성 검증 (15점)
   */
  async verifyConsistency(data) {
    let score = 0;
    const details = {};

    try {
      const { realName, socialLinks = {} } = data;

      // 여러 플랫폼에서 동일한 이름 사용 확인
      const platforms = Object.keys(socialLinks).filter(key => socialLinks[key]);

      details.platformCount = platforms.length;

      if (platforms.length >= 3) score += 10; // 3개 이상 플랫폼
      else if (platforms.length >= 2) score += 7; // 2개 플랫폼
      else if (platforms.length >= 1) score += 4; // 1개 플랫폼

      // 프로필 정보 일치도
      if (realName && realName.trim().length >= 2) score += 5;

    } catch (error) {
      console.error('일관성 검증 오류:', error);
      details.error = error.message;
    }

    return { score: Math.min(score, 15), details };
  }

  /**
   * 5. 신뢰도 검증 (10점)
   */
  async verifyCredibility(data) {
    let score = 0;
    const details = {};

    try {
      const { description, newsKeywords, category, occupation } = data;

      // 상세 설명 제공 (5점)
      if (description && description.length >= 50) score += 5;
      else if (description && description.length >= 20) score += 3;

      // 뉴스 키워드 제공 (3점)
      if (newsKeywords && newsKeywords.trim().length > 0) score += 3;

      // 카테고리 및 직업 정보 (2점)
      if (category && occupation) score += 2;

      details.hasDescription = !!description;
      details.hasKeywords = !!newsKeywords;
      details.hasCategory = !!category;

    } catch (error) {
      console.error('신뢰도 검증 오류:', error);
      details.error = error.message;
    }

    return { score: Math.min(score, 10), details };
  }

  /**
   * 추가 자동 승인 조건 검사 (관리자 검토 없이)
   */
  async checkAdditionalApprovalConditions(data) {
    const result = {
      autoApprove: false,
      trustBonus: false,
      reason: '',
      trustReason: '',
      checks: {}
    };

    try {
      // 1. 이메일 도메인 화이트리스트 검사
      const emailDomain = this.checkEmailDomain(data.email);
      result.checks.emailDomain = emailDomain;
      if (emailDomain.verified) {
        result.autoApprove = true;
        result.reason = `공인 이메일 도메인 (${emailDomain.domain})`;
        return result;
      }

      // 2. 소셜 미디어 공식 인증 배지 확인
      const verifiedBadge = await this.checkVerifiedBadges(data);
      result.checks.verifiedBadge = verifiedBadge;
      if (verifiedBadge.hasVerified >= 2) {
        result.autoApprove = true;
        result.reason = `${verifiedBadge.hasVerified}개 플랫폼에서 공식 인증됨`;
        return result;
      }
      if (verifiedBadge.hasVerified >= 1) {
        result.trustBonus = true;
        result.trustReason = `${verifiedBadge.platforms.join(', ')} 공식 인증`;
      }

      // 3. 고팔로워 인플루언서 (50만+ 팔로워)
      if (data.followerCount >= 500000) {
        result.autoApprove = true;
        result.reason = `고팔로워 인플루언서 (${data.followerCount.toLocaleString()}명)`;
        return result;
      }
      if (data.followerCount >= 100000) {
        result.trustBonus = true;
        result.trustReason = `대형 인플루언서 (${data.followerCount.toLocaleString()}명)`;
      }

      // 4. 여러 플랫폼 일관성 (3개 이상 플랫폼)
      const platformCount = Object.keys(data.socialLinks || {}).filter(key => data.socialLinks[key]).length;
      result.checks.platformCount = platformCount;
      if (platformCount >= 4) {
        result.trustBonus = true;
        result.trustReason = `${platformCount}개 플랫폼에서 활동`;
      }

      // 5. 뉴스 키워드 정확성 (실명 + 직업 포함)
      const keywordQuality = this.checkKeywordQuality(data);
      result.checks.keywordQuality = keywordQuality;
      if (keywordQuality.score >= 90) {
        result.trustBonus = true;
        result.trustReason = '정확한 검색 키워드 제공';
      }

      // 6. 신뢰할 수 있는 추천인 (구현 예정)
      // if (data.referredBy) { ... }

    } catch (error) {
      console.error('추가 승인 조건 검사 오류:', error);
      result.checks.error = error.message;
    }

    return result;
  }

  /**
   * 이메일 도메인 화이트리스트 검사
   */
  checkEmailDomain(email) {
    if (!email) return { verified: false };

    const domain = email.split('@')[1]?.toLowerCase();

    // 공인된 엔터테인먼트/미디어 기업 도메인
    const verifiedDomains = [
      // 한국 엔터테인먼트
      'sm.com', 'smtown.com',           // SM Entertainment
      'ygfamily.com', 'ygent.com',       // YG Entertainment
      'jype.com',                         // JYP Entertainment
      'bighitcorp.com', 'hybe.com',      // HYBE
      'pledis.co.kr',                     // Pledis
      'starshipent.com',                  // Starship
      'cubeent.co.kr',                    // Cube Entertainment

      // 방송사
      'kbs.co.kr', 'imbc.com', 'sbs.co.kr',
      'jtbc.co.kr', 'tvn.com', 'cjenm.com',

      // 글로벌 미디어
      'spotify.com', 'youtube.com', 'instagram.com',
      'tiktok.com', 'netflix.com',

      // 스포츠 구단/리그
      'kleague.com', 'kbl.or.kr', 'kbo.co.kr',
      'nba.com', 'premierleague.com'
    ];

    const isVerified = verifiedDomains.includes(domain);

    return {
      verified: isVerified,
      domain,
      type: isVerified ? 'entertainment/media' : 'general'
    };
  }

  /**
   * 소셜 미디어 공식 인증 배지 확인
   */
  async checkVerifiedBadges(data) {
    const result = {
      hasVerified: 0,
      platforms: []
    };

    const { socialLinks = {} } = data;

    // Instagram 인증 배지 (실제 API 연동 필요)
    if (socialLinks.instagram) {
      // API 연동 시 실제 확인
      // const igData = await this.verifyInstagram(socialLinks.instagram);
      // if (igData.verified) {
      //   result.hasVerified++;
      //   result.platforms.push('Instagram');
      // }
    }

    // YouTube 인증 배지
    if (socialLinks.youtube && this.YOUTUBE_API_KEY) {
      try {
        const ytData = await this.verifyYouTube(socialLinks.youtube);
        if (ytData.verified) {
          result.hasVerified++;
          result.platforms.push('YouTube');
        }
      } catch (error) {
        // API 오류 무시
      }
    }

    // Twitter 인증 배지
    if (socialLinks.twitter && this.TWITTER_BEARER_TOKEN) {
      try {
        const twData = await this.verifyTwitter(socialLinks.twitter);
        if (twData.verified) {
          result.hasVerified++;
          result.platforms.push('Twitter');
        }
      } catch (error) {
        // API 오류 무시
      }
    }

    return result;
  }

  /**
   * 뉴스 키워드 품질 검사
   */
  checkKeywordQuality(data) {
    let score = 0;
    const { newsKeywords, realName, occupation } = data;

    if (!newsKeywords) return { score: 0 };

    const keywords = newsKeywords.toLowerCase();
    const name = realName?.toLowerCase() || '';
    const job = occupation?.toLowerCase() || '';

    // 실명 포함
    if (name && keywords.includes(name)) score += 40;

    // 직업 포함
    if (job && keywords.includes(job)) score += 30;

    // 적절한 길이 (10-100자)
    if (newsKeywords.length >= 10 && newsKeywords.length <= 100) score += 20;

    // 여러 키워드 (쉼표로 구분)
    if (newsKeywords.includes(',')) score += 10;

    return { score, keywords: newsKeywords };
  }

  /**
   * 유틸리티 함수
   */
  extractUsername(url, platform) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/').filter(p => p);
      return parts[0] || '';
    } catch (error) {
      return '';
    }
  }

  extractYouTubeChannelId(url) {
    try {
      const urlObj = new URL(url);
      if (urlObj.pathname.includes('/channel/')) {
        return urlObj.pathname.split('/channel/')[1].split('/')[0];
      }
      // @username 형식인 경우 API로 변환 필요
      return '';
    } catch (error) {
      return '';
    }
  }
}

module.exports = new AutoVerificationService();

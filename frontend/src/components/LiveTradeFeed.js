import React, { useState, useEffect, useRef } from 'react';
import { getAppWidth, getAppHeight } from '../utils/appWidth';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import socketService from '../services/socketService';

const SCREEN_WIDTH = getAppWidth();

// 목업 한국 사용자 이름
const MOCK_USERNAMES = [
  '투자왕김서방',
  '주린이하나',
  '배당마스터',
  '크리에이터팬',
  '히포러버',
];

// 목업 크리에이터 주식 이름
const MOCK_STOCK_NAMES = [
  '김철수',
  '이영희',
  '박지민',
  '최수현',
  '정다은',
  '한민준',
  '송예진',
];

/**
 * 목업 거래 데이터 생성
 */
const generateMockTrade = () => {
  const username = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
  const stockName = MOCK_STOCK_NAMES[Math.floor(Math.random() * MOCK_STOCK_NAMES.length)];
  const type = Math.random() > 0.5 ? 'buy' : 'sell';
  const shares = Math.floor(Math.random() * 50) + 1;
  const price = Math.floor(Math.random() * 90000) + 10000;
  const timestamp = new Date().toISOString();

  return { username, stockName, type, shares, price, timestamp };
};

/**
 * 가격 포맷 (1000 단위 콤마)
 */
const formatPrice = (price) => {
  return price.toLocaleString('ko-KR');
};

/**
 * 실시간 거래 피드 컴포넌트
 * 최근 체결된 거래를 수평 스크롤 티커로 표시합니다.
 */
const LiveTradeFeed = ({ maxItems = 20, compact = false }) => {
  const [trades, setTrades] = useState(() => {
    // 초기 목업 거래 5건 생성
    return Array.from({ length: 5 }, () => generateMockTrade());
  });
  const [isPaused, setIsPaused] = useState(false);

  const scrollAnim = useRef(new Animated.Value(0)).current;
  const fadeAnims = useRef(new Map()).current;
  const animationRef = useRef(null);
  const contentWidthRef = useRef(SCREEN_WIDTH * 2);

  // 소켓 이벤트 리스너
  useEffect(() => {
    const cleanup = socketService.on('tradeExecuted', (trade) => {
      setTrades((prev) => {
        const updated = [trade, ...prev];
        if (updated.length > maxItems) {
          updated.length = maxItems;
        }
        return updated;
      });

      // 새 거래 페이드인 애니메이션
      const tradeKey = `${trade.timestamp}_${trade.username}_${trade.stockName}`;
      const fadeAnim = new Animated.Value(0);
      fadeAnims.set(tradeKey, fadeAnim);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });

    return cleanup;
  }, [maxItems]);

  // 자동 스크롤 애니메이션
  useEffect(() => {
    if (trades.length === 0) return;

    const startScrollAnimation = () => {
      // 콘텐츠 폭 추정: 각 아이템 약 280px (compact: 160px)
      const itemWidth = compact ? 160 : 280;
      const totalWidth = trades.length * itemWidth;
      contentWidthRef.current = totalWidth;

      scrollAnim.setValue(0);

      animationRef.current = Animated.loop(
        Animated.timing(scrollAnim, {
          toValue: -totalWidth,
          duration: totalWidth * 25, // 속도: 픽셀당 25ms
          useNativeDriver: true,
          isInteraction: false,
        })
      );

      animationRef.current.start();
    };

    if (!isPaused) {
      startScrollAnimation();
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [trades.length, isPaused, compact]);

  // 터치 이벤트로 일시정지/재개
  const handleTouchStart = () => {
    setIsPaused(true);
    if (animationRef.current) {
      animationRef.current.stop();
    }
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
  };

  // 거래 아이템별 페이드 애니메이션 값 가져오기
  const getFadeAnim = (trade) => {
    const tradeKey = `${trade.timestamp}_${trade.username}_${trade.stockName}`;
    return fadeAnims.get(tradeKey);
  };

  // 거래 아이템 렌더링
  const renderTradeItem = (trade, index) => {
    const isBuy = trade.type === 'buy';
    const typeColor = isBuy ? COLORS.success : COLORS.danger;
    const typeText = isBuy ? '매수' : '매도';
    const typeIcon = isBuy ? '▲' : '▼';
    const fadeAnim = getFadeAnim(trade);
    const opacity = fadeAnim || 1;

    if (compact) {
      return (
        <Animated.View
          key={`${trade.timestamp}_${index}`}
          style={[styles.tradeItemCompact, { opacity }]}
        >
          <Text style={[styles.typeIcon, { color: typeColor }]}>{typeIcon}</Text>
          <Text style={styles.usernameCompact} numberOfLines={1}>
            {trade.username}
          </Text>
          <Text style={[styles.typeTextCompact, { color: typeColor }]}>
            {typeText}
          </Text>
          <Text style={styles.sharesCompact}>{trade.shares}주</Text>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        key={`${trade.timestamp}_${index}`}
        style={[styles.tradeItem, { opacity }]}
      >
        <Text style={styles.username} numberOfLines={1}>
          {trade.username}
        </Text>
        <Text style={styles.stockName} numberOfLines={1}>
          {trade.stockName}
        </Text>
        <Text style={styles.shares}>{trade.shares}주</Text>
        <Text style={[styles.typeText, { color: typeColor }]}>{typeText}</Text>
        <Text style={styles.separator}>@</Text>
        <Text style={styles.price}>{formatPrice(trade.price)} PO</Text>
      </Animated.View>
    );
  };

  const containerHeight = compact ? 40 : 48;

  // 거래가 없는 경우 플레이스홀더
  if (trades.length === 0) {
    return (
      <View style={[styles.container, { height: containerHeight }]}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>
            실시간 거래가 여기에 표시됩니다
          </Text>
        </View>
      </View>
    );
  }

  // 티커를 매끄럽게 반복하기 위해 거래 목록을 두 번 렌더링
  const duplicatedTrades = [...trades, ...trades];

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Animated.View
        style={[
          styles.tickerTrack,
          {
            transform: [{ translateX: scrollAnim }],
          },
        ]}
      >
        {duplicatedTrades.map((trade, index) => renderTradeItem(trade, index))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tickerTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 24,
  },
  // 일반 모드 거래 아이템
  tradeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  username: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    maxWidth: 80,
  },
  stockName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    maxWidth: 60,
  },
  shares: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    fontSize: 12,
    color: COLORS.gray400,
    marginHorizontal: 2,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // 컴팩트 모드 거래 아이템
  tradeItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  typeIcon: {
    fontSize: 10,
    fontWeight: '700',
  },
  usernameCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    maxWidth: 64,
  },
  typeTextCompact: {
    fontSize: 12,
    fontWeight: '700',
  },
  sharesCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  // 플레이스홀더
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
});

export default LiveTradeFeed;

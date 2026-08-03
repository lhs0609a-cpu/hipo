import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext';

// Stock Context 생성
const StockContext = createContext(null);

export const StockProvider = ({ children }) => {
  const { socket, isConnected } = useSocket();

  // 실시간 주가 데이터 (stockId를 키로 사용)
  const [stockPrices, setStockPrices] = useState({});

  // 전체 주식 목록 (티커)
  const [tickerStocks, setTickerStocks] = useState([]);

  // 마지막 업데이트 시간
  const [lastUpdate, setLastUpdate] = useState(null);

  // 구독 중인 주식 ID 목록
  const subscriptions = useRef(new Set());

  // 주가 업데이트 핸들러
  const handleTickerUpdate = useCallback((data) => {
    if (data?.stocks) {
      setTickerStocks(data.stocks);
      setLastUpdate(new Date(data.timestamp));

      // 개별 주가 데이터도 업데이트
      const priceMap = {};
      data.stocks.forEach((stock) => {
        priceMap[stock.stockId] = {
          ...stock,
          updatedAt: data.timestamp,
        };
      });

      setStockPrices((prev) => ({
        ...prev,
        ...priceMap,
      }));
    }
  }, []);

  // 개별 주식 가격 업데이트 핸들러
  const handlePriceUpdate = useCallback((data) => {
    if (data?.stock) {
      setStockPrices((prev) => ({
        ...prev,
        [data.stock.stockId]: {
          ...data.stock,
          updatedAt: data.timestamp,
        },
      }));

      // 티커 목록도 업데이트
      setTickerStocks((prev) =>
        prev.map((stock) =>
          stock.stockId === data.stock.stockId
            ? { ...stock, ...data.stock }
            : stock
        )
      );
    }
  }, []);

  // 거래 발생 시 업데이트
  const handleTradeNew = useCallback((data) => {
    // 거래 발생 시 해당 주식 가격 업데이트
    if (data?.stockId) {
      setStockPrices((prev) => {
        const existing = prev[data.stockId];
        if (existing) {
          return {
            ...prev,
            [data.stockId]: {
              ...existing,
              sharePrice: data.pricePerShare,
              lastTradeAt: data.timestamp,
            },
          };
        }
        return prev;
      });
    }
  }, []);

  // Socket 이벤트 리스너 등록
  useEffect(() => {
    if (!socket || !isConnected) return;

    // 이벤트 리스너 등록
    socket.on('stock:ticker_update', handleTickerUpdate);
    socket.on('stock:price_update', handlePriceUpdate);
    socket.on('trade:new', handleTradeNew);
    socket.on('trade:executed', handleTradeNew);

    // 클린업
    return () => {
      socket.off('stock:ticker_update', handleTickerUpdate);
      socket.off('stock:price_update', handlePriceUpdate);
      socket.off('trade:new', handleTradeNew);
      socket.off('trade:executed', handleTradeNew);
    };
  }, [socket, isConnected, handleTickerUpdate, handlePriceUpdate, handleTradeNew]);

  // 특정 주식 가격 조회
  const getStockPrice = useCallback(
    (stockId) => {
      return stockPrices[stockId] || null;
    },
    [stockPrices]
  );

  // 주식 구독 (향후 특정 주식만 구독하는 기능 확장 가능)
  const subscribeStock = useCallback((stockId) => {
    subscriptions.current.add(stockId);
  }, []);

  // 주식 구독 해제
  const unsubscribeStock = useCallback((stockId) => {
    subscriptions.current.delete(stockId);
  }, []);

  // 가격 변동 계산 헬퍼
  const calculatePriceChange = useCallback((currentPrice, previousPrice) => {
    if (!previousPrice || previousPrice === 0) return { change: 0, percent: 0 };
    const change = currentPrice - previousPrice;
    const percent = ((change / previousPrice) * 100).toFixed(2);
    return { change, percent: parseFloat(percent) };
  }, []);

  // 가격 포맷팅 헬퍼
  const formatPrice = useCallback((price) => {
    if (price === null || price === undefined) return '0';
    return Math.floor(price).toLocaleString();
  }, []);

  // 등락 색상 결정 헬퍼
  const getPriceColor = useCallback((changePercent) => {
    if (changePercent > 0) return '#F0344B'; // 상승 (빨강)
    if (changePercent < 0) return '#1E4BC7'; // 하락 (파랑)
    return '#5D6779'; // 보합
  }, []);

  const value = {
    // 데이터
    stockPrices,
    tickerStocks,
    lastUpdate,
    isConnected,

    // 메서드
    getStockPrice,
    subscribeStock,
    unsubscribeStock,

    // 헬퍼
    calculatePriceChange,
    formatPrice,
    getPriceColor,
  };

  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
};

// useStock 커스텀 훅
export const useStock = () => {
  const context = useContext(StockContext);

  if (context === undefined) {
    throw new Error('useStock must be used within a StockProvider');
  }

  return context;
};

// 특정 주식의 실시간 가격을 구독하는 훅
export const useStockPrice = (stockId) => {
  const { stockPrices, subscribeStock, unsubscribeStock, getPriceColor } = useStock();

  useEffect(() => {
    if (stockId) {
      subscribeStock(stockId);
      return () => unsubscribeStock(stockId);
    }
  }, [stockId, subscribeStock, unsubscribeStock]);

  const stockData = stockPrices[stockId];

  return {
    price: stockData?.sharePrice || null,
    change: stockData?.priceChange || 0,
    changePercent: stockData?.priceChangePercent || 0,
    marketCap: stockData?.marketCap || 0,
    lastUpdated: stockData?.updatedAt || null,
    color: getPriceColor(stockData?.priceChangePercent || 0),
    isLive: !!stockData,
  };
};

// 티커(전체 주식 목록) 훅
export const useStockTicker = () => {
  const { tickerStocks, lastUpdate, isConnected } = useStock();

  return {
    stocks: tickerStocks,
    lastUpdate,
    isConnected,
    count: tickerStocks.length,
  };
};

export default StockContext;

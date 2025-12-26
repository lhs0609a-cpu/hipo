const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/stocks
 * 주식 목록 조회
 */
router.get('/', stockController.getStocks);

/**
 * GET /api/stocks/recommended
 * 추천 주식 목록 조회
 */
router.get('/recommended', stockController.getRecommendedStocks);

/**
 * GET /api/stocks/market/chart
 * 시장 전체 차트 데이터 조회
 */
router.get('/market/chart', stockController.getMarketChartData);

/**
 * GET /api/stocks/user/:userId
 * 특정 사용자의 주식 조회
 */
router.get('/user/:userId', stockController.getUserStock);

/**
 * GET /api/stocks/:stockId
 * 주식 상세 조회
 */
router.get('/:stockId', stockController.getStockDetail);

/**
 * POST /api/stocks/issue
 * 주식 발행/IPO (인증 필요)
 */
router.post('/issue', authenticateToken, stockController.issueStock);

/**
 * POST /api/stocks/buy
 * 주식 매수 (인증 필요)
 */
router.post('/buy', authenticateToken, stockController.buyStock);

/**
 * POST /api/stocks/sell
 * 주식 매도 (인증 필요)
 */
router.post('/sell', authenticateToken, stockController.sellStock);

/**
 * GET /api/stocks/me/holdings
 * 내 보유 주식 조회 (인증 필요)
 */
router.get('/me/holdings', authenticateToken, stockController.getMyHoldings);

/**
 * GET /api/stocks/me/transactions
 * 내 거래 내역 조회 (인증 필요)
 */
router.get('/me/transactions', authenticateToken, stockController.getTransactions);

/**
 * GET /api/stocks/me/shareholders
 * 내 주식을 보유한 주주 목록 조회 (인증 필요)
 */
router.get('/me/shareholders', authenticateToken, stockController.getMyShareholders);

/**
 * GET /api/stocks/:stockId/history
 * 주식 가격 히스토리 조회
 */
router.get('/:stockId/history', stockController.getPriceHistory);

/**
 * POST /api/stocks/:stockId/generate-demo-history
 * 데모용 가격 히스토리 생성 (개발용)
 */
router.post('/:stockId/generate-demo-history', stockController.generateDemoHistory);

module.exports = router;

const express = require('express');
const router = express.Router();
const portfolioController = require('../controllers/portfolioController');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/portfolio/summary
 * 포트폴리오 요약
 */
router.get('/summary', authenticateToken, portfolioController.getPortfolioSummary);

/**
 * GET /api/portfolio/profit-analysis
 * 수익률 분석
 */
router.get('/profit-analysis', authenticateToken, portfolioController.getProfitAnalysis);

/**
 * GET /api/portfolio/sector-analysis
 * 섹터별 분석
 */
router.get('/sector-analysis', authenticateToken, portfolioController.getSectorAnalysis);

/**
 * GET /api/portfolio/trade-statistics
 * 거래 통계
 */
router.get('/trade-statistics', authenticateToken, portfolioController.getTradeStatistics);

/**
 * GET /api/portfolio/dividend-analysis
 * 배당 분석
 */
router.get('/dividend-analysis', authenticateToken, portfolioController.getDividendAnalysis);

/**
 * GET /api/portfolio/report
 * 포트폴리오 리포트 생성
 */
router.get('/report', authenticateToken, portfolioController.generateReport);

module.exports = router;

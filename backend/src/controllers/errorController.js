const { ErrorReport, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Error Reporting Controller
 *
 * Handles error reports and crash logs from frontend
 */
exports.reportError = async (req, res) => {
  try {
    const {
      severity = 'error',
      type,
      message,
      stack,
      componentStack,
      screenName,
      deviceInfo,
      appVersion
    } = req.body;
    const userId = req.user?.id || null;

    if (!message) {
      return res.status(400).json({
        error: '오류 메시지가 필요합니다'
      });
    }

    const errorReport = await ErrorReport.create({
      userId,
      severity,
      type,
      message,
      stack,
      componentStack,
      screenName,
      deviceInfo,
      appVersion
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reported from client:', {
        id: errorReport.id,
        severity,
        type,
        message: message.substring(0, 100)
      });
    }

    res.json({
      success: true,
      message: 'Error report received',
      reportId: errorReport.id
    });
  } catch (error) {
    console.error('Error processing error report:', error);
    res.status(500).json({
      error: 'Failed to process error report',
    });
  }
};

/**
 * Get error statistics (admin only)
 */
exports.getErrorStats = async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    const where = {
      createdAt: { [Op.gte]: startDate }
    };

    const [total, critical, errorCount, warning] = await Promise.all([
      ErrorReport.count({ where }),
      ErrorReport.count({ where: { ...where, severity: 'critical' } }),
      ErrorReport.count({ where: { ...where, severity: 'error' } }),
      ErrorReport.count({ where: { ...where, severity: 'warning' } })
    ]);

    const unresolvedCount = await ErrorReport.count({
      where: { ...where, isResolved: false }
    });

    res.json({
      success: true,
      stats: {
        total,
        critical,
        error: errorCount,
        warning,
        unresolved: unresolvedCount
      },
      period
    });
  } catch (error) {
    console.error('Error fetching error stats:', error);
    res.status(500).json({
      error: 'Failed to fetch error statistics',
    });
  }
};

/**
 * Get error reports list (admin only)
 */
exports.getErrorReports = async (req, res) => {
  try {
    const { severity, isResolved, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (severity) where.severity = severity;
    if (isResolved !== undefined) where.isResolved = isResolved === 'true';

    const { count, rows: reports } = await ErrorReport.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching error reports:', error);
    res.status(500).json({
      error: 'Failed to fetch error reports',
    });
  }
};

/**
 * Resolve an error report (admin only)
 */
exports.resolveError = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    const report = await ErrorReport.findByPk(reportId);

    if (!report) {
      return res.status(404).json({
        error: '오류 리포트를 찾을 수 없습니다'
      });
    }

    await report.update({
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy: adminId,
      notes
    });

    res.json({
      success: true,
      message: '오류 리포트가 해결 처리되었습니다',
      report
    });
  } catch (error) {
    console.error('Error resolving error report:', error);
    res.status(500).json({
      error: 'Failed to resolve error report',
    });
  }
};

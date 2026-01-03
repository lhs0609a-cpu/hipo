const { Feedback, User } = require('../models');

/**
 * Feedback Controller
 *
 * Handles user feedback, bug reports, and feature requests
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { type, subject, content, email } = req.body;
    const userId = req.user?.id || null;

    if (!subject || !content) {
      return res.status(400).json({
        error: '제목과 내용을 입력해주세요'
      });
    }

    const feedback = await Feedback.create({
      userId,
      type: type || 'general',
      subject,
      content,
      email,
      status: 'pending',
      priority: 'medium'
    });

    // Log feedback in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📬 Feedback received:', {
        id: feedback.id,
        type: feedback.type,
        subject: feedback.subject,
        userId,
      });
    }

    res.json({
      success: true,
      message: '피드백이 접수되었습니다. 감사합니다!',
      feedbackId: feedback.id
    });
  } catch (error) {
    console.error('Error processing feedback:', error);
    res.status(500).json({
      error: '피드백 처리 중 오류가 발생했습니다',
    });
  }
};

/**
 * Get all feedback (admin only)
 */
exports.getAllFeedback = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const { count, rows: feedbacks } = await Feedback.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'email', 'profileImage']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      error: '피드백 조회 중 오류가 발생했습니다',
    });
  }
};

/**
 * Update feedback status (admin only)
 */
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status, response, priority } = req.body;
    const adminId = req.user.id;

    const feedback = await Feedback.findByPk(feedbackId);

    if (!feedback) {
      return res.status(404).json({
        error: '피드백을 찾을 수 없습니다'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (response) {
      updateData.adminResponse = response;
      updateData.respondedAt = new Date();
      updateData.respondedBy = adminId;
    }

    await feedback.update(updateData);

    res.json({
      success: true,
      message: '피드백이 업데이트되었습니다',
      feedback
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({
      error: '피드백 업데이트 중 오류가 발생했습니다',
    });
  }
};

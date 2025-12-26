/**
 * Feedback Controller
 *
 * Handles user feedback, bug reports, and feature requests
 */
exports.submitFeedback = async (req, res) => {
  try {
    const feedbackData = req.body;
    const userId = req.user?.id || null;

    // Add user ID if authenticated
    const feedback = {
      ...feedbackData,
      userId,
      submittedAt: new Date().toISOString(),
    };

    // Log feedback in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📬 Feedback received:', {
        type: feedback.type,
        subject: feedback.subject,
        userId,
      });
    }

    // TODO: Save to database (create Feedback model)
    // await Feedback.create(feedback);

    // TODO: Send notification to admin/support team
    // await notifyAdmins(feedback);

    // TODO: If email provided, send confirmation
    // if (feedback.email) {
    //   await sendConfirmationEmail(feedback.email);
    // }

    res.json({
      success: true,
      message: '피드백이 접수되었습니다. 감사합니다!',
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
    const { type, page = 1, limit = 20 } = req.query;

    // TODO: Implement feedback retrieval from database
    // const feedback = await Feedback.findAll({
    //   where: type ? { type } : {},
    //   order: [['createdAt', 'DESC']],
    //   limit: parseInt(limit),
    //   offset: (page - 1) * limit,
    // });

    res.json({
      success: true,
      feedback: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
      },
      message: 'Feedback list endpoint - to be implemented',
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
    const { status, response } = req.body;

    // TODO: Update feedback in database
    // await Feedback.update(
    //   { status, adminResponse: response },
    //   { where: { id: feedbackId } }
    // );

    res.json({
      success: true,
      message: '피드백 상태가 업데이트되었습니다',
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({
      error: '피드백 업데이트 중 오류가 발생했습니다',
    });
  }
};

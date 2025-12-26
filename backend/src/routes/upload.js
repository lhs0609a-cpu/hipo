const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = require('../config/multer');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/upload/profile
 * 프로필 이미지 업로드 (인증 필요)
 */
router.post('/profile', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다' });
    }

    // 업로드된 파일의 URL 생성
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/profiles/${req.file.filename}`;

    res.json({
      message: '이미지가 업로드되었습니다',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('프로필 이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드 중 오류가 발생했습니다' });
  }
});

/**
 * POST /api/upload/post
 * 포스트 이미지 업로드 (인증 필요)
 */
router.post('/post', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다' });
    }

    // 업로드된 파일의 URL 생성
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/posts/${req.file.filename}`;

    res.json({
      message: '이미지가 업로드되었습니다',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('포스트 이미지 업로드 오류:', error);
    res.status(500).json({ error: '이미지 업로드 중 오류가 발생했습니다' });
  }
});

// 에러 핸들러
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '파일 크기는 5MB를 초과할 수 없습니다' });
    }
    return res.status(400).json({ error: error.message });
  }

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  next();
});

module.exports = router;

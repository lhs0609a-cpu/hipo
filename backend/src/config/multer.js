const multer = require('multer');
const path = require('path');

// 저장소 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 파일 타입에 따라 다른 폴더에 저장
    if (req.path.includes('/profile')) {
      cb(null, 'uploads/profiles/');
    } else if (req.path.includes('/post')) {
      cb(null, 'uploads/posts/');
    } else {
      cb(null, 'uploads/images/');
    }
  },
  filename: (req, file, cb) => {
    // 고유한 파일명 생성: timestamp-randomstring.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 파일 필터 (이미지만 허용)
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다 (jpeg, jpg, png, gif, webp)'), false);
  }
};

// Multer 설정
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  }
});

module.exports = upload;

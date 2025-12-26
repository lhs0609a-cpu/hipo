const express = require('express');
const router = express.Router();
const hashtagController = require('../controllers/hashtagController');

router.get('/trending', hashtagController.getTrendingHashtags);
router.get('/:tag', hashtagController.searchByHashtag);

module.exports = router;

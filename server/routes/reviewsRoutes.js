const express = require('express');
const ReviewsController = require('../controllers/reviewsController');

const router = express.Router();

router.get('/', ReviewsController.listReviews);
router.get('/meta', ReviewsController.getReviewMetadata);
router.post('/', ReviewsController.addReview);
router.put('/:review_id/helpful', ReviewsController.markReviewHelpful);
router.put('/:review_id/report', ReviewsController.reportReview);

module.exports = router;
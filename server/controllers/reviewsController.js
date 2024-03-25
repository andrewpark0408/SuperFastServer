require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE
});

client.connect();

const ReviewsController = {
  listReviews: async (req, res) => {
    try {
        const { product_id, page = 1, count = 100, sort = 'newest' } = req.query;
        const offset = (page - 1) * count;

        let orderByClause = 'ORDER BY r.date DESC';  // Default sorting by newest
        if (sort === 'helpful') {
            orderByClause = 'ORDER BY r.helpfulness DESC, r.date DESC';
        } else if (sort === 'relevant') {
            orderByClause = 'ORDER BY r.date DESC, r.helpfulness DESC';
        }

        const query = `
        SELECT r.id AS review_id, r.rating, r.summary, r.recommend, r.response, r.body, r.date, r.reviewer_name, r.helpfulness, rp.url AS photo_url
        FROM reviewsall r
        LEFT JOIN reviews_photos rp ON r.id = rp.review_id
        WHERE r.product_id = $1 AND r.reported = false
        ${orderByClause}
        LIMIT $2 OFFSET $3`;

        const result = await client.query(query, [product_id, count, offset]);

        const reviewsWithPhotos = result.rows.map(row => ({
            review_id: row.review_id,
            rating: row.rating,
            summary: row.summary,
            recommend: row.recommend,
            response: row.response,
            body: row.body,
            date: row.date,
            reviewer_name: row.reviewer_name,
            helpfulness: row.helpfulness,
            photos: row.photo_url ? [{ id: row.review_id, url: row.photo_url }] : [],
        }));

        res.status(200).json({
            product: product_id,
            page,
            count,
            results: reviewsWithPhotos,
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  },

  getReviewMetadata: async (req, res) => {
    try {
        const { product_id } = req.query;

        // Existing metadata and ratings queries remain the same
        const metadataQuery = `
            SELECT
                ch.id AS characteristic_id,
                ch.name AS characteristic_name,
                AVG(cr.value) AS average_value
            FROM characteristics ch
            JOIN characteristic_reviews cr ON ch.id = cr.characteristic_id
            JOIN reviewsall r ON cr.review_id = r.id
            WHERE r.product_id = $1
            GROUP BY ch.id, ch.name
        `;

        const ratingsQuery = `
            SELECT
                rating,
                COUNT(rating) AS count
            FROM reviewsall
            WHERE product_id = $1
            GROUP BY rating
        `;

        // New query to count recommended reviews
        const recommendedQuery = `
            SELECT
                recommend,
                COUNT(recommend) AS count
            FROM reviewsall
            WHERE product_id = $1 AND recommend = true
            GROUP BY recommend
        `;

        // Execute all queries
        const metadataResult = await client.query(metadataQuery, [product_id]);
        const ratingsResult = await client.query(ratingsQuery, [product_id]);
        const recommendedResult = await client.query(recommendedQuery, [product_id]);

        // Process metadata and ratings as before
        const characteristics = metadataResult.rows.reduce((acc, cur) => {
            const averageValue = cur.average_value && !isNaN(cur.average_value) ? Number(cur.average_value) : null;
            if (averageValue !== null) {
                acc[cur.characteristic_name] = { id: cur.characteristic_id, value: averageValue.toFixed(2) };
            }
            return acc;
        }, {});

        const ratings = ratingsResult.rows.reduce((acc, cur) => {
            acc[cur.rating] = cur.count;
            return acc;
        }, {});

        // Process the recommended count
        const recommended = recommendedResult.rows.reduce((acc, cur) => {
            acc[cur.recommend] = cur.count;
            return acc;
        }, {});

        res.status(200).json({
            product_id,
            ratings,
            recommended,  // Include the recommended count in the response
            characteristics,
        });
    } catch (error) {
        console.error('Error fetching review metadata:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  },

  addReview: async (req, res) => {
    try {
        const { product_id, rating, summary, body, recommend, reviewer_name, reviewer_email, photos, characteristics } = req.body;

        // Start transaction
        await client.query('BEGIN');

        // Insert the main review data
        const reviewInsertQuery = `
            INSERT INTO reviewsall (product_id, rating, summary, body, recommend, reviewer_name, reviewer_email)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        const reviewInsertResult = await client.query(reviewInsertQuery, [product_id, rating, summary, body, recommend, reviewer_name, reviewer_email]);
        const reviewId = reviewInsertResult.rows[0].id;

        // Insert related photos
        if (photos && photos.length) {
            for (const photoUrl of photos) {
                const photoInsertQuery = `INSERT INTO reviews_photos (review_id, url) VALUES ($1, $2)`;
                await client.query(photoInsertQuery, [reviewId, photoUrl]);
            }
        }

        // Insert related characteristics
        if (characteristics) {
            for (const [charId, value] of Object.entries(characteristics)) {
                const charInsertQuery = `INSERT INTO characteristic_reviews (review_id, characteristic_id, value) VALUES ($1, $2, $3)`;
                await client.query(charInsertQuery, [reviewId, charId, value]);
            }
        }

        // Commit transaction
        await client.query('COMMIT');

        res.status(201).json({ message: 'Review added successfully', reviewId: reviewId });
    } catch (error) {
        // Rollback in case of error
        await client.query('ROLLBACK');
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  },


  markReviewHelpful: async (req, res) => {
    try {
        const { review_id } = req.params;
        const query = 'UPDATE reviewsall SET helpfulness = helpfulness + 1 WHERE id = $1';
        await client.query(query, [review_id]);
        res.status(204).send();
    } catch (error) {
        console.error('Error marking review as helpful:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  },

  reportReview: async (req, res) => {
      try {
          const { review_id } = req.params;
          const query = 'UPDATE reviewsall SET reported = true WHERE id = $1';
          await client.query(query, [review_id]);
          res.status(204).send();
      } catch (error) {
          console.error('Error reporting review:', error);
          res.status(500).json({ error: 'Internal server error' });
      }
  }
};

module.exports = ReviewsController;
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE
});

const ReviewsController = {
    listReviews: async (req, res) => {
      const client = await pool.connect();
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
      } finally {
        client.release();
      }
    },

    getReviewMetadata: async (req, res) => {
      const client = await pool.connect();
      try {
        const { product_id } = req.query;

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

        const metadataResult = await client.query(metadataQuery, [product_id]);

        const characteristics = metadataResult.rows.reduce((acc, cur) => {
            acc[cur.characteristic_name] = { id: cur.characteristic_id, value: parseFloat(cur.average_value).toFixed(2) };
            return acc;
        }, {});

        res.status(200).json({
            product_id,
            characteristics
        });
      } catch (error) {
        console.error('Error fetching review metadata:', error);
        res.status(500).json({ error: 'Internal server error' });
      } finally {
        client.release();
      }
    },

    addReview: async (req, res) => {
        const client = await pool.connect();
        try {
            const { product_id, rating, summary, body, recommend, reviewer_name, reviewer_email, response, helpfulness, photos, characteristics } = req.body;

            await client.query('BEGIN');

            const reviewInsertQuery = `
                INSERT INTO "reviewsall"
                (product_id, rating, date, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING id
            `;
            const dateNow = Date.now();
            const reported = false;
            const reviewValues = [product_id, rating, dateNow, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness];
            const reviewResult = await client.query(reviewInsertQuery, reviewValues);
            const reviewId = reviewResult.rows[0].id;

            if (photos && photos.length) {
                const photoInsertQuery = `INSERT INTO reviews_photos (review_id, url) VALUES ($1, $2)`;
                for (const photoUrl of photos) {
                    await client.query(photoInsertQuery, [reviewId, photoUrl]);
                }
            }

            if (characteristics && typeof characteristics === 'object') {
                const charInsertQuery = `INSERT INTO characteristic_reviews (characteristic_id, review_id, value) VALUES ($1, $2, $3)`;
                for (const [charId, value] of Object.entries(characteristics)) {
                    await client.query(charInsertQuery, [charId, reviewId, value]);
                }
            }

            await client.query('COMMIT');
            res.status(201).json({ message: 'Review added successfully', reviewId: reviewId });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error adding review:', error);
            res.status(500).json({ error: 'Internal server error' });
        } finally {
            client.release();
        }
    },

    markReviewHelpful: async (req, res) => {
        const client = await pool.connect();
        try {
            const { review_id } = req.params;
            const query = 'UPDATE reviewsall SET helpfulness = helpfulness + 1 WHERE id = $1';
            await client.query(query, [review_id]);
            res.status(204).send('Review marked as helpful');
        } catch (error) {
            console.error('Error marking review as helpful:', error);
            res.status(500).json({ error: 'Internal server error' });
        } finally {
            client.release();
        }
    },

    reportReview: async (req, res) => {
        const client = await pool.connect();
        try {
            const { review_id } = req.params;
            const query = 'UPDATE reviewsall SET reported = true WHERE id = $1';
            await client.query(query, [review_id]);
            res.status(204).json({ message: 'Review has been reported' });
        } catch (error) {
            console.error('Error reporting review:', error);
            res.status(500).json({ error: 'Internal server error' });
        } finally {
            client.release();
        }
    }
};

module.exports = ReviewsController;

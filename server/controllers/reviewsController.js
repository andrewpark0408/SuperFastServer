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
        const { product_id, page = 1, count = 10 } = req.query; // Default to page 1, 10 items per page
        const offset = (page - 1) * count; // Calculate offset for pagination

        const query = `
            SELECT * FROM reviewsall
            WHERE product_id = $1
            LIMIT $2 OFFSET $3`;
        const result = await client.query(query, [product_id, count, offset]);

        res.status(200).json({
            product: product_id,
            page,
            count,
            results: result.rows
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  },

  getReviewMetadata: async (req, res) => {
    try {
        const { product_id } = req.query;
        const query = `
            SELECT rating, COUNT(rating) as count
            FROM reviewsall
            WHERE product_id = $1
            GROUP BY rating`;
        const result = await client.query(query, [product_id]);
        // Further processing to format the data as needed
        res.json({
            product_id,
            ratings: result.rows, // Simplified, transform as needed
        });
    } catch (error) {
        console.error('Error fetching review metadata:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  },

  addReview: async (req, res) => {
    try {
      const { product_id, rating, summary, body, recommend, reviewer_name, reviewer_email, response, helpfulness } = req.body;
      const query = `
          INSERT INTO reviewsall (product_id, rating, summary, body, recommend, reviewer_name, reviewer_email, response, helpfulness)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
      const result = await client.query(query, [product_id, rating, summary, body, recommend, reviewer_name, reviewer_email, response, helpfulness]);
      res.status(201).json({ message: 'Review added successfully', reviewId: result.rows[0].id });
    } catch (error) {
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

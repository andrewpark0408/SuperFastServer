require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');
const copyFrom = require('pg-copy-streams').from;

const inputFileReviews = './csv-imports/reviews.csv';
const inputFileCharacteristicReviews = './csv-imports/characteristic_reviews.csv';
const inputFileCharacteristics = './csv-imports/characteristics.csv';
const inputFileProducts = './csv-imports/product.csv';
const inputFileReviewsPhotos = './csv-imports/reviews_photos.csv';

const tableReviews = 'reviewsall';
const tableCharacteristicReviews = 'characteristic_reviews';
const tableCharacteristics = 'characteristics';
const tableProducts = 'products';
const tableReviewsPhotos = 'reviews_photos';

const client = new Client({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE
});

async function loadCsvIntoTable(inputFile, tableName) {
  console.time(`Loading ${tableName}`);

  // Truncate Table
  await client.query(`TRUNCATE ${tableName} CASCADE`);

  let copyQuery = `COPY ${tableName} FROM STDIN CSV HEADER`;
  if (tableName === 'reviewsall') {
      copyQuery = `COPY ${tableName}(id, product_id, rating, unix_timestamp, summary, body, recommend, reported, reviewer_name, reviewer_email, response, helpfulness) FROM STDIN CSV HEADER`;
  }

  const stream = client.query(copyFrom(copyQuery));
  const fileStream = fs.createReadStream(inputFile);

  await new Promise((resolve, reject) => {
      fileStream.on('error', reject);
      stream.on('error', reject);
      stream.on('finish', resolve);
      fileStream.pipe(stream);
  });

  if (tableName === 'reviewsall') {
    console.time('Date conversion'); // Start timing
    console.log('Converting unix_timestamp to date...');
    await client.query(`
        UPDATE reviewsall
        SET date = to_timestamp(unix_timestamp / 1000.0) AT TIME ZONE 'UTC'
        WHERE date IS NULL  -- This ensures that we only update rows where date is NULL
    `);
    console.timeEnd('Date conversion'); // End timing and log the time taken
  }
  console.timeEnd(`Loading ${tableName}`);
}

async function loadAllCsvs() {
  try {
      await client.connect();
      console.log('Connected to PostgreSQL database');

      await loadCsvIntoTable(inputFileProducts, tableProducts);
      await loadCsvIntoTable(inputFileReviews, tableReviews);
      await loadCsvIntoTable(inputFileCharacteristics, tableCharacteristics);
      await loadCsvIntoTable(inputFileCharacteristicReviews, tableCharacteristicReviews);
      await loadCsvIntoTable(inputFileReviewsPhotos, tableReviewsPhotos);

      console.log('All CSV files have been successfully imported.');

  } catch (error) {
      console.error('Error during CSV load:', error);
  } finally {
      client.end();
      console.log('PostgreSQL client connection closed');
  }
}

loadAllCsvs();
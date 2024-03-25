import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 100,  // Number of virtual users
  duration: '10s',  // Duration of the test
};

export default function() {
  const baseUrl = 'http://localhost:3000';

  // Use a variable product_id for testing
  const product_id = Math.floor(Math.random() * 100000) + 1;

  // Test the GET /reviews endpoint
  const reviewsResponse = http.get(`${baseUrl}/reviews?product_id=${product_id}&page=1&count=10`);
  check(reviewsResponse, {
    'GET reviews status is 200': (r) => r.status === 200,
    'GET reviews body is not empty': (r) => r.body.length > 0,
    'GET reviews contains data': (r) => JSON.parse(r.body).results.length > 0,
  });

  // Scenario for posting a review successfully
  const payload = JSON.stringify({
    product_id: product_id,
    rating: 5,
    summary: 'Great product',
    body: 'This product exceeded my expectations!',
    recommend: true,
    reviewer_name: 'John Doe',
    reviewer_email: 'johndoe@example.com',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const postResponse = http.post(`${baseUrl}/reviews`, payload, params);
  check(postResponse, {
    'POST review status is 201': (r) => r.status === 201,
    'POST review returns success message': (r) => JSON.parse(r.body).message === 'Review added successfully',
  });

  // Assuming reviewId is returned from POST /reviews for further operations
  const reviewId = JSON.parse(postResponse.body).reviewId;

  // Scenario for marking a review as helpful
  const markHelpfulResponse = http.put(`${baseUrl}/reviews/${reviewId}/helpful`);
  check(markHelpfulResponse, {
    'PUT mark helpful status is 204': (r) => r.status === 204,
  });

  // Scenario for marking a review as reported
  const markReportedResponse = http.put(`${baseUrl}/reviews/${reviewId}/report`);
  check(markReportedResponse, {
    'PUT mark reported status is 204': (r) => r.status === 204,
  });

  // Scenario for getting metadata for a product
  const metaResponse = http.get(`${baseUrl}/reviews/meta?product_id=${product_id}`);
  check(metaResponse, {
    'GET metadata status is 200': (r) => r.status === 200,
    'GET metadata contains data': (r) => JSON.parse(r.body).ratings != undefined,
  });

  sleep(1); // Add sleep to control the rate of requests
}

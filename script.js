import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 10,  // Number of virtual users
  duration: '30s',  // Duration of the test
};

export default function() {
  const baseUrl = 'http://localhost:3000';

  // Test the GET /reviews endpoint
  const reviewsResponse = http.get(`${baseUrl}/reviews?product_id=1&page=43044&count=10`);
  check(reviewsResponse, {
    'GET reviews status is 200': (r) => r.status === 200,
    'GET reviews body is not empty': (r) => r.body.length > 0,
  });
  sleep(1);

  // Add more scenarios here for POST /reviews, PUT /reviews/:review_id/helpful, etc.
}
const https = require('https');

exports.handler = async function(event, context) {
  const PLACE_ID = process.env.GOOGLE_PLACE_ID || '';
  const API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

  if (!API_KEY || !PLACE_ID) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ reviews: [] })
    };
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=rating,reviews&key=${API_KEY}`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const reviews = (parsed.result && parsed.result.reviews) ? parsed.result.reviews : [];
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ reviews })
          });
        } catch (e) {
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ reviews: [] })
          });
        }
      });
    }).on('error', () => {
      resolve({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ reviews: [] })
      });
    });
  });
};

const http = require('http');

function postJSON(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log("--- TESTING ROUTE VALIDATION ENDPOINTS ---");
  
  // Test booking with off-route location
  try {
    const invalidRes = await postJSON('/api/bookings', {
      rideId: '64735c72f6034a739d10ae4a',
      pickupLocation: 'Kasaragod',
      destination: 'Goa',
      seatsBooked: 1
    });
    console.log("Invalid Route Test Result:", invalidRes);
  } catch (err) {
    console.log("Error testing invalid route:", err.message);
  }
}

runTests();

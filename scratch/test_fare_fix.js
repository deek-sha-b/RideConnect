const http = require('http');

function requestJSON(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: 'localhost',
      port: 5050,
      path: path,
      method: method,
      headers: headers
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
    if (payload) req.write(payload);
    req.end();
  });
}

async function testFareFix() {
  console.log("=== TESTING COST / FEE CALCULATION FIXES ===");

  const timestamp = Date.now();

  // 1. Register driver user
  const driverReg = await requestJSON('POST', '/api/auth/register', {
    email: `driver_${timestamp}@test.com`,
    password: 'password123',
    name: 'Test Driver',
    phone: '9876543210',
    role: 'passenger'
  });
  let driverToken = driverReg.data.token;
  let driverId = driverReg.data.user.id;
  console.log("Driver Reg status:", driverReg.status, "ID:", driverId);

  // 2. Submit driver verification
  const submitDetails = await requestJSON('POST', '/api/driver/verify', {
    licenseNo: 'DL1234567890',
    idNo: 'ID123456',
    vehicleNo: 'KA19AB1234',
    vehicleType: 'Sedan',
    insuranceNo: 'INS123456',
    gender: 'Male'
  }, driverToken);
  console.log("Submit details status:", submitDetails.status);

  // 3. Admin login & approve driver
  const adminLogin = await requestJSON('POST', '/api/auth/login', {
    email: 'admin@rideconnect.com',
    password: 'admin123'
  });
  console.log("Admin login status:", adminLogin.status);
  if (adminLogin.status === 200) {
    const adminToken = adminLogin.data.token;
    const verifyRes = await requestJSON('PUT', `/api/admin/drivers/${driverId}/verify`, { status: 'approved' }, adminToken);
    console.log("Admin verify status:", verifyRes.status, verifyRes.data.message);
  }

  // Refetch driver token
  const driverLogin = await requestJSON('POST', '/api/auth/login', {
    email: `driver_${timestamp}@test.com`,
    password: 'password123'
  });
  driverToken = driverLogin.data.token;

  // 4. Register passenger
  const passengerReg = await requestJSON('POST', '/api/auth/register', {
    email: `passenger_${timestamp}@test.com`,
    password: 'password123',
    name: 'Test Passenger',
    phone: '9876543211',
    role: 'passenger'
  });
  const passengerToken = passengerReg.data.token;

  // 5. Driver offers a ride with seat price = 100, totalSeats = 4
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);

  const rideRes = await requestJSON('POST', '/api/rides', {
    stops: ['Kasaragod', 'Mangalore'],
    departureTime: tomorrow.toISOString(),
    totalSeats: 4,
    price: 24,
    instantBooking: false
  }, driverToken);

  console.log("Offer Ride Status:", rideRes.status);
  if (rideRes.status !== 201) {
    console.log("Failed to create ride:", rideRes.data);
    return;
  }
  const ride = rideRes.data;
  console.log("Ride Created - Total Price stored in DB:", ride.price); // 400

  // 6. Passenger searches for ride
  const searchRes = await requestJSON('GET', '/api/rides?pickup=Kasaragod&destination=Mangalore');
  console.log("Search Ride Status:", searchRes.status);
  const foundRide = searchRes.data.find(r => r._id === ride._id);
  if (foundRide) {
    console.log("Search Result Ride details:");
    console.log("  Segment Base Fare per Seat (price):", foundRide.price); // 100
    console.log("  Service Fee:", foundRide.serviceFee); // 15
    console.log("  Total Passenger Price:", foundRide.totalPassengerPrice); // 115
    console.log("  Driver Total Price:", foundRide.totalPrice); // 400
  }

  // 7. Passenger books 1 seat
  const bookingRes = await requestJSON('POST', '/api/bookings', {
    rideId: ride._id,
    seatsBooked: 1,
    pickupLocation: 'Kasaragod',
    destination: 'Mangalore'
  }, passengerToken);

  console.log("Booking Created Status:", bookingRes.status);
  const booking = bookingRes.data;
  console.log("Initial Booking Fares:");
  console.log("  booking.fare:", booking.fare); // 100
  console.log("  booking.baseFare:", booking.baseFare); // 100
  console.log("  booking.serviceFee:", booking.serviceFee); // 15
  console.log("  booking.totalAmount:", booking.totalAmount); // 115

  // 8. Driver accepts booking (triggers recalculateFaresForRide)
  const acceptRes = await requestJSON('PUT', `/api/bookings/${booking._id}/status`, {
    status: 'accepted'
  }, driverToken);

  console.log("Driver Accept Status:", acceptRes.status);
  const acceptedBooking = acceptRes.data;
  console.log("Post-Acceptance Booking Fares (recalculateFaresForRide):");
  console.log("  booking.fare:", acceptedBooking.fare); // 100
  console.log("  booking.baseFare:", acceptedBooking.baseFare); // 100
  console.log("  booking.serviceFee:", acceptedBooking.serviceFee); // 15
  console.log("  booking.totalAmount:", acceptedBooking.totalAmount); // 115

  if (acceptedBooking.fare === 24 && acceptedBooking.totalAmount === 39) {
    console.log("\n✅ SUCCESS: Cost/Fee calculations are completely accurate and fixed!");
  } else {
    console.log(`\n❌ FAILURE: Expected fare 24 & total 39, got fare ${acceptedBooking.fare} & total ${acceptedBooking.totalAmount}`);
  }
}

testFareFix().catch(console.error);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const firebaseAdmin = require('./firebaseAdmin');

const { User, Ride, Booking, Message, SOS } = require('./models');

const LOCAL_PLACES = {
  'Kasaragod': { lat: 12.4984, lng: 74.9896 },
  'Puttur': { lat: 12.7623, lng: 75.2003 },
  'Vitla': { lat: 12.7667, lng: 75.0833 },
  'Mangalore': { lat: 12.9141, lng: 74.8560 },
  'Badiadka': { lat: 12.5884, lng: 75.0698 },
  'Perla': { lat: 12.6426, lng: 75.1049 }
};

function extractCoords(stop) {
  if (!stop) return null;
  if (typeof stop === 'object') {
    if (stop.lat != null && stop.lng != null) return { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) };
    if (stop.coords && stop.coords.lat != null) return { lat: parseFloat(stop.coords.lat), lng: parseFloat(stop.coords.lng) };
  }
  if (typeof stop === 'string' && LOCAL_PLACES[stop]) {
    return LOCAL_PLACES[stop];
  }
  return null;
}

function getStopName(stop) {
  if (!stop) return '';
  if (typeof stop === 'string') return stop;
  if (typeof stop === 'object' && stop.name) return stop.name;
  return String(stop);
}

function getHaversineDistance(loc1, loc2) {
  const coords1 = extractCoords(loc1);
  const coords2 = extractCoords(loc2);
  if (!coords1 || !coords2) return 0;

  const R = 6371; // Radius of earth in km
  const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
  const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getRouteDistance(stops) {
  if (!stops || stops.length < 2) return 0;
  let dist = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    dist += getHaversineDistance(stops[i], stops[i + 1]);
  }
  return dist;
}

function getSegmentDistance(stops, pickup, destination) {
  if (!stops || stops.length < 2) return 0;

  const names = stops.map(getStopName);
  let startIdx = names.indexOf(pickup);
  let endIdx = names.indexOf(destination);

  // Fallback case-insensitive / partial match
  if (startIdx === -1) {
    startIdx = names.findIndex(n => n.toLowerCase().includes((pickup || '').toLowerCase()));
  }
  if (endIdx === -1) {
    endIdx = names.findIndex(n => n.toLowerCase().includes((destination || '').toLowerCase()));
  }

  if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
    // If not matching by name, return full route distance as default segment estimate
    return getRouteDistance(stops);
  }

  let dist = 0;
  for (let i = startIdx; i < endIdx; i++) {
    dist += getHaversineDistance(stops[i], stops[i + 1]);
  }
  return dist;
}

// BlaBlaCar Vehicle Operating Costs & Service Fee Configuration
const VEHICLE_OPERATING_COSTS = {
  'Hatchback': { fuelCostPerKm: 3.5, wearCostPerKm: 1.0, totalCostPerKm: 4.5 },
  'Sedan':     { fuelCostPerKm: 4.5, wearCostPerKm: 1.5, totalCostPerKm: 6.0 },
  'SUV':       { fuelCostPerKm: 6.0, wearCostPerKm: 2.0, totalCostPerKm: 8.0 },
  'Electric':  { fuelCostPerKm: 1.5, wearCostPerKm: 1.0, totalCostPerKm: 2.5 }
};
const SERVICE_FEE_PERCENTAGE = 0.12; // 12% passenger booking fee
const MIN_SERVICE_FEE = 15; // ₹15 minimum fee

function calculateRecommendedFare(stops, vehicleType, totalSeats) {
  const totalDist = getRouteDistance(stops);
  const costConfig = VEHICLE_OPERATING_COSTS[vehicleType] || VEHICLE_OPERATING_COSTS['Sedan'];
  const totalTripCost = totalDist * costConfig.totalCostPerKm;
  const seats = Math.max(1, parseInt(totalSeats) || 1);
  const recPricePerSeat = parseFloat((totalTripCost / seats).toFixed(2));
  
  return {
    totalDist,
    costConfig,
    totalTripCost,
    recPricePerSeat,
    minAllowedSeatPrice: parseFloat((0.80 * recPricePerSeat).toFixed(2)),
    maxAllowedSeatPrice: parseFloat((1.20 * recPricePerSeat).toFixed(2))
  };
}

function calculatePassengerServiceFee(baseFare) {
  const serviceFee = Math.max(MIN_SERVICE_FEE, Math.round(baseFare * SERVICE_FEE_PERCENTAGE));
  return {
    baseFare: parseFloat(baseFare.toFixed(2)),
    serviceFee,
    totalAmount: parseFloat((baseFare + serviceFee).toFixed(2))
  };
}

function isPassengerRouteOnDriverRoute(driverPickup, driverDest, passengerPickup, passengerDest) {
  const checkInOrder = (arr, p1, p2, p3, p4) => {
    const idx1 = arr.indexOf(p1);
    const idx2 = arr.indexOf(p2);
    const idx3 = arr.indexOf(p3);
    const idx4 = arr.indexOf(p4);
    return idx1 !== -1 && idx2 !== -1 && idx3 !== -1 && idx4 !== -1 &&
      idx1 <= idx3 && idx3 < idx4 && idx4 <= idx2;
  };

  const ROUTES = [
    ['Kasaragod', 'Badiadka', 'Perla', 'Vitla', 'Puttur'],
    ['Kasaragod', 'Badiadka', 'Perla', 'Vitla', 'Mangalore'],
    ['Puttur', 'Vitla', 'Mangalore'],
    ['Kasaragod', 'Mangalore']
  ];

  for (const route of ROUTES) {
    if (checkInOrder(route, driverPickup, driverDest, passengerPickup, passengerDest)) {
      return true;
    }
    const reversed = [...route].reverse();
    if (checkInOrder(reversed, driverPickup, driverDest, passengerPickup, passengerDest)) {
      return true;
    }
  }
  return false;
}

async function recalculateFaresForRide(rideId) {
  const ride = await Ride.findById(rideId);
  if (!ride) return;

  // Lock fares once the ride starts (active, completed, cancelled)
  if (ride.status === 'active' || ride.status === 'completed' || ride.status === 'cancelled') {
    console.log(`DEBUG: Fares are locked because ride ${rideId} is ${ride.status}`);
    return;
  }

  const activeBookings = await Booking.find({
    ride: rideId,
    status: { $in: ['accepted', 'started', 'completed'] }
  });

  // Calculate the total weight (passengerDist * seatsBooked) for all active bookings
  let totalWeight = 0;
  const bookingsWithDist = [];

  for (const b of activeBookings) {
    const passengerDist = getSegmentDistance(ride.stops, b.pickupLocation, b.destination);
    const weight = passengerDist * b.seatsBooked;
    totalWeight += weight;
    bookingsWithDist.push({ booking: b, weight });
  }

  // Split the total ride price proportionally among active bookings based on their weight
  for (const item of bookingsWithDist) {
    const b = item.booking;
    const fareVal = totalWeight > 0 ? (item.weight / totalWeight) * ride.price : 0;
    b.fare = parseFloat(fareVal.toFixed(2));
    b.deposit = 0;
    await b.save();
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_rideconnect_token_key_123!';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration for Document Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rideconnect')
  .then(() => {
    console.log('MongoDB Connected Successfully!');
    seedDatabase();
  })
  .catch(err => console.error('MongoDB Connection Error:', err));

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Seed Database Function
async function seedDatabase() {
  try {
    // Check if database is already seeded (has users)
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already populated. Skipping database seeding to preserve user data.');
      return;
    }

    // Drop existing collections to force re-seed with local places
    await User.deleteMany({});
    await Ride.deleteMany({});
    await Booking.deleteMany({});
    await Message.deleteMany({});

    console.log('Seeding Database with Default Users and Rides...');

    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const driverPassword = await bcrypt.hash('password123', salt);
    const passengerPassword = await bcrypt.hash('password123', salt);

    // Create Admin
    const admin = await User.create({
      name: 'RideConnect Admin',
      email: 'admin@rideconnect.com',
      password: adminPassword,
      phone: '+1-555-0199',
      role: 'admin'
    });

    // Create Verified Driver
    const driver = await User.create({
      name: 'David Miller',
      email: 'driver@rideconnect.com',
      password: driverPassword,
      phone: '+1-555-0101',
      role: 'driver',
      rating: 0,
      ratingCount: 0,
      driverDetails: {
        licenseNo: 'DL-9876543210',
        licenseUrl: '/uploads/placeholder-doc.pdf',
        idNo: 'ID-12345678',
        vehicleNo: 'KA-19-M-1234',
        vehicleType: 'Electric',
        insuranceNo: 'INS-8812903',
        gender: 'Male',
        selfieUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        isVerified: true,
        verificationStatus: 'approved',
        earnings: 350.50
      }
    });

    // // Create another pending driver
    // await User.create({
    //   name: 'Sarah Connor',
    //   email: 'sarah@rideconnect.com',
    //   password: driverPassword,
    //   phone: '+1-555-0144',
    //   role: 'passenger',
    //   driverDetails: {
    //     licenseNo: 'DL-1122334455',
    //     licenseUrl: '/uploads/placeholder-doc.pdf',
    //     idNo: 'ID-55667788',
    //     vehicleNo: 'KA-21-P-9999',
    //     vehicleType: 'Sedan',
    //     insuranceNo: 'INS-9900223',
    //     gender: 'Female',
    //     selfieUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    //     isVerified: false,
    //     verificationStatus: 'pending'
    //   }
    // });

    // Create Passenger
    const passenger = await User.create({
      name: 'Alex Johnson',
      email: 'passenger@rideconnect.com',
      password: passengerPassword,
      phone: '+1-555-0102',
      role: 'passenger',
      rating: 0,
      ratingCount: 0,
      favoriteLocations: ['Kasaragod', 'Mangalore']
    });

    // Create default Rides
    const now = new Date();
    const ride1Date = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000); // tomorrow + 4 hours
    const ride2Date = new Date(now.getTime() + 48 * 60 * 60 * 1000); // day after tomorrow

    // Ride 1: Kasaragod to Mangalore
    const ride1Stops = ['Kasaragod', 'Badiadka', 'Perla', 'Vitla', 'Mangalore'];
    const dist1 = getRouteDistance(ride1Stops);
    const ride1 = await Ride.create({
      driver: driver._id,
      pickupLocation: 'Kasaragod',
      pickupCoords: { lat: 12.4984, lng: 74.9896 },
      destination: 'Mangalore',
      destinationCoords: { lat: 12.9141, lng: 74.8560 },
      stops: ride1Stops,
      departureTime: ride1Date,
      price: 500.00,
      totalSeats: 4,
      availableSeats: 3,
      vehicleType: 'Electric',
      genderPreference: 'Any',
      status: 'pending'
    });

    // Ride 2: Puttur to Vitla
    const ride2Stops = ['Puttur', 'Vitla'];
    const dist2 = getRouteDistance(ride2Stops);
    await Ride.create({
      driver: driver._id,
      pickupLocation: 'Puttur',
      pickupCoords: { lat: 12.7623, lng: 75.2003 },
      destination: 'Vitla',
      destinationCoords: { lat: 12.7667, lng: 75.0833 },
      stops: ride2Stops,
      departureTime: ride2Date,
      price: 100.00,
      totalSeats: 3,
      availableSeats: 3,

      genderPreference: 'Any',
      status: 'pending'
    });

    // Create a booking for Passenger on Ride 1
    const booking1Fare = 500.00;
    await Booking.create({
      ride: ride1._id,
      passenger: passenger._id,
      pickupLocation: 'Kasaragod',
      destination: 'Mangalore',
      seatsBooked: 1,
      status: 'accepted',
      otp: '4829',
      fare: booking1Fare,
      deposit: parseFloat((booking1Fare * 0.20).toFixed(2)),
      assignedDriver: driver._id,
      acceptedAt: new Date()
    });

    // Create some initial chat messages for Ride 1
    await Message.create({
      ride: ride1._id,
      sender: driver._id,
      content: 'Hello! I will be picking you up from Kasaragod. See you soon!'
    });

    await Message.create({
      ride: ride1._id,
      sender: passenger._id,
      content: 'Sounds good David! I will be waiting near the entrance.'
    });

    console.log('Database Seeding Completed Successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// ================= AUTH ROUTES =================
app.post('/api/auth/register', upload.single('license'), async (req, res) => {
  try {
    const { name, email, password, phone, role, licenseNo } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (role === 'driver') {
      if (!licenseNo) {
        return res.status(400).json({ message: 'Driving license number is required for drivers.' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'Driving license document upload is required for drivers.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const licenseUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const driverDetails = role === 'driver' ? {
      licenseNo,
      licenseUrl,
      idNo: 'N/A',
      vehicleNo: 'N/A',
      vehicleModel: 'N/A',
      vehicleType: 'Sedan',
      insuranceNo: 'N/A',
      gender: 'Other',
      selfieUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      isVerified: false,
      verificationStatus: 'pending',
      earnings: 0
    } : {
      licenseNo: '',
      licenseUrl: '',
      idNo: '',
      vehicleNo: '',
      vehicleModel: '',
      vehicleType: 'Sedan',
      insuranceNo: '',
      gender: '',
      selfieUrl: '',
      isVerified: false,
      verificationStatus: 'unsubmitted',
      earnings: 0
    };

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: role || 'passenger',
      driverDetails
    });

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        rating: newUser.rating,
        driverDetails: newUser.driverDetails
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        favoriteLocations: user.favoriteLocations,
        driverDetails: user.driverDetails
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    // Verify the Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const { email, name, picture } = decodedToken;
    
    // Check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create a new user with dummy password (since they use Google Auth)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), salt);
      
      user = await User.create({
        name: name || 'Google User',
        email,
        password: hashedPassword,
        phone: '', // Google doesn't always provide phone numbers
        role: 'passenger', // Default role
        driverDetails: {
          licenseNo: '',
          licenseUrl: '',
          idNo: '',
          vehicleNo: '',
          vehicleModel: '',
          vehicleType: 'Sedan',
          insuranceNo: '',
          gender: '',
          selfieUrl: picture || '',
          isVerified: false,
          verificationStatus: 'unsubmitted',
          earnings: 0
        }
      });
    }

    const jwtToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rating: user.rating,
        favoriteLocations: user.favoriteLocations,
        driverDetails: user.driverDetails
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Google authentication failed', error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(444).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, favoriteLocations } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (favoriteLocations) updateData.favoriteLocations = favoriteLocations;

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});


// ================= DRIVER VERIFICATION ROUTES =================
app.post('/api/driver/verify', authenticateToken, upload.single('license'), async (req, res) => {
  try {
    const { licenseNo } = req.body;
    const file = req.file;

    const licenseUrl = file ? `/uploads/${file.filename}` : '/uploads/placeholder-doc.pdf';

    const driverDetails = {
      licenseNo,
      licenseUrl,
      idNo: 'N/A',
      vehicleNo: 'KA-19-M-2026',
      vehicleModel: 'Tesla Model S (White)',
      vehicleType: 'Electric',
      insuranceNo: 'N/A',
      gender: 'Other',
      selfieUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      isVerified: false,
      verificationStatus: 'pending',
      earnings: 0
    };

    const user = await User.findByIdAndUpdate(req.user.id, {
      driverDetails,
      role: 'passenger' // Keep as passenger until Admin approves
    }, { new: true }).select('-password');

    res.json({
      message: 'Driving license submitted successfully. Waiting for admin approval.',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Verification submission failed', error: error.message });
  }
});


// ================= RIDE ROUTES =================

// Search rides with filters
app.get('/api/rides', async (req, res) => {
  try {
    const { pickup, destination, date, seats, vehicleType, genderPreference, maxPrice, instantBooking, ladiesOnly, maxTwoInBack } = req.query;
    const queryFilter = { status: 'pending', availableSeats: { $gt: 0 } };

    // Date check (match same day or later)
    if (date) {
      const searchDate = new Date(date);
      const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
      queryFilter.departureTime = { $gte: startOfDay, $lte: endOfDay };
    } else {
      // only show future rides
      queryFilter.departureTime = { $gte: new Date() };
    }

    if (seats) {
      queryFilter.availableSeats = { $gte: parseInt(seats) };
    }
    if (vehicleType && vehicleType !== 'Any') {
      queryFilter.vehicleType = vehicleType;
    }
    if (genderPreference && genderPreference !== 'Any') {
      queryFilter.genderPreference = genderPreference;
    }
    if (instantBooking === 'true') {
      queryFilter.instantBooking = true;
    }
    if (ladiesOnly === 'true') {
      queryFilter.ladiesOnly = true;
    }
    if (maxTwoInBack === 'true') {
      queryFilter.maxTwoInBack = true;
    }

    let rides = await Ride.find(queryFilter).populate('driver', 'name rating ratingCount bio chatPreference musicPreference petsAllowed smokingAllowed ladiesOnlyPref driverDetails');

    // Filter by pickup & destination (intermediate segments)
    if (pickup || destination) {
      rides = rides.filter(ride => {
        const stopNames = (ride.stops || []).map(getStopName);
        const pQuery = (pickup || '').trim().toLowerCase();
        const dQuery = (destination || '').trim().toLowerCase();

        let pIdx = pQuery ? stopNames.findIndex(name => name.toLowerCase().includes(pQuery)) : 0;
        let dIdx = dQuery ? stopNames.findIndex(name => name.toLowerCase().includes(dQuery)) : stopNames.length - 1;

        if (pQuery && pIdx === -1) return false;
        if (dQuery && dIdx === -1) return false;

        return pIdx < dIdx || (pIdx === 0 && dIdx === stopNames.length - 1);
      });
    }

    // Map each ride to calculate segment details and service fee
    rides = rides.map(ride => {
      const p = pickup || ride.pickupLocation;
      const d = destination || ride.destination;
      const dist = getSegmentDistance(ride.stops, p, d);
      const totalRouteDist = getRouteDistance(ride.stops);
      const seatPriceDriver = ride.totalSeats > 0 ? (ride.price / ride.totalSeats) : ride.price;
      const segmentBaseFare = totalRouteDist > 0 ? parseFloat(((dist / totalRouteDist) * seatPriceDriver).toFixed(2)) : 0;
      const feeDetails = calculatePassengerServiceFee(segmentBaseFare);

      const rideObj = ride.toObject();
      rideObj.totalPrice = ride.price; // Driver total trip price
      rideObj.price = feeDetails.baseFare; // Driver segment price per seat
      rideObj.serviceFee = feeDetails.serviceFee; // Platform 12% booking fee
      rideObj.totalPassengerPrice = feeDetails.totalAmount; // Total amount paid by passenger
      rideObj.recommendedPricePerSeat = ride.recommendedPricePerSeat || seatPriceDriver;
      rideObj.deposit = 0;
      rideObj.distance = dist;
      return rideObj;
    });

    // Filter by maxPrice if provided
    if (maxPrice) {
      rides = rides.filter(ride => ride.totalPassengerPrice <= parseFloat(maxPrice));
    }

    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: 'Error searching rides', error: error.message });
  }
});

// Create a ride (Offer Ride)
app.post('/api/rides', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'driver' || !user.driverDetails.isVerified) {
      return res.status(403).json({ message: 'Only verified drivers can offer rides' });
    }

    const {
      stops,
      departureTime, totalSeats, genderPreference, price,
      instantBooking, maxTwoInBack, ladiesOnly, luggageSize, amenities, carModel, carColor
    } = req.body;

    if (!stops || !Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({ message: 'Rides must contain at least 2 stops.' });
    }

    // Process dynamic stops (support both strings and {name, lat, lng} objects)
    const formattedStops = [];
    const stopDetails = [];
    for (const stop of stops) {
      if (typeof stop === 'object' && stop && stop.name) {
        formattedStops.push(stop.name);
        stopDetails.push({
          name: stop.name,
          lat: parseFloat(stop.lat || 0),
          lng: parseFloat(stop.lng || 0)
        });
      } else if (typeof stop === 'string' && stop.trim()) {
        const name = stop.trim();
        const coords = extractCoords(name) || { lat: 0, lng: 0 };
        formattedStops.push(name);
        stopDetails.push({ name, lat: coords.lat, lng: coords.lng });
      }
    }

    if (stopDetails.length < 2) {
      return res.status(400).json({ message: 'Please provide at least 2 valid stops for the trip route.' });
    }

    const vehicleType = user.driverDetails.vehicleType || 'Sedan';
    const recFare = calculateRecommendedFare(stopDetails, vehicleType, totalSeats);

    const seatPrice = parseFloat(price);
    if (!seatPrice || isNaN(seatPrice) || seatPrice <= 0) {
      return res.status(400).json({ message: 'Please enter a valid seat price.' });
    }

    if (recFare.recPricePerSeat > 0 && (seatPrice < recFare.minAllowedSeatPrice || seatPrice > recFare.maxAllowedSeatPrice)) {
      return res.status(400).json({
        message: `Seat price ₹${seatPrice} is outside the allowed BlaBlaCar limits (₹${recFare.minAllowedSeatPrice} - ₹${recFare.maxAllowedSeatPrice}).`
      });
    }

    const pickupLocation = stopDetails[0].name;
    const destination = stopDetails[stopDetails.length - 1].name;
    const pickupCoords = { lat: stopDetails[0].lat, lng: stopDetails[0].lng };
    const destinationCoords = { lat: stopDetails[stopDetails.length - 1].lat, lng: stopDetails[stopDetails.length - 1].lng };

    const departure = new Date(departureTime);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 5);
    maxDate.setHours(23, 59, 59, 999);

    if (departure < tomorrow || departure > maxDate) {
      return res.status(400).json({ message: 'Rides can only be scheduled from tomorrow up to 5 days in advance.' });
    }

    const totalSeatsNum = parseInt(totalSeats) || 1;

    const ride = await Ride.create({
      driver: req.user.id,
      pickupLocation,
      pickupCoords,
      destination,
      destinationCoords,
      stops: formattedStops,
      stopDetails: stopDetails,
      stopoverPoints: formattedStops.slice(1, -1),
      departureTime: departure,
      price: seatPrice * totalSeatsNum,
      recommendedPricePerSeat: recFare.recPricePerSeat,
      operatingCostPerKm: recFare.costConfig.totalCostPerKm,
      totalSeats: totalSeatsNum,
      availableSeats: totalSeatsNum,
      vehicleType,
      carModel: carModel || user.driverDetails.vehicleModel || 'Sedan',
      carColor: carColor || '',
      genderPreference: genderPreference || 'Any',
      instantBooking: instantBooking === true || instantBooking === 'true',
      maxTwoInBack: maxTwoInBack === true || maxTwoInBack === 'true',
      ladiesOnly: ladiesOnly === true || ladiesOnly === 'true',
      luggageSize: luggageSize || 'Medium',
      amenities: amenities || {
        chatLevel: user.chatPreference || 'BlaBla',
        smoking: user.smokingAllowed || false,
        pets: user.petsAllowed || false,
        music: user.musicPreference || true
      },
      status: 'pending'
    });

    res.status(201).json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Error creating ride', error: error.message });
  }
});

// List driver's offered rides
app.get('/api/rides/driver', authenticateToken, async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.user.id }).sort({ departureTime: -1 });
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver rides', error: error.message });
  }
});

// Get ride details (with bookings)
app.get('/api/rides/:id', async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('driver', 'name rating ratingCount phone driverDetails');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const bookings = await Booking.find({ ride: ride._id }).populate('passenger', 'name rating phone');
    res.json({ ride, bookings });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ride details', error: error.message });
  }
});


// ================= BOOKING ROUTES =================

// Request booking
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { rideId, seatsBooked, pickupLocation, destination, bookingNote } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const requestedSeats = parseInt(seatsBooked) || 1;

    if (ride.availableSeats < requestedSeats) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    if (ride.driver.toString() === req.user.id) {
      return res.status(400).json({ message: 'Drivers cannot book their own rides' });
    }

    // Check if passenger already booked this ride
    const existing = await Booking.findOne({ ride: rideId, passenger: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You have already booked or requested a seat on this ride' });
    }

    // Generate random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const pLoc = pickupLocation || ride.pickupLocation;
    const dLoc = destination || ride.destination;

    const pIdx = ride.stops.indexOf(pLoc);
    const dIdx = ride.stops.indexOf(dLoc);

    if (pIdx === -1 || dIdx === -1) {
      return res.status(400).json({ message: 'Selected pickup/destination stops are not part of the driver\'s route.' });
    }
    if (pIdx >= dIdx) {
      return res.status(400).json({ message: 'Pickup stop must come before the drop stop on the route.' });
    }

    const distance = getSegmentDistance(ride.stops, pLoc, dLoc);
    const totalRouteDist = getRouteDistance(ride.stops);
    const seatPriceDriver = ride.totalSeats > 0 ? (ride.price / ride.totalSeats) : ride.price;
    const segmentBaseFarePerSeat = totalRouteDist > 0 ? parseFloat(((distance / totalRouteDist) * seatPriceDriver).toFixed(2)) : 0;
    const baseFareTotal = segmentBaseFarePerSeat * requestedSeats;
    const feeDetails = calculatePassengerServiceFee(baseFareTotal);
    const deposit = 0;

    // Instant Booking auto-approval vs Manual Request
    const initialStatus = ride.instantBooking ? 'accepted' : 'requested';

    const booking = await Booking.create({
      ride: rideId,
      passenger: req.user.id,
      pickupLocation: pLoc,
      destination: dLoc,
      seatsBooked: requestedSeats,
      passengersCount: requestedSeats,
      bookingNote: bookingNote || '',
      status: initialStatus,
      otp,
      fare: feeDetails.baseFare,
      baseFare: feeDetails.baseFare,
      serviceFee: feeDetails.serviceFee,
      totalAmount: feeDetails.totalAmount,
      deposit,
      assignedDriver: ride.instantBooking ? ride.driver : undefined,
      acceptedAt: ride.instantBooking ? new Date() : undefined
    });

    if (ride.instantBooking) {
      ride.availableSeats -= requestedSeats;
      await ride.save();
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
});

// Passenger bookings & trip history
app.get('/api/bookings/passenger', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ passenger: req.user.id })
      .populate({
        path: 'ride',
        populate: { path: 'driver', select: 'name phone rating ratingCount driverDetails' }
      })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
});

// Bookings requests for driver's rides
app.get('/api/bookings/driver', authenticateToken, async (req, res) => {
  try {
    const driverRides = await Ride.find({ driver: req.user.id }).select('_id');
    const rideIds = driverRides.map(r => r._id);

    const bookings = await Booking.find({ ride: { $in: rideIds } })
      .populate('ride')
      .populate('passenger', 'name phone rating ratingCount')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver bookings', error: error.message });
  }
});

// Update booking status (accept, reject, start ride with OTP, complete ride, cancel)
app.put('/api/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, otp } = req.body;
    const booking = await Booking.findById(req.params.id).populate('ride');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isDriver = booking.ride.driver.toString() === req.user.id;
    const isPassenger = booking.passenger.toString() === req.user.id;

    if (!isDriver && !isPassenger && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized actions on this booking' });
    }

    if (status === 'accepted') {
      if (!isDriver) return res.status(403).json({ message: 'Only drivers can accept bookings' });
      const driverUser = await User.findById(req.user.id);
      if (!driverUser || driverUser.role !== 'driver' || !driverUser.driverDetails?.isVerified) {
        return res.status(403).json({ message: 'Only verified and approved drivers can accept bookings' });
      }
      booking.status = 'accepted';
      booking.assignedDriver = req.user.id;
      booking.acceptedAt = new Date();

      // Update available seats
      const ride = await Ride.findById(booking.ride._id);
      if (ride.availableSeats < booking.seatsBooked) {
        return res.status(400).json({ message: 'Not enough seats available to accept this booking.' });
      }
      ride.availableSeats -= booking.seatsBooked;
      await ride.save();
    }
    else if (status === 'rejected') {
      if (!isDriver) return res.status(403).json({ message: 'Only drivers can reject bookings' });
      booking.status = 'rejected';
    }
    else if (status === 'started') {
      if (!isDriver) return res.status(403).json({ message: 'Only drivers can start the trip' });
      const driverUser = await User.findById(req.user.id);
      if (!driverUser || driverUser.role !== 'driver' || !driverUser.driverDetails?.isVerified) {
        return res.status(403).json({ message: 'Only verified and approved drivers can start trips' });
      }
      if (booking.otp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP code. Cannot start ride.' });
      }
      booking.status = 'started';

      // Mark ride as active
      await Ride.findByIdAndUpdate(booking.ride._id, { status: 'active' });

      // Trigger location tracking simulation
      const bookingWithRide = await Booking.findById(booking._id).populate('ride');
      if (bookingWithRide && bookingWithRide.ride) {
        const rideId = bookingWithRide.ride._id.toString();
        const stops = bookingWithRide.ride.stops;
        if (stops && stops.length >= 2) {
          // Delay simulation slightly to allow client to connect/join room
          setTimeout(() => {
            startRideSimulation(rideId, stops);
          }, 1000);
        }
      }
    }
    else if (status === 'completed') {
      if (!isDriver) return res.status(403).json({ message: 'Only drivers can complete the trip' });
      booking.status = 'completed';

      // Update ride status to completed if all bookings on it are complete/cancelled
      // Calculate earnings for the driver
      const driver = await User.findById(booking.ride.driver);
      const tripEarning = booking.fare || (booking.ride.price * booking.seatsBooked);
      driver.driverDetails.earnings += tripEarning;
      await driver.save();

      // Check if all seats filled are completed
      const otherBookings = await Booking.find({ ride: booking.ride._id, status: { $ne: 'completed' } });
      if (otherBookings.length === 0) {
        await Ride.findByIdAndUpdate(booking.ride._id, { status: 'completed' });
        stopRideSimulation(booking.ride._id.toString());
      }
    }
    else if (status === 'cancelled') {
      // Passengers or drivers can cancel. If already accepted, restore seats.
      if (booking.status === 'accepted' || booking.status === 'started') {
        const ride = await Ride.findById(booking.ride._id);
        ride.availableSeats += booking.seatsBooked;
        await ride.save();

        if (booking.status === 'started') {
          stopRideSimulation(booking.ride._id.toString());
        }
      }
      booking.status = 'cancelled';
    }

    await booking.save();

    // Recalculate fares if accepted or cancelled
    if (status === 'accepted' || status === 'cancelled') {
      await recalculateFaresForRide(booking.ride._id);
    }

    // Refetch the updated booking to return it with split fare
    const updatedBooking = await Booking.findById(booking._id).populate('ride');
    res.json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking status', error: error.message });
  }
});

// Submit ratings
app.post('/api/bookings/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { rating, review, rateTarget } = req.body; // rateTarget is 'driver' or 'passenger'
    const booking = await Booking.findById(req.params.id).populate('ride');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (rateTarget === 'driver') {
      // Passenger rating driver
      if (booking.passenger.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Only the passenger can rate the driver' });
      }
      booking.ratingToDriver = rating;
      booking.reviewToDriver = review;
      await booking.save();

      // Update driver average rating
      const driver = await User.findById(booking.ride.driver);
      const totalRatings = driver.ratingCount * driver.rating + rating;
      driver.ratingCount += 1;
      driver.rating = totalRatings / driver.ratingCount;
      await driver.save();
    } else {
      // Driver rating passenger
      if (booking.ride.driver.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Only the driver can rate the passenger' });
      }
      booking.ratingToPassenger = rating;
      booking.reviewToPassenger = review;
      await booking.save();

      // Update passenger average rating
      const passenger = await User.findById(booking.passenger);
      const totalRatings = passenger.ratingCount * passenger.rating + rating;
      passenger.ratingCount += 1;
      passenger.rating = totalRatings / passenger.ratingCount;
      await passenger.save();
    }

    res.json({ message: 'Rating submitted successfully', booking });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting rating', error: error.message });
  }
});


// ================= CHAT ROUTES =================
app.get('/api/chat/:rideId', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ ride: req.params.rideId })
      .populate('sender', 'name role')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat messages', error: error.message });
  }
});

app.post('/api/chat/:rideId', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const msg = await Message.create({
      ride: req.params.rideId,
      sender: req.user.id,
      content
    });

    const populatedMsg = await Message.findById(msg._id).populate('sender', 'name role');
    res.status(201).json(populatedMsg);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});


// ================= ADMIN PANEL ROUTES =================

// Get list of drivers and verification documents
app.get('/api/admin/drivers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access required' });
    }
    // Users that have submitted document details (verificationStatus is pending/approved/rejected)
    const drivers = await User.find({
      'driverDetails.verificationStatus': { $in: ['pending', 'approved', 'rejected'] }
    }).select('-password');
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching verification requests', error: error.message });
  }
});

// Approve/Reject registration documents
app.put('/api/admin/drivers/:id/verify', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access required' });
    }
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid verification status' });
    }

    const updatedUser = await User.findById(req.params.id);
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    updatedUser.driverDetails.verificationStatus = status;
    if (status === 'approved') {
      updatedUser.driverDetails.isVerified = true;
      updatedUser.role = 'driver'; // Upgrade user's role to driver
    } else {
      updatedUser.driverDetails.isVerified = false;
      updatedUser.role = 'passenger'; // Set role back to passenger if rejected
    }

    await updatedUser.save();
    res.json({ message: `Driver verification status set to: ${status}`, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Error updating driver verification', error: error.message });
  }
});

// Admin stats/analytics
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access required' });
    }

    const totalUsers = await User.countDocuments();
    const totalRides = await Ride.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.find({ status: 'completed' }).populate('ride');

    let totalPlatformRevenue = 0;
    completedBookings.forEach(booking => {
      if (booking.ride) {
        totalPlatformRevenue += booking.ride.price * booking.seatsBooked;
      }
    });

    // Mock chart data for weekly usage stats
    const weeklyAnalytics = [
      { day: 'Mon', rides: 12, bookings: 18, revenue: 320 },
      { day: 'Tue', rides: 15, bookings: 22, revenue: 410 },
      { day: 'Wed', rides: 18, bookings: 30, revenue: 580 },
      { day: 'Thu', rides: 24, bookings: 42, revenue: 850 },
      { day: 'Fri', rides: 32, bookings: 55, revenue: 1200 },
      { day: 'Sat', rides: 40, bookings: 68, revenue: 1600 },
      { day: 'Sun', rides: 28, bookings: 48, revenue: 980 }
    ];

    res.json({
      metrics: {
        totalUsers,
        totalRides,
        totalBookings,
        totalEarnings: totalPlatformRevenue
      },
      weeklyAnalytics
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin metrics', error: error.message });
  }
});

// Complaints
app.get('/api/admin/complaints', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // Mock user complaints
    const complaints = [
      { id: '1', user: 'Alex Johnson', type: 'Driver behavior', status: 'Pending', description: 'Driver was late by 15 minutes and was very impolite.' },
      { id: '2', user: 'Jane Smith', type: 'Payment dispute', status: 'Resolved', description: 'Charged twice during payment gateway check. Resolved and refunded.' },
      { id: '3', user: 'Robert Downey', type: 'Lost Item', status: 'Pending', description: 'Left my black leather wallet in the car backseat during my ride yesterday.' }
    ];
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
});

// ================= SOS ROUTES =================

// Send an SOS alert
app.post('/api/sos', authenticateToken, async (req, res) => {
  try {
    const { rideId, latitude, longitude } = req.body;
    if (!rideId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Ride ID, latitude, and longitude are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

    const sos = await SOS.create({
      userName: user.name,
      userRole: user.role === 'admin' ? 'passenger' : user.role,
      phone: user.phone || 'N/A',
      ride: rideId,
      latitude,
      longitude,
      googleMapsLink,
      status: 'Active'
    });

    res.status(201).json({
      message: 'Emergency SOS alert sent successfully.',
      sos
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending SOS alert', error: error.message });
  }
});

// Get all SOS alerts (Admin only)
app.get('/api/admin/sos', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
    const alerts = await SOS.find({}).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching SOS alerts', error: error.message });
  }
});

// Resolve SOS alert (Admin only)
app.put('/api/admin/sos/:id/resolve', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const alert = await SOS.findByIdAndUpdate(
      req.params.id,
      { status: 'Resolved' },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'SOS alert not found' });
    }

    res.json({
      message: 'SOS alert marked as resolved successfully.',
      alert
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving SOS alert', error: error.message });
  }
});

// Handle simple health check
app.get('/health', (req, res) => res.json({ status: 'OK', message: 'RideConnect Backend is running!' }));

// Wrap Express app with HTTP server and initialize Socket.IO
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT"]
  }
});

// Socket.IO tracking simulation storage
const activeSimulations = {}; // rideId -> { intervalId, currentStep, path }

io.on('connection', (socket) => {
  console.log('DEBUG: Socket.IO client connected:', socket.id);

  socket.on('joinRide', async (rideId) => {
    console.log(`DEBUG: Socket ${socket.id} joined ride room: ride_${rideId}`);
    socket.join(`ride_${rideId}`);

    // If ride is active and simulation isn't running, start it
    if (!activeSimulations[rideId]) {
      try {
        const ride = await Ride.findById(rideId);
        if (ride && ride.status === 'active') {
          startRideSimulation(rideId, ride.stops);
        }
      } catch (err) {
        console.error('DEBUG: Error starting simulation on join:', err);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('DEBUG: Socket.IO client disconnected:', socket.id);
  });
});

// Helper to start driving simulation
function startRideSimulation(rideId, stops) {
  if (activeSimulations[rideId]) {
    console.log(`DEBUG: Simulation for ride ${rideId} is already running.`);
    return;
  }

  const stepsCount = 50;
  const path = [];

  const getDistance = (c1, c2) => {
    const R = 6371;
    const dLat = (c2.lat - c1.lat) * Math.PI / 180;
    const dLng = (c2.lng - c1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Generate route coordinates sequentially through intermediate stops
  const segments = stops.length - 1;
  const stepsPerSegment = Math.floor(stepsCount / segments);

  for (let s = 0; s < segments; s++) {
    const startLoc = stops[s];
    const endLoc = stops[s + 1];
    const c1 = LOCAL_PLACES[startLoc];
    const c2 = LOCAL_PLACES[endLoc];
    if (!c1 || !c2) continue;

    const segmentSteps = (s === segments - 1) ? (stepsCount - path.length) : stepsPerSegment;
    for (let i = 0; i < segmentSteps; i++) {
      const ratio = i / segmentSteps;
      const lat = c1.lat + (c2.lat - c1.lat) * ratio;
      const lng = c1.lng + (c2.lng - c1.lng) * ratio + Math.sin(ratio * Math.PI) * 0.002;
      path.push({ lat, lng });
    }
  }

  const lastStop = stops[stops.length - 1];
  const lastCoords = LOCAL_PLACES[lastStop];
  if (lastCoords) {
    path.push(lastCoords);
  }

  let currentStep = 0;
  console.log(`DEBUG: Starting location simulation for ride ${rideId} through stops`, stops);

  const endCoords = lastCoords || { lat: 0, lng: 0 };

  const intervalId = setInterval(() => {
    if (currentStep < path.length) {
      const currentPos = path[currentStep];
      const distLeft = getDistance(currentPos, endCoords);
      const eta = Math.ceil(distLeft * 2);

      io.to(`ride_${rideId}`).emit('driverLocationUpdate', {
        lat: currentPos.lat,
        lng: currentPos.lng,
        eta: eta,
        remainingDist: distLeft,
        status: 'in_progress',
        step: currentStep,
        totalSteps: path.length - 1
      });

      console.log(`DEBUG: Emitted location update for ride_${rideId}: step ${currentStep}/${path.length - 1}`);
      currentStep++;
    } else {
      clearInterval(intervalId);
      delete activeSimulations[rideId];
      io.to(`ride_${rideId}`).emit('driverLocationUpdate', {
        lat: endCoords.lat,
        lng: endCoords.lng,
        eta: 0,
        remainingDist: 0,
        status: 'completed',
        step: path.length - 1,
        totalSteps: path.length - 1
      });
      console.log(`DEBUG: Location simulation completed for ride ${rideId}`);
    }
  }, 5000);

  activeSimulations[rideId] = { intervalId, currentStep, path };
}

// Helper to stop simulation
function stopRideSimulation(rideId) {
  if (activeSimulations[rideId]) {
    clearInterval(activeSimulations[rideId].intervalId);
    delete activeSimulations[rideId];
    console.log(`DEBUG: Stopped simulation for ride ${rideId}`);
  }
}

// Run server using HTTP wrapped server to support Socket.IO
server.listen(PORT, () => {
  console.log(`RideConnect Server listening on http://localhost:${PORT}`);
});

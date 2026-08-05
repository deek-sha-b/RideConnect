const mongoose = require('mongoose');

// User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['passenger', 'driver', 'admin'], default: 'passenger' },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  favoriteLocations: { type: [String], default: [] },
  bio: { type: String, default: '' },
  chatPreference: { type: String, enum: ['Quiet', 'Bla', 'BlaBla', 'BlaBlaBla'], default: 'BlaBla' },
  musicPreference: { type: Boolean, default: true },
  petsAllowed: { type: Boolean, default: false },
  smokingAllowed: { type: Boolean, default: false },
  ladiesOnlyPref: { type: Boolean, default: false },
  driverDetails: {
    licenseNo: { type: String, default: '' },
    licenseUrl: { type: String, default: '' },
    idNo: { type: String, default: '' },
    vehicleNo: { type: String, default: '' },
    vehicleType: { type: String, enum: ['Sedan', 'Hatchback', 'SUV', 'Electric'], default: 'Sedan' },
    insuranceNo: { type: String, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    selfieUrl: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    verificationStatus: { type: String, enum: ['unsubmitted', 'pending', 'approved', 'rejected'], default: 'unsubmitted' },
    earnings: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Ride Schema
const RideSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pickupLocation: { type: String, required: true },
  pickupCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  destination: { type: String, required: true },
  destinationCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  stops: { type: [mongoose.Schema.Types.Mixed], required: true, default: [] },
  stopDetails: [{
    name: { type: String, default: '' },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 }
  }],
  stopoverPoints: { type: [String], default: [] },
  departureTime: { type: Date, required: true },
  price: { type: Number, required: true },
  recommendedPricePerSeat: { type: Number, default: 0 },
  operatingCostPerKm: { type: Number, default: 6.0 },
  totalSeats: { type: Number, required: true },
  availableSeats: { type: Number, required: true },
  vehicleType: { type: String, default: 'Sedan' },
  carModel: { type: String, default: '' },
  carColor: { type: String, default: '' },
  genderPreference: { type: String, enum: ['Any', 'Male Only', 'Female Only'], default: 'Any' },
  instantBooking: { type: Boolean, default: false },
  maxTwoInBack: { type: Boolean, default: true },
  ladiesOnly: { type: Boolean, default: false },
  luggageSize: { type: String, enum: ['Small', 'Medium', 'Large'], default: 'Medium' },
  amenities: {
    chatLevel: { type: String, enum: ['Quiet', 'Bla', 'BlaBla', 'BlaBlaBla'], default: 'BlaBla' },
    smoking: { type: Boolean, default: false },
    pets: { type: Boolean, default: false },
    music: { type: Boolean, default: true }
  },
  status: { type: String, enum: ['pending', 'active', 'completed', 'cancelled'], default: 'pending' }
}, { timestamps: true });

// Booking Schema
const BookingSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seatsBooked: { type: Number, default: 1 },
  passengersCount: { type: Number, default: 1 },
  bookingNote: { type: String, default: '' },
  status: { type: String, enum: ['requested', 'accepted', 'rejected', 'started', 'completed', 'cancelled'], default: 'requested' },
  otp: { type: String },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedAt: { type: Date },
  pickupLocation: { type: String },
  destination: { type: String },
  fare: { type: Number },
  baseFare: { type: Number, default: 0 },
  serviceFee: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  deposit: { type: Number },
  ratingToDriver: { type: Number, default: 0 },
  ratingToPassenger: { type: Number, default: 0 },
  reviewToDriver: { type: String, default: '' },
  reviewToPassenger: { type: String, default: '' }
}, { timestamps: true });

// Message Schema
const MessageSchema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true }
}, { timestamps: true });

// SOS Schema
const SOSSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  userRole: { type: String, required: true, enum: ['driver', 'passenger'] },
  phone: { type: String, required: true },
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  googleMapsLink: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Resolved'], default: 'Active' }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Ride = mongoose.model('Ride', RideSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Message = mongoose.model('Message', MessageSchema);
const SOS = mongoose.model('SOS', SOSSchema);

module.exports = { User, Ride, Booking, Message, SOS };

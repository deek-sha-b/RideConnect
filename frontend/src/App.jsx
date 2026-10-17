import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import RideSearch from './components/RideSearch';
import PassengerDashboard from './components/PassengerDashboard';
import DriverDashboard from './components/DriverDashboard';
import AdminDashboard from './components/AdminDashboard';
import VerificationForm from './components/VerificationForm';
import AuthPage from './components/AuthPage';

import { Shield, Map, Clock, Heart, Users, HelpCircle, Phone, Mail, Award, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { API_URL } from './config';
import { motion } from 'framer-motion';

const scrollRevealVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

function ScrollReveal({ children, style }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={scrollRevealVariants}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('find');
  const [roleTab, setRoleTab] = useState('overview');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');

  // Auth state
  const [authInitialMode, setAuthInitialMode] = useState('login');

  // Contact Us state & validations
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactErrors, setContactErrors] = useState({});

  // Booking confirmation states
  const [selectedRideForBooking, setSelectedRideForBooking] = useState(null);
  const [bookingPickup, setBookingPickup] = useState('');
  const [bookingDestination, setBookingDestination] = useState('');
  const [bookingSeats, setBookingSeats] = useState(1);
  const [bookingNote, setBookingNote] = useState('');
  const [bookingStatusMsg, setBookingStatusMsg] = useState('');
  const [bookingError, setBookingError] = useState('');


  // Auto-restore session from sessionStorage (fallback to localStorage) on mount
  useEffect(() => {
    const savedUser = sessionStorage.getItem('rc_user') || localStorage.getItem('rc_user');
    const savedToken = sessionStorage.getItem('rc_token') || localStorage.getItem('rc_token');
    const savedTheme = sessionStorage.getItem('rc_theme') || localStorage.getItem('rc_theme') || 'light';

    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);
        // Isolate session data into current tab's sessionStorage
        sessionStorage.setItem('rc_user', JSON.stringify(parsedUser));
        sessionStorage.setItem('rc_token', savedToken);
        // Clear global shared localStorage so new tabs start independent
        localStorage.removeItem('rc_user');
        localStorage.removeItem('rc_token');

        if (parsedUser.role === 'passenger') {
          setRoleTab('my-rides');
        } else if (parsedUser.role === 'driver') {
          setRoleTab('overview');
        } else if (parsedUser.role === 'admin') {
          setRoleTab('admin');
        }
        fetchLatestProfile(savedToken);
      } catch (e) {
        console.error('Error parsing session user:', e);
      }
    }
  }, []);

  // Role-based route protection
  useEffect(() => {
    if (!user) {
      const publicTabs = ['find', 'about', 'contact', 'login'];
      if (!publicTabs.includes(activeTab)) {
        setActiveTab('find');
      }
    }
  }, [activeTab, user]);

  const fetchLatestProfile = async (sessionToken) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
        sessionStorage.setItem('rc_user', JSON.stringify(profile));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSuccess = (userData, sessionToken) => {
    setUser(userData);
    setToken(sessionToken);
    sessionStorage.setItem('rc_user', JSON.stringify(userData));
    sessionStorage.setItem('rc_token', sessionToken);
    // Clear global shared localStorage to ensure subsequent new tabs start fresh & independent
    localStorage.removeItem('rc_user');
    localStorage.removeItem('rc_token');
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    // Redirect based on role
    if (userData.role === 'admin') {
      setRoleTab('admin');
    } else if (userData.role === 'driver') {
      setRoleTab('overview');
    } else {
      setRoleTab('my-rides');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    sessionStorage.removeItem('rc_user');
    sessionStorage.removeItem('rc_token');
    localStorage.removeItem('rc_user');
    localStorage.removeItem('rc_token');
    setActiveTab('find');
    setRoleTab('overview');
  };

  const handleBookRideClick = (ride, pickup, destination) => {
    if (!user) {
      setAuthInitialMode('login');
      setActiveTab('login');
      return;
    }
    setSelectedRideForBooking(ride);
    setBookingPickup(pickup || ride.pickupLocation);
    setBookingDestination(destination || ride.destination);
    setBookingSeats(1);
    setBookingStatusMsg('');
    setBookingError('');
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactErrors({});

    const tName = contactName.trim();
    const tEmail = contactEmail.trim();
    const tMessage = contactMessage.trim();

    const errors = {};

    if (!tName) {
      errors.name = 'Name is required.';
    } else if (tName.length < 2 || tName.length > 50) {
      errors.name = 'Name must be between 2 and 50 characters.';
    } else if (!/^[A-Za-z\s]+$/.test(tName)) {
      errors.name = 'Name must contain only letters and spaces.';
    }

    if (!tEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!tMessage) {
      errors.message = 'Message is required.';
    }

    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }

    setContactSubmitted(true);
  };

  const findStopIndexInRide = (stops, query) => {
    if (!stops || !query) return -1;
    const q = (typeof query === 'object' ? (query.name || '') : String(query)).trim().toLowerCase();
    if (!q) return -1;
    const names = stops.map(s => (typeof s === 'object' ? (s.name || '') : String(s)).trim().toLowerCase());

    let idx = names.indexOf(q);
    if (idx !== -1) return idx;

    idx = names.findIndex(n => n.length > 0 && (n.includes(q) || q.includes(n)));
    if (idx !== -1) return idx;

    const qToken = q.split(/[\s,]+/)[0];
    if (qToken.length >= 3) {
      idx = names.findIndex(n => n.includes(qToken) || qToken.includes(n));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const getBookingSegmentDistance = (startLoc, endLoc) => {
    if (!selectedRideForBooking || !selectedRideForBooking.stops) return 0;
    const fromLoc = startLoc || bookingPickup || selectedRideForBooking.pickupLocation;
    const toLoc = endLoc || bookingDestination || selectedRideForBooking.destination;

    const stops = selectedRideForBooking.stops;
    const startIdx = findStopIndexInRide(stops, fromLoc);
    const endIdx = findStopIndexInRide(stops, toLoc);

    const LOCAL_PLACES = {
      'Kasaragod': { lat: 12.4984, lng: 74.9896 },
      'Puttur': { lat: 12.7623, lng: 75.2003 },
      'Vitla': { lat: 12.7667, lng: 75.0833 },
      'Mangalore': { lat: 12.9141, lng: 74.8560 },
      'Badiadka': { lat: 12.5884, lng: 75.0698 },
      'Perla': { lat: 12.6426, lng: 75.1049 }
    };

    const extractPointCoords = (s) => {
      if (typeof s === 'object' && s && s.lat != null && s.lng != null && (s.lat !== 0 || s.lng !== 0)) {
        return { lat: parseFloat(s.lat), lng: parseFloat(s.lng) };
      }
      const name = typeof s === 'object' ? s.name : String(s);
      return LOCAL_PLACES[name] || { lat: 12.5, lng: 75.0 };
    };

    const getHaversine = (l1, l2) => {
      const c1 = extractPointCoords(l1);
      const c2 = extractPointCoords(l2);
      if (!c1 || !c2) return 0;
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

    let fullRouteDist = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      fullRouteDist += getHaversine(stops[i], stops[i + 1]);
    }

    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return fullRouteDist;

    let totalDist = 0;
    for (let i = startIdx; i < endIdx; i++) {
      totalDist += getHaversine(stops[i], stops[i + 1]);
    }
    return totalDist;
  };

  const submitBookingRequest = async () => {
    setBookingError('');
    if (!bookingPickup || !bookingDestination) {
      setBookingError('Please select both pickup and drop-off stops.');
      return;
    }
    const stops = selectedRideForBooking.stops || [];
    const pIdx = findStopIndexInRide(stops, bookingPickup);
    const dIdx = findStopIndexInRide(stops, bookingDestination);
    if (pIdx === -1 || dIdx === -1) {
      setBookingError('Selected stops are not part of this ride\'s route.');
      return;
    }
    if (pIdx >= dIdx) {
      setBookingError('Pickup stop must come before the drop-off stop on the route.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rideId: selectedRideForBooking._id,
          seatsBooked: bookingSeats,
          pickupLocation: bookingPickup,
          destination: bookingDestination,
          bookingNote
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Booking request failed.');
      }

      setBookingStatusMsg('Booking requested successfully! You can track this trip in your Bookings Dashboard.');
      confetti({ particleCount: 80, spread: 60 });

      // Refresh user details to reload active ride details
      fetchLatestProfile(token);

      setTimeout(() => {
        setSelectedRideForBooking(null);
        setActiveTab('passenger-dashboard');
      }, 2500);
    } catch (err) {
      setBookingError(err.message || 'Error submitting booking request');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* 1. Header Navigation */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAuth={(mode) => {
          setAuthInitialMode(mode);
          setActiveTab('login');
        }}
        theme={theme}
        setTheme={(t) => {
          setTheme(t);
          sessionStorage.setItem('rc_theme', t);
          localStorage.setItem('rc_theme', t);
        }}
        activeRoleTab={roleTab}
        onRoleTabChange={(t) => setRoleTab(t)}
        activePublicTab={activeTab}
        onPublicTabChange={(t) => setActiveTab(t)}
      />

      {/* Booking confirmation Overlay Dialog */}
      {selectedRideForBooking && (() => {
        const segmentDistance = getBookingSegmentDistance();
        const totalDistance = getBookingSegmentDistance(selectedRideForBooking.stops[0], selectedRideForBooking.stops[selectedRideForBooking.stops.length - 1]);
        const driverSeatPrice = selectedRideForBooking.pricePerSeat || (selectedRideForBooking.totalPrice ? (selectedRideForBooking.totalPrice / (selectedRideForBooking.totalSeats || 1)) : (selectedRideForBooking.price || 0));
        const segmentFarePerSeat = totalDistance > 0 ? (segmentDistance / totalDistance) * driverSeatPrice : 0;
        const baseFareTotal = segmentFarePerSeat * bookingSeats;
        const serviceFee = Math.max(15, Math.round(baseFareTotal * 0.12));
        const totalPassengerPay = baseFareTotal + serviceFee;
        const segmentEta = Math.ceil(segmentDistance * 2); // 2 mins per km

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1500,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="glass-card animate-fade-in" style={{
              background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px',
              width: '100%', maxWidth: '420px', border: '1px solid var(--border-color)'
            }}>
              <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>Confirm Booking</h3>

              {bookingStatusMsg ? (
                <div style={{ color: 'var(--success)', fontWeight: '600', textAlign: 'center', padding: '20px 0' }}>
                  {bookingStatusMsg}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Select your pickup and drop-off stops along the driver's route.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Pickup Stop</label>
                      <select
                        value={bookingPickup}
                        onChange={(e) => {
                          setBookingPickup(e.target.value);
                          setBookingStatusMsg('');
                          setBookingError('');
                        }}
                        className="form-input"
                      >
                        <option value="">Select Pickup</option>
                        {selectedRideForBooking.stops?.map(stop => {
                          const name = typeof stop === 'object' ? (stop.name || '') : stop;
                          return <option key={name} value={name}>{name}</option>;
                        })}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Drop Stop</label>
                      <select
                        value={bookingDestination}
                        onChange={(e) => {
                          setBookingDestination(e.target.value);
                          setBookingStatusMsg('');
                          setBookingError('');
                        }}
                        className="form-input"
                      >
                        <option value="">Select Drop</option>
                        {selectedRideForBooking.stops?.map(stop => {
                          const name = typeof stop === 'object' ? (stop.name || '') : stop;
                          return <option key={name} value={name}>{name}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  {bookingError && (
                    <div style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '12px', fontWeight: '600' }}>{bookingError}</div>
                  )}

                  {/* Segment Details */}
                  <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div>📅 <b>Ride Date:</b> {new Date(selectedRideForBooking.departureTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    <div>⏰ <b>Departure Time:</b> {new Date(selectedRideForBooking.departureTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                    <div>📏 <b>Segment Distance:</b> {segmentDistance.toFixed(1)} km</div>
                    <div>⏱️ <b>Segment ETA:</b> {segmentEta} mins</div>
                    <div>💰 <b>Driver Fare / Seat:</b> ₹{segmentFarePerSeat.toFixed(2)}</div>
                    {selectedRideForBooking.instantBooking && (
                      <div style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        ⚡ Instant Booking: Seat confirmed immediately!
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Number of Seats to Book</label>
                    <select
                      value={bookingSeats}
                      onChange={(e) => setBookingSeats(parseInt(e.target.value))}
                      className="form-input"
                    >
                      {Array.from({ length: selectedRideForBooking.availableSeats }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'Seat' : 'Seats'}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Note to Driver (Optional)</label>
                    <input
                      type="text"
                      placeholder="Hi! I have 1 handbag. See you at the pickup point!"
                      value={bookingNote}
                      onChange={(e) => setBookingNote(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '12px',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Driver Seat Fare ({bookingSeats}x):</span>
                      <span>₹{baseFareTotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Booking Service Fee (12%):</span>
                      <span>+₹{serviceFee.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '800', color: 'var(--primary)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                      <span>Total Amount to Pay:</span>
                      <span>₹{totalPassengerPay.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setSelectedRideForBooking(null)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        border: '1px solid var(--border-color)', background: 'none',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitBookingRequest}
                      className="gradient-btn"
                      style={{ flex: 1, padding: '10px', borderRadius: '8px' }}
                    >
                      {selectedRideForBooking.instantBooking ? 'Instant Book Seat ⚡' : 'Request Seat'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Main content body */}
      <main style={{ flex: 1 }}>
        {user ? (
          <>
            {user.role === 'driver' && (
              user.driverDetails?.isVerified ? (
                <DriverDashboard token={token} activeUser={user} activeTab={roleTab} setActiveTab={setRoleTab} />
              ) : (
                <VerificationForm
                  token={token}
                  currentStatus={user.driverDetails?.verificationStatus}
                  driverDetails={user.driverDetails}
                onVerificationSubmitted={(updatedUser) => {
                  setUser(updatedUser);
                  sessionStorage.setItem('rc_user', JSON.stringify(updatedUser));
                }}
              />
            )
          )}

          {user.role === 'passenger' && (
            <PassengerDashboard
              token={token}
              activeUser={user}
              activeTab={roleTab}
              setActiveTab={setRoleTab}
              onBookRide={handleBookRideClick}
              onProfileUpdate={(updatedUser) => {
                setUser(updatedUser);
                sessionStorage.setItem('rc_user', JSON.stringify(updatedUser));
              }}
              onSearchRides={() => setRoleTab('find')}
              onLogout={handleLogout}
            />
          )}

            {user.role === 'admin' && (
              <AdminDashboard token={token} />
            )}
          </>
        ) : (
          <>
            {activeTab === 'login' && (
              <AuthPage
                initialMode={authInitialMode}
                onAuthSuccess={handleAuthSuccess}
              />
            )}

            {/* HOMEPAGE / FIND RIDE VIEW FOR GUESTS */}
            {activeTab === 'find' && (
              <>
                <Hero
                  onFindRide={() => {
                    const searchEl = document.getElementById('search-rides-section');
                    if (searchEl) searchEl.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onOfferRide={() => {
                    setAuthInitialMode('login');
                    setActiveTab('login');
                  }}
                />

                <div id="search-rides-section" style={{ marginTop: '40px', marginBottom: '40px' }}>
                  <RideSearch onBookRide={handleBookRideClick} activeUser={user} />
                </div>

                {/* How It Works Section */}
                <ScrollReveal>
                  <section className="section-spacer" style={{ background: 'var(--bg-secondary)' }} id="how-it-works">
                    <div className="container" style={{ textAlign: 'center' }}>
                      <h2 style={{ fontSize: '32px', marginBottom: '12px' }}>How <span className="gradient-text">It Works</span></h2>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Start sharing trips in three easy steps.</p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                        <div className="glass-card" style={{ padding: '30px', background: 'var(--bg-primary)' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', margin: '0 auto 16px auto' }}>1</div>
                          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Search a Ride</h3>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Enter your origin, destination, and travel date. Filter by price, vehicle class, or driver gender.</p>
                        </div>

                        <div className="glass-card" style={{ padding: '30px', background: 'var(--bg-primary)' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', margin: '0 auto 16px auto' }}>2</div>
                          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Book & Verify OTP</h3>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Select a verified driver and request seats. Share the start OTP code when boarding for maximum safety.</p>
                        </div>

                        <div className="glass-card" style={{ padding: '30px', background: 'var(--bg-primary)' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '800', margin: '0 auto 16px auto' }}>3</div>
                          <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Travel & Save</h3>
                          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Enjoy a comfortable ride, share costs with friendly travelers, and reduce carbon footprint together!</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </ScrollReveal>

                {/* Why Choose Us Section */}
                <ScrollReveal>
                  <section className="section-spacer" id="why-us">
                    <div className="container">
                      <h2 style={{ fontSize: '32px', marginBottom: '12px', textAlign: 'center' }}>Why Choose <span className="gradient-text">RideConnect</span></h2>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', textAlign: 'center' }}>Your safety and comfort is our highest priority.</p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                        <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                          <Shield size={36} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <div>
                            <h4 style={{ fontSize: '16px', marginBottom: '6px' }}>100% Verified Profile</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Driving license, vehicle papers, and government IDs are audited manually by admins.</p>
                          </div>
                        </div>

                        {/* <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                          <Map size={36} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <div>
                            <h4 style={{ fontSize: '16px', marginBottom: '6px' }}>Live Map Tracking</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Monitor pickup pins, drops, and driver location updates in real-time on our responsive map.</p>
                          </div>
                        </div> */}

                        <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                          <Clock size={36} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <div>
                            <h4 style={{ fontSize: '16px', marginBottom: '6px' }}>Affordable Pricing</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Carpooling cuts your fuel budget by up to 75% while making travel cheaper for everyone.</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                          <Heart size={36} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <div>
                            <h4 style={{ fontSize: '16px', marginBottom: '6px' }}>Eco-Friendly Travels</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Fewer empty cars on road means less carbon emissions. Make a green choice today.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </ScrollReveal>

                {/* FAQs Accordion */}
                <ScrollReveal>
                  <section className="section-spacer" style={{ background: 'var(--bg-secondary)' }} id="faqs">
                    <div className="container" style={{ maxWidth: '800px' }}>
                      <h2 style={{ fontSize: '32px', marginBottom: '12px', textAlign: 'center' }}>Frequently Asked <span className="gradient-text">Questions</span></h2>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', textAlign: 'center' }}>Got questions? We've got answers.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-primary)' }}>
                          <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>How is driver verification handled?</h4>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Drivers must upload a valid driving license, government photo ID, vehicle registration certificate, and insurance. The admin checks these manually before allowing the driver to publish rides.</p>
                        </div>

                        <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-primary)' }}>
                          <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>What is the start OTP safety code?</h4>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>When a passenger books a seat, the system generates a secure 4-digit OTP. The passenger provides this code to the driver upon boarding. The driver inputs this to start the trip, verifying the correct passenger has entered the vehicle.</p>
                        </div>

                        <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-primary)' }}>
                          <h4 style={{ fontSize: '15px', marginBottom: '8px' }}>What is the Emergency SOS button?</h4>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>If a passenger or driver feels unsafe during a trip, they can click the SOS button in their active dashboard. This sends an immediate notification containing live coordinates to our admin dispatch team and copies details to emergency contacts.</p>
                        </div>
                      </div>
                    </div>
                  </section>
                </ScrollReveal>

                {/* Contact Us Section */}
                <ScrollReveal>
                  <section className="section-spacer" id="contact">
                    <div className="container" style={{ maxWidth: '600px' }}>
                      <div className="glass-card" style={{ padding: '30px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                        <h2 style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center' }}>Contact <span className="gradient-text">Us</span></h2>
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>Questions, feedback, or complaints? Reach out and we'll reply shortly.</p>

                        {contactSubmitted ? (
                          <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '12px' }} />
                            <h4 style={{ fontSize: '18px', marginBottom: '6px' }}>Message Sent!</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Thank you for writing to us. Our support agent will check your ticket shortly.</p>
                          </div>
                        ) : (
                          <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Your Name</label>
                              <input
                                type="text"
                                required
                                placeholder="John Doe"
                                className="form-input"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                style={{ borderColor: contactErrors.name ? 'var(--danger)' : 'var(--border-color)' }}
                              />
                              {contactErrors.name && (
                                <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                                  {contactErrors.name}
                                </span>
                              )}
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Email Address</label>
                              <input
                                type="email"
                                required
                                placeholder="john@example.com"
                                className="form-input"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                style={{ borderColor: contactErrors.email ? 'var(--danger)' : 'var(--border-color)' }}
                              />
                              {contactErrors.email && (
                                <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                                  {contactErrors.email}
                                </span>
                              )}
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Your Message</label>
                              <textarea
                                required
                                rows="4"
                                placeholder="How can we help you?"
                                className="form-input"
                                style={{ resize: 'none', borderColor: contactErrors.message ? 'var(--danger)' : 'var(--border-color)' }}
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                              />
                              {contactErrors.message && (
                                <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                                  {contactErrors.message}
                                </span>
                              )}
                            </div>
                            <button type="submit" className="gradient-btn" style={{ padding: '12px', fontSize: '14px', marginTop: '10px' }}>
                              Send Message
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </section>
                </ScrollReveal>
              </>
            )}

            {(activeTab === 'about' || activeTab === 'contact') && (
              <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
                <h2>{activeTab === 'about' ? 'About RideConnect' : 'Support Center'}</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '12px auto 24px auto', lineHeight: '1.6' }}>
                  {activeTab === 'about'
                    ? 'RideConnect is a peer-to-peer carpooling community designed to make travel safe, affordable, and eco-friendly by connecting drivers with spare seats to commuters going in the same direction.'
                    : 'Need help resolving an issue? You can contact our support team 24/7. Admin dispatch is ready to handle compliance reports, lost items, and payment requests.'
                  }
                </p>
                <button onClick={() => setActiveTab('find')} className="gradient-btn" style={{ padding: '10px 24px' }}>
                  Search Available Rides
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 2. Footer Section */}
      <footer style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        padding: '40px 0',
        marginTop: 'auto',
        fontSize: '13px',
        color: 'var(--text-secondary)'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>RideConnect Inc.</strong>
            <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-light)' }}>
              © {new Date().getFullYear()} RideConnect. All rights reserved. Developed by Deeksha.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <a href="#privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
            <a href="#safety" style={{ color: 'inherit', textDecoration: 'none' }}>Safety Guidelines</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

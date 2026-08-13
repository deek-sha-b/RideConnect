import React, { useState, useEffect } from 'react';
import {
  PlusCircle, Calendar, Users, MapPin, DollarSign, Briefcase, Star, Clock,
  AlertTriangle, ShieldCheck, Phone, Navigation, Compass, MessageCircle,
  Check, X, ChevronRight, ArrowRight, Edit3, Award, Car, Settings, CreditCard,
  TrendingUp, CheckCircle, AlertCircle, Trash2, Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { API_URL } from '../config';
import ChatWindow from './ChatWindow';
import CityMapSelector from './CityMapSelector';

const LOCAL_PLACES = {
  'Kasaragod': { lat: 12.4984, lng: 74.9896 },
  'Puttur': { lat: 12.7623, lng: 75.2003 },
  'Vitla': { lat: 12.7667, lng: 75.0833 },
  'Mangalore': { lat: 12.9141, lng: 74.8560 },
  'Badiadka': { lat: 12.5884, lng: 75.0698 },
  'Perla': { lat: 12.6426, lng: 75.1049 }
};

const VEHICLE_OPERATING_COSTS = {
  'Hatchback': { fuelCost: 3.5, wearCost: 1.0, totalRate: 4.5 },
  'Sedan': { fuelCost: 4.5, wearCost: 1.5, totalRate: 6.0 },
  'SUV': { fuelCost: 6.0, wearCost: 2.0, totalRate: 8.0 },
  'Electric': { fuelCost: 1.5, wearCost: 1.0, totalRate: 2.5 }
};

export default function DriverDashboard({ token, activeUser, activeTab: propActiveTab, setActiveTab: propSetActiveTab }) {
  // Navigation active tab: 'overview', 'offer-ride', 'my-trips', 'requests', 'trip-tracking', 'messages', 'earnings', 'settings'
  const [internalTab, setInternalTab] = useState('overview');
  const activeTab = propActiveTab || internalTab;
  const setActiveTab = propSetActiveTab || setInternalTab;

  // Offer Ride Form State
  const [stops, setStops] = useState(['', '']);
  const [departureTime, setDepartureTime] = useState('');
  const [price, setPrice] = useState('');
  const [totalSeats, setTotalSeats] = useState(3);
  const [instantBooking, setInstantBooking] = useState(false);
  const [ladiesOnly, setLadiesOnly] = useState(false);
  const [maxTwoInBack, setMaxTwoInBack] = useState(true);
  const [luggageSize, setLuggageSize] = useState('Medium');
  const [chatLevel, setChatLevel] = useState('BlaBla');
  const [petsAllowed, setPetsAllowed] = useState(false);

  // Data States
  const [driverBookings, setDriverBookings] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState({});
  const [driverSosActive, setDriverSosActive] = useState(false);

  // Selected Passenger for Chat
  const [selectedChatBooking, setSelectedChatBooking] = useState(null);

  // Calculator states
  const [recommendedSeatPrice, setRecommendedSeatPrice] = useState(0);
  const [minSeatPrice, setMinSeatPrice] = useState(0);
  const [maxSeatPrice, setMaxSeatPrice] = useState(0);
  const [routeDist, setRouteDist] = useState(0);

  // Helper to calculate Haversine distance
  const getDistanceBetween = (loc1, loc2) => {
    const coords1 = LOCAL_PLACES[loc1];
    const coords2 = LOCAL_PLACES[loc2];
    if (!coords1 || !coords2) return 0;

    const R = 6371;
    const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
    const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Auto-calculate  recommended fare & enforce max adjustment bounds
  useEffect(() => {
    let totalDist = 0;
    let isValid = true;
    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = typeof stops[i] === 'object' ? stops[i].name : stops[i];
      const s2 = typeof stops[i + 1] === 'object' ? stops[i + 1].name : stops[i + 1];
      if (s1 && s2) {
        totalDist += getDistanceBetween(s1, s2);
      } else {
        isValid = false;
      }
    }
    if (isValid && stops.length >= 2 && totalDist > 0) {
      const vehicleType = activeUser?.driverDetails?.vehicleType || 'Sedan';
      const costInfo = VEHICLE_OPERATING_COSTS[vehicleType] || VEHICLE_OPERATING_COSTS['Sedan'];
      const totalTripCost = totalDist * costInfo.totalRate;
      const passengerSeats = Math.max(1, parseInt(totalSeats) || 1);
      const totalOccupants = passengerSeats + 1; // 1 Driver + Passenger Seats
      const recPrice = Math.max(10, Math.round(totalTripCost / totalOccupants));
      const minP = Math.max(10, Math.round(0.80 * recPrice));
      const maxP = Math.round(1.20 * recPrice);

      setRouteDist(totalDist);
      setRecommendedSeatPrice(recPrice);
      setMinSeatPrice(minP);
      setMaxSeatPrice(maxP);

      const currentNum = parseInt(price);
      if (isNaN(currentNum) || currentNum < minP || currentNum > maxP) {
        setPrice(recPrice.toString());
      }
    } else {
      setRouteDist(0);
      setRecommendedSeatPrice(0);
      setMinSeatPrice(0);
      setMaxSeatPrice(0);
    }
  }, [stops, totalSeats, activeUser?.driverDetails?.vehicleType]);

  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const getFiveDaysMaxString = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 5);
    maxDate.setHours(23, 59, 59, 999);
    return new Date(maxDate.getTime() - maxDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const fetchDriverData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      // 1. Fetch bookings requested for driver's rides
      const bookingsRes = await fetch(`${API_URL}/api/bookings/driver`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setDriverBookings(bookingsData);
      }

      // 2. Fetch driver's offered rides
      const ridesRes = await fetch(`${API_URL}/api/rides/driver`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (ridesRes.ok) {
        const ridesData = await ridesRes.json();
        setMyRides(ridesData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData(true);
  }, [token]);

  const handleOfferRide = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (stops.length < 2) {
      setError('Please add at least 2 stops for your route.');
      return;
    }

    const formattedStops = stops.map(s => typeof s === 'object' ? s : { name: s, lat: 0, lng: 0 });

    for (const stop of formattedStops) {
      if (!stop || !stop.name || !stop.name.trim()) {
        setError('Please enter valid city or location names for all stops.');
        return;
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stops: formattedStops,
          departureTime,
          price: parseFloat(price),
          totalSeats: parseInt(totalSeats),
          instantBooking,
          maxTwoInBack,
          ladiesOnly,
          luggageSize,
          amenities: {
            chatLevel,
            smoking: false,
            pets: petsAllowed,
            music: true
          }
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to offer ride');
      }

      setStops(['', '']);
      setDepartureTime('');
      setPrice('');
      setMessage('Ride offer published successfully! Passengers can now book seats.');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      fetchDriverData();
      setTimeout(() => setActiveTab('my-trips'), 1500);
    } catch (err) {
      setError(err.message || 'Error publishing ride');
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status, otp) => {
    setMessage('');
    setError('');
    try {
      const body = { status };
      if (otp) body.otp = otp;

      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Action failed.');
      }

      if (status === 'completed') {
        confetti({ particleCount: 100, spread: 80, colors: ['#10b981', '#60a5fa'] });
      }

      fetchDriverData();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleDriverSOS = () => {
    if (activeBookings.length === 0 || !activeBookings[0].ride) {
      alert("No active trip to trigger SOS for.");
      return;
    }

    if (!window.confirm("🚨 EMERGENCY WARNING: Are you sure you want to trigger the SOS alert? This will immediately transmit your GPS coordinates to platform safety admins.")) {
      return;
    }

    if (!navigator.geolocation) {
      alert("HTML5 Geolocation is not supported by your browser. Please contact support.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`${API_URL}/api/sos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              rideId: activeBookings[0].ride._id,
              latitude,
              longitude
            })
          });

          const data = await res.json();
          if (res.ok) {
            setDriverSosActive(true);
            alert("🚨 SUCCESS: Emergency SOS alert sent successfully to safety admins!");
          } else {
            alert("Error: " + (data.message || "Failed to submit SOS alert. Please try again."));
          }
        } catch (err) {
          alert("Network error sending SOS: " + err.message);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          alert("⚠️ LOCATION ACCESS DENIED: Please enable GPS/location access in your browser settings to allow us to send your coordinates to platform admins.");
        } else {
          alert("⚠️ Geolocation Error: " + error.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Grouped Bookings
  const activeBookings = driverBookings.filter(b => b.status === 'accepted' || b.status === 'started');
  const requestedBookings = driverBookings.filter(b => b.status === 'requested');
  const pastCompletedBookings = driverBookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          animation: 'spin 1s linear infinite'
        }} className="spinner" />
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '30px 0 60px 0' }}>



      {/* Global Alerts */}
      {message && (
        <div className="glass-card animate-fade-in" style={{ padding: '14px 20px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: '10px', marginBottom: '20px', fontWeight: '600' }}>
          {message}
        </div>
      )}
      {error && (
        <div className="glass-card animate-fade-in" style={{ padding: '14px 20px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: '10px', marginBottom: '20px', fontWeight: '600' }}>
          {error}
        </div>
      )}
      {driverSosActive && (
        <div className="glass-card animate-pulse-soft" style={{ padding: '14px 20px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '2px solid var(--danger)', color: 'var(--danger)', borderRadius: '12px', marginBottom: '20px', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          <span>Active SOS Triggered: Safety admins have been notified of your location.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OVERVIEW DASHBOARD VIEW                                                */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              Driver <span className="gradient-text">Console Overview</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Welcome back, <b>{activeUser.name}</b>! Here is a summary of your driver performance, active trip, and passenger requests.
            </p>
          </div>

          {/* 1. Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>

            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <Briefcase size={24} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '700', letterSpacing: '0.5px' }}>TOTAL TRIPS</p>
                <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{myRides.length}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '700', letterSpacing: '0.5px' }}>MY EARNINGS</p>
                <h3 style={{ fontSize: '24px', fontWeight: '800' }}>₹{activeUser.driverDetails?.earnings?.toFixed(2) || '0.00'}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
                <Star size={24} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '700', letterSpacing: '0.5px' }}>DRIVER RATING</p>
                <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{activeUser.rating ? activeUser.rating.toFixed(1) : '5.0'} ⭐</h3>
              </div>
            </div>
          </div>

          {/* 2. Quick Actions Grid */}
          <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Quick Actions</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <button
                onClick={() => setActiveTab('offer-ride')}
                style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', transition: 'var(--transition)' }}
              >
                <PlusCircle size={24} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Offer a Ride</span>
              </button>

              <button
                onClick={() => setActiveTab('my-trips')}
                style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', transition: 'var(--transition)' }}
              >
                <Car size={24} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>My Trips</span>
              </button>

              <button
                onClick={() => setActiveTab('requests')}
                style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', transition: 'var(--transition)' }}
              >
                <Users size={24} style={{ color: '#f59e0b' }} />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Requests ({requestedBookings.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('earnings')}
                style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', transition: 'var(--transition)' }}
              >
                <DollarSign size={24} style={{ color: 'var(--success)' }} />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>My Earnings</span>
              </button>
            </div>
          </div>

          {/* 3. Current Active Trip Card & Today's Passenger Requests */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

            {/* Current Active Trip Card */}
            <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Navigation size={18} style={{ color: 'var(--primary)' }} /> Current Active Trip
                  </h3>
                  {activeBookings.length > 0 && (
                    <span style={{ padding: '3px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: 'var(--success)', fontSize: '10px', fontWeight: '800' }}>
                      LIVE IN PROGRESS
                    </span>
                  )}
                </div>

                {activeBookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
                    <Car size={36} style={{ opacity: 0.5, marginBottom: '10px' }} />
                    <p style={{ fontSize: '13px', margin: 0 }}>No trip currently active.</p>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>
                      Route: {activeBookings[0].pickupLocation} ➔ {activeBookings[0].destination}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Passenger: <b>{activeBookings[0].passenger?.name}</b> ({activeBookings[0].seatsBooked} seat(s))
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Fare Collectible: <b className="gradient-text" style={{ fontSize: '14px' }}>₹{(activeBookings[0].fare || 0).toFixed(2)}</b>
                    </div>
                  </div>
                )}
              </div>

              {activeBookings.length > 0 && (
                <button
                  onClick={() => setActiveTab('trip-tracking')}
                  className="gradient-btn"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', fontSize: '13px', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>Open Live Trip Tracking & OTP</span>
                  <ChevronRight size={16} />
                </button>
              )}
            </div>

            {/* Today's Passenger Requests (Max 3) */}
            <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: '#f59e0b' }} /> Pending Requests (Max 3)
                </h3>
                {requestedBookings.length > 0 && (
                  <button
                    onClick={() => setActiveTab('requests')}
                    style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                  >
                    View All ({requestedBookings.length}) ➔
                  </button>
                )}
              </div>

              {requestedBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No pending passenger requests at the moment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {requestedBookings.slice(0, 3).map((b) => (
                    <div key={b._id} style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '13px', display: 'block' }}>{b.passenger?.name || 'Passenger'}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {b.pickupLocation} ➔ {b.destination} | {b.seatsBooked} seat(s) (₹{(b.fare || 0).toFixed(2)})
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleUpdateBookingStatus(b._id, 'rejected')}
                          style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--danger)', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleUpdateBookingStatus(b._id, 'accepted')}
                          className="gradient-btn"
                          style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px' }}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. OFFER RIDE VIEW                                                        */}
      {/* ========================================================================= */}
      {activeTab === 'offer-ride' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              Publish a <span className="gradient-text">New Journey</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Offer empty seats on your route to friendly passengers and cut your travel budget.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '30px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
            <form onSubmit={handleOfferRide} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Route Origin & Destination Map Selector */}
              <CityMapSelector
                pickup={typeof stops[0] === 'object' ? (stops[0]?.name || '') : stops[0]}
                setPickup={(newVal) => {
                  const newStops = [...stops];
                  newStops[0] = newVal;
                  setStops(newStops);
                }}
                destination={typeof stops[stops.length - 1] === 'object' ? (stops[stops.length - 1]?.name || '') : stops[stops.length - 1]}
                setDestination={(newVal) => {
                  const newStops = [...stops];
                  newStops[newStops.length - 1] = newVal;
                  setStops(newStops);
                }}
                placeholderPickup="Pickup Origin City (e.g. Kasaragod, Mangalore)"
                placeholderDestination="Drop Destination City (e.g. Puttur, Bangalore)"
                showMapByDefault={true}
              />

              {/* Intermediate Stops if any */}
              {stops.length > 2 && (
                <div style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Intermediate Waypoint Stops
                  </label>
                  {stops.slice(1, stops.length - 1).map((stop, midIdx) => {
                    const idx = midIdx + 1;
                    const val = typeof stop === 'object' ? (stop.name || '') : stop;
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder={`Intermediate Stop #${midIdx + 1}`}
                          value={val}
                          onChange={(e) => {
                            const newStops = [...stops];
                            newStops[idx] = e.target.value;
                            setStops(newStops);
                          }}
                          className="form-input"
                          style={{ fontSize: '12px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setStops(stops.filter((_, i) => i !== idx))}
                          style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={() => {
                    const newStops = [...stops];
                    newStops.splice(newStops.length - 1, 0, '');
                    setStops(newStops);
                  }}
                  style={{ border: 'none', background: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Add Intermediate Waypoint Stop
                </button>
              </div>

              {/* Departure Date/Time & Seat Count Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>Departure Date & Time</label>
                  <input
                    type="datetime-local"
                    min={getTomorrowString()}
                    max={getFiveDaysMaxString()}
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>Seats Available</label>
                  <select
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(parseInt(e.target.value))}
                    className="form-input"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Seat' : 'Seats'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/*  Automatic Fare Calculation & Max Limit Adjustment Control */}
              <div className="glass-card" style={{
                padding: '20px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                {routeDist > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Route Distance: <b>{routeDist.toFixed(1)} km</b></span>
                  </div>
                )}

                {routeDist > 0 && recommendedSeatPrice > 0 ? (
                  <>
                    {/* Operating Cost Breakdown Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px' }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-light)', fontSize: '10px', display: 'block', fontWeight: '600' }}>VEHICLE CLASS</span>
                        <strong>{activeUser?.driverDetails?.vehicleType || 'Sedan'} (₹{(VEHICLE_OPERATING_COSTS[activeUser?.driverDetails?.vehicleType || 'Sedan']?.totalRate || 6).toFixed(1)}/km)</strong>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-light)', fontSize: '10px', display: 'block', fontWeight: '600' }}>TOTAL TRIP COST</span>
                        <strong>₹{(routeDist * (VEHICLE_OPERATING_COSTS[activeUser?.driverDetails?.vehicleType || 'Sedan']?.totalRate || 6)).toFixed(0)}</strong>
                      </div>
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-light)', fontSize: '10px', display: 'block', fontWeight: '600' }}>SHARED OCCUPANTS</span>
                        <strong>{(parseInt(totalSeats) || 1) + 1} (1 Driver + {totalSeats} Seats)</strong>
                      </div>
                      <div style={{ background: 'rgba(16,185,129,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--success)', color: 'var(--success)' }}>
                        <span style={{ fontSize: '10px', display: 'block', fontWeight: '700' }}>RECOMMENDED / SEAT</span>
                        <strong style={{ fontSize: '15px' }}>₹{recommendedSeatPrice}</strong>
                      </div>
                    </div>

                    {/* Slider & Bounded Price Adjuster */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '13px', fontWeight: '700', display: 'block' }}>
                            Your Seat Price: <span className="gradient-text" style={{ fontSize: '20px', fontWeight: '900' }}>₹{price || recommendedSeatPrice}</span>
                          </label>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Allowed adjustment bounds: <b>₹{minSeatPrice}</b> (-20%) to <b>₹{maxSeatPrice}</b> (+20%)
                          </span>
                        </div>

                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800',
                          backgroundColor: parseInt(price) === recommendedSeatPrice ? 'rgba(16,185,129,0.15)' : (parseInt(price) > recommendedSeatPrice ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.15)'),
                          color: parseInt(price) === recommendedSeatPrice ? 'var(--success)' : (parseInt(price) > recommendedSeatPrice ? 'var(--warning)' : 'var(--primary)')
                        }}>
                          {parseInt(price) === recommendedSeatPrice ? 'RECOMMENDED FARE ✓' : (parseInt(price) > recommendedSeatPrice ? `+${Math.round(((price - recommendedSeatPrice) / recommendedSeatPrice) * 100)}% ADJUSTED` : `-${Math.round(((recommendedSeatPrice - price) / recommendedSeatPrice) * 100)}% DISCOUNT`)}
                        </span>
                      </div>

                      <input
                        type="range"
                        min={minSeatPrice}
                        max={maxSeatPrice}
                        step="5"
                        value={price || recommendedSeatPrice}
                        onChange={(e) => setPrice(e.target.value)}
                        style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-light)', marginTop: '6px' }}>
                        <span>Min Limit (-20%): ₹{minSeatPrice}</span>
                        <span style={{ color: 'var(--success)', fontWeight: '700' }}>Recommended: ₹{recommendedSeatPrice}</span>
                        <span>Max Limit (+20%): ₹{maxSeatPrice}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
                    Select origin and destination cities above to calculate automatic distance and operating cost fare recommendations.
                  </div>
                )}
              </div>

              {/* Travel Preferences Toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={instantBooking} onChange={(e) => setInstantBooking(e.target.checked)} />
                  <span>⚡ Instant Booking (Auto Accept)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={ladiesOnly} onChange={(e) => setLadiesOnly(e.target.checked)} />
                  <span>👩 Ladies Only Ride</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={maxTwoInBack} onChange={(e) => setMaxTwoInBack(e.target.checked)} />
                  <span>🛋️ Max 2 Passengers in Back Seat</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={petsAllowed} onChange={(e) => setPetsAllowed(e.target.checked)} />
                  <span>🐾 Pets Allowed</span>
                </label>
              </div>

              <button type="submit" className="gradient-btn" style={{ padding: '14px', fontSize: '15px', borderRadius: '10px' }}>
                Publish Journey Offer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MY TRIPS VIEW                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'my-trips' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
                My Posted <span className="gradient-text">Journeys</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
                View all journey offers published on RideConnect.
              </p>
            </div>
            <button onClick={() => setActiveTab('offer-ride')} className="gradient-btn" style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PlusCircle size={16} />
              <span>Offer New Ride</span>
            </button>
          </div>

          {myRides.length === 0 ? (
            <div className="glass-card" style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <Car size={44} style={{ opacity: 0.5, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>No Journeys Posted Yet</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Publish a ride to share seats with passengers.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {myRides.map((ride) => {
                const stopNames = ride.stops.map(s => typeof s === 'object' ? s.name : s);
                const isTimePassed = ride.departureTime && new Date(ride.departureTime) < new Date();
                const isCancelled = ride.status === 'cancelled';
                const isCompleted = ride.status === 'completed' || (isTimePassed && ride.status !== 'active');

                let statusLabel = 'UPCOMING';
                let statusBg = 'rgba(37, 99, 235, 0.15)';
                let statusColor = 'var(--primary)';
                let StatusIcon = Clock;

                if (isCancelled) {
                  statusLabel = 'CANCELLED';
                  statusBg = 'rgba(239, 68, 68, 0.15)';
                  statusColor = 'var(--danger)';
                  StatusIcon = AlertCircle;
                } else if (isCompleted) {
                  statusLabel = 'COMPLETED';
                  statusBg = 'rgba(16, 185, 129, 0.15)';
                  statusColor = 'var(--success)';
                  StatusIcon = CheckCircle;
                } else if (ride.status === 'active') {
                  statusLabel = 'IN PROGRESS';
                  statusBg = 'rgba(16, 185, 129, 0.15)';
                  statusColor = 'var(--success)';
                  StatusIcon = Car;
                }

                return (
                  <div key={ride._id} className="glass-card" style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', height: '100%' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '10px',
                          fontWeight: '800',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          backgroundColor: statusBg,
                          color: statusColor,
                          border: '1px solid currentColor',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <StatusIcon size={12} />
                          {statusLabel}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {ride.departureTime ? new Date(ride.departureTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                        </span>
                      </div>

                      <strong style={{ fontSize: '15px', display: 'block', marginBottom: '10px', lineHeight: '1.4' }}>
                        {stopNames.join(' ➔ ')}
                      </strong>

                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <span>📅 Departure: <b style={{ color: 'var(--text-primary)' }}>{ride.departureTime ? new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</b></span>
                        <span>💺 Seats: <b style={{ color: 'var(--text-primary)' }}>{ride.availableSeats} available</b> / {ride.totalSeats}</span>
                        <span>💰 Fare/Seat: <b className="gradient-text">₹{ride.price}</b></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                      <button
                        onClick={() => setActiveTab('trip-tracking')}
                        className="gradient-btn"
                        style={{ width: '100%', padding: '8px 14px', fontSize: '12px', borderRadius: '8px' }}
                      >
                        Track Ride
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PASSENGER REQUESTS VIEW                                               */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              Passenger <span className="gradient-text">Requests & Boarding</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Review seat reservation requests and manage passenger boarding per stop.
            </p>
          </div>

          {driverBookings.length === 0 ? (
            <div className="glass-card" style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <Users size={44} style={{ opacity: 0.5, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>No Passenger Requests</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Requests from passengers will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {driverBookings.map((b) => (
                <div key={b._id} className="glass-card" style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '15px' }}>{b.passenger?.name || 'Passenger'}</strong>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', background: b.status === 'requested' ? 'rgba(245,158,11,0.1)' : (b.status === 'accepted' ? 'rgba(37,99,235,0.1)' : 'rgba(16,185,129,0.1)'), color: b.status === 'requested' ? 'var(--warning)' : (b.status === 'accepted' ? 'var(--primary)' : 'var(--success)') }}>
                        {b.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Route: <b>{b.pickupLocation} ➔ {b.destination}</b> | Seats: <b>{b.seatsBooked}</b> | Fare: <b>₹{(b.fare || 0).toFixed(2)}</b>
                    </div>
                  </div>

                  {b.status === 'requested' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleUpdateBookingStatus(b._id, 'rejected')}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--danger)', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateBookingStatus(b._id, 'accepted')}
                        className="gradient-btn"
                        style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px' }}
                      >
                        Accept Request
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TRIP TRACKING & OTP VIEW                                               */}
      {/* ========================================================================= */}
      {activeTab === 'trip-tracking' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              Live Trip <span className="gradient-text">Tracking & OTP Verification</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Verify passenger boarding OTPs, view stop itinerary, and access driver emergency safety controls.
            </p>
          </div>

          {activeBookings.length === 0 ? (
            <div className="glass-card" style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <Navigation size={44} style={{ opacity: 0.5, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>No Active Trips In Progress</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Accept passenger requests or start a ride to manage boarding.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {activeBookings.map((b) => (
                <div key={b._id} className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', margin: 0 }}>Passenger: <b>{b.passenger?.name}</b></h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Route: {b.pickupLocation} ➔ {b.destination}</span>
                    </div>
                    <span style={{ padding: '4px 12px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', fontSize: '11px', fontWeight: '800' }}>
                      {b.status.toUpperCase()}
                    </span>
                  </div>

                  {/* OTP Input Form for starting trip */}
                  {b.status === 'accepted' && (
                    <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Enter Passenger Boarding OTP"
                        value={otpInputs[b._id] || ''}
                        onChange={(e) => setOtpInputs({ ...otpInputs, [b._id]: e.target.value })}
                        className="form-input"
                        style={{ maxWidth: '240px', fontSize: '13px' }}
                      />
                      <button
                        onClick={() => handleUpdateBookingStatus(b._id, 'started', otpInputs[b._id])}
                        className="gradient-btn"
                        style={{ padding: '10px 18px', fontSize: '12px', borderRadius: '8px' }}
                      >
                        Verify OTP & Start Trip
                      </button>
                    </div>
                  )}

                  {b.status === 'started' && (
                    <button
                      onClick={() => handleUpdateBookingStatus(b._id, 'completed')}
                      className="gradient-btn"
                      style={{ padding: '12px', borderRadius: '8px', fontSize: '13px' }}
                    >
                      Complete Passenger Trip & Collect ₹{(b.fare || 0).toFixed(2)}
                    </button>
                  )}
                </div>
              ))}

              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={handleDriverSOS}
                  style={{ width: '100%', padding: '14px', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '800', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <AlertTriangle size={18} />
                  <span>EMERGENCY SOS ALERT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MESSAGES VIEW                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'messages' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              Passenger <span className="gradient-text">Messages</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Chat directly with passengers on your active and scheduled journeys.
            </p>
          </div>

          {activeBookings.length === 0 && requestedBookings.length === 0 ? (
            <div className="glass-card" style={{ padding: '50px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <MessageCircle size={44} style={{ opacity: 0.5, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>No Active Passengers</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Chat will become available when passengers book seats on your rides.</p>
            </div>
          ) : (
            <div>
              {/* Passenger Selector */}
              {driverBookings.length > 0 && (
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {driverBookings.map((b) => (
                    <button
                      key={b._id}
                      onClick={() => setSelectedChatBooking(b)}
                      style={{
                        padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                        border: selectedChatBooking?._id === b._id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        background: selectedChatBooking?._id === b._id ? 'var(--primary)' : 'var(--bg-secondary)',
                        color: selectedChatBooking?._id === b._id ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      👤 {b.passenger?.name || 'Passenger'} ({b.pickupLocation})
                    </button>
                  ))}
                </div>
              )}

              <ChatWindow
                rideId={(selectedChatBooking || activeBookings[0] || driverBookings[0])?.ride?._id}
                currentUser={activeUser}
                token={token}
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. EARNINGS VIEW                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'earnings' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              Driver <span className="gradient-text">Earnings & Income</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Track total revenue collected, trip-wise income breakdown, and payout details.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '700', margin: '0 0 6px 0' }}>TOTAL EARNINGS COLLECTED</p>
              <h3 className="gradient-text" style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>₹{activeUser.driverDetails?.earnings?.toFixed(2) || '0.00'}</h3>
            </div>

            <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '700', margin: '0 0 6px 0' }}>COMPLETED PASSENGER TRIPS</p>
              <h3 style={{ fontSize: '28px', fontWeight: '900', margin: 0 }}>{pastCompletedBookings.filter(b => b.status === 'completed').length}</h3>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Trip-Wise Income Breakdown</h3>

            {pastCompletedBookings.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No completed trips logged in earnings history.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {pastCompletedBookings.map((b) => (
                  <div key={b._id} className="glass-card" style={{ padding: '14px 16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '14px' }}>{b.passenger?.name || 'Passenger'}</strong>
                      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '800', background: b.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: b.status === 'cancelled' ? 'var(--danger)' : 'var(--success)' }}>
                        {b.status === 'cancelled' ? 'CANCELLED' : 'COMPLETED'}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Route: <b>{b.pickupLocation} ➔ {b.destination}</b></span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>Seats: {b.seatsBooked}</span>
                      <div style={{ textAlign: 'right' }}>
                        <strong className="gradient-text" style={{ fontSize: '14px', fontWeight: '800' }}>+₹{(b.fare || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SETTINGS / PROFILE VIEW                                                */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              Driver <span className="gradient-text">Profile & Vehicle Settings</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Audit your verified driver credentials, vehicle specifications, and operating parameters.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

            {/* Driver Credentials Card */}
            <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '800' }}>
                  {(activeUser.name || 'D').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '0 0 4px 0' }}>{activeUser.name}</h3>
                  <span style={{ padding: '2px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', fontSize: '11px', fontWeight: '800' }}>
                    VERIFIED DRIVER
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', fontSize: '13px' }}>
                <div><span style={{ color: 'var(--text-light)' }}>Email:</span> <b>{activeUser.email}</b></div>
                <div><span style={{ color: 'var(--text-light)' }}>Phone:</span> <b>{activeUser.phone || 'Not provided'}</b></div>
                <div><span style={{ color: 'var(--text-light)' }}>Driver Rating:</span> <b>{activeUser.rating ? activeUser.rating.toFixed(1) : '5.0'} ⭐</b></div>
              </div>
            </div>

            {/* Vehicle Specifications Card */}
            <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={20} style={{ color: 'var(--primary)' }} /> Vehicle Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '12px', fontSize: '13px' }}>
                <div><span style={{ color: 'var(--text-light)' }}>Vehicle Model:</span> <b>{activeUser.driverDetails?.vehicleModel || 'Sedan'}</b></div>
                <div><span style={{ color: 'var(--text-light)' }}>License Plate:</span> <b>{activeUser.driverDetails?.vehicleNo || 'KA-19-RC-2026'}</b></div>
                <div><span style={{ color: 'var(--text-light)' }}>Vehicle Class:</span> <b>{activeUser.driverDetails?.vehicleType || 'Sedan'}</b></div>
                <div><span style={{ color: 'var(--text-light)' }}>Operating Rate:</span> <b>₹{(VEHICLE_OPERATING_COSTS[activeUser.driverDetails?.vehicleType || 'Sedan']?.totalRate || 6.0).toFixed(2)} / km</b></div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

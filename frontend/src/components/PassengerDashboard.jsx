import React, { useState, useEffect } from 'react';
import { ShieldAlert, Share2, MessageCircle, Star, Heart, MapPin, Calendar, Clock, Phone, AlertCircle, Copy, Check, CheckCircle } from 'lucide-react';
import ChatWindow from './ChatWindow';
import confetti from 'canvas-confetti';
import { API_URL } from '../config';

export default function PassengerDashboard({ token, activeUser, onProfileUpdate, onSearchRides }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatRide, setSelectedChatRide] = useState(null);
  
  // Rating states
  const [ratingBooking, setRatingBooking] = useState(null); // booking object to rate
  const [starCount, setStarCount] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // Favorites states
  const [newFav, setNewFav] = useState('');
  const [favs, setFavs] = useState(activeUser.favoriteLocations || []);

  // SOS status
  const [sosActive, setSosActive] = useState(false);
  // Trip sharing
  const [sharedBookingId, setSharedBookingId] = useState(null);

  const fetchBookings = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/bookings/passenger`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Error fetching passenger bookings:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings(true); // Show loader only on the initial mount
    const interval = setInterval(() => fetchBookings(false), 5000); // Silent update in the background
    return () => clearInterval(interval);
  }, [token]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this ride request?')) return;
    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFavorite = async (e) => {
    e.preventDefault();
    if (!newFav.trim()) return;

    const updatedFavs = [...favs, newFav.trim()];
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ favoriteLocations: updatedFavs })
      });

      if (res.ok) {
        const data = await res.json();
        setFavs(data.favoriteLocations);
        setNewFav('');
        if (onProfileUpdate) onProfileUpdate(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFavorite = async (index) => {
    const updatedFavs = favs.filter((_, i) => i !== index);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ favoriteLocations: updatedFavs })
      });

      if (res.ok) {
        const data = await res.json();
        setFavs(data.favoriteLocations);
        if (onProfileUpdate) onProfileUpdate(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareTrip = (bookingId) => {
    setSharedBookingId(bookingId);
    navigator.clipboard.writeText(`http://localhost:3000/track/ride_${bookingId}`);
    setTimeout(() => {
      setSharedBookingId(null);
    }, 3000);
  };

  const triggerSOS = () => {
    if (!activeBooking || !activeBooking.ride) {
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
              rideId: activeBooking.ride._id,
              latitude,
              longitude
            })
          });

          const data = await res.json();
          if (res.ok) {
            setSosActive(true);
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

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!ratingBooking) return;

    try {
      const res = await fetch(`${API_URL}/api/bookings/${ratingBooking._id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: starCount,
          review: reviewText,
          rateTarget: 'driver'
        })
      });

      if (res.ok) {
        confetti({ particleCount: 100, spread: 80 });
        setRatingBooking(null);
        setReviewText('');
        fetchBookings();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div style={{
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite'
        }} className="spinner" />
      </div>
    );
  }

  // Find active booking for tracking
  const activeBooking = bookings.find(b => b.status === 'accepted' || b.status === 'started');
  const completedUnratedBooking = bookings.find(b => b.status === 'completed' && !b.ratingToDriver);

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 0 60px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>
            My <span className="gradient-text">Bookings & Travel</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Monitor active rides, track drivers on the live map, trigger safety features, and review your previous trips.
          </p>
        </div>
        {onSearchRides && (
          <button 
            onClick={onSearchRides} 
            className="gradient-btn" 
            style={{ padding: '12px 24px', fontSize: '14px', borderRadius: '10px' }}
          >
            Find a New Ride
          </button>
        )}
      </div>

      {/* SOS banner if activated */}
      {sosActive && (
        <div className="glass-card animate-pulse-soft" style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid var(--danger)',
          color: 'var(--danger)',
          borderRadius: '12px',
          marginBottom: '30px',
          fontWeight: '700',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={20} />
          <span>Active SOS Triggered. Dispatch team monitoring coordinates.</span>
        </div>
      )}

      {/* Rating Modal popup */}
      {ratingBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card animate-fade-in" style={{
            background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px',
            width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '8px', textAlign: 'center' }}>Rate Your Trip</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '20px' }}>
              How was your ride with {ratingBooking.ride?.driver?.name}?
            </p>

            <form onSubmit={handleSubmitRating} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Star selector */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarCount(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Star 
                      size={32} 
                      fill={star <= starCount ? '#eab308' : 'none'} 
                      stroke={star <= starCount ? '#eab308' : 'var(--text-light)'} 
                    />
                  </button>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Share your feedback</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Tell us what you liked or how we can improve..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="form-input"
                  style={{ resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setRatingBooking(null)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    border: '1px solid var(--border-color)', background: 'none',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600'
                  }}
                >
                  Skip
                </button>
                <button
                  type="submit"
                  className="gradient-btn"
                  style={{ flex: 1, padding: '10px', borderRadius: '8px' }}
                >
                  Submit Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed Trip Summary and Rating Panel */}
      {completedUnratedBooking && (
        <div style={{ marginBottom: '40px' }} className="animate-fade-in">
          <div className="glass-card" style={{ 
            maxWidth: '650px', 
            margin: '0 auto', 
            padding: '30px', 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: 'rgba(16, 185, 129, 0.1)', 
                color: 'var(--success)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 12px auto' 
              }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: '800' }}>Trip Completed Successfully!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                Thank you for riding with RideConnect. Here is your trip receipt and feedback portal.
              </p>
            </div>

            {/* Trip Details & Receipt */}
            <div style={{ background: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', marginBottom: '24px', fontSize: '13px' }}>
              <h4 style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>Trip Summary Receipt</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                <div><b>Driver:</b> {completedUnratedBooking.ride?.driver?.name || 'David Miller'}</div>
                <div><b>Vehicle:</b> {completedUnratedBooking.ride?.driver?.driverDetails?.vehicleModel || 'Tesla'} ({completedUnratedBooking.ride?.driver?.driverDetails?.vehicleNo})</div>
                <div><b>Route Segment:</b> {completedUnratedBooking.pickupLocation} ➔ {completedUnratedBooking.destination}</div>
                <div><b>Date:</b> {new Date(completedUnratedBooking.createdAt).toLocaleDateString()}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px', fontSize: '15px' }}>
                  <span style={{ fontWeight: '600' }}>Total Segment Fare Due:</span>
                  <span className="gradient-text" style={{ fontWeight: '800' }}>₹{(completedUnratedBooking.fare || 0).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', fontWeight: '600' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                <span>Payment Status: Completed (Balance paid directly to Driver)</span>
              </div>
            </div>

            {/* Inline Feedback / Rating portal */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch(`${API_URL}/api/bookings/${completedUnratedBooking._id}/rate`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    rating: starCount,
                    review: reviewText,
                    rateTarget: 'driver'
                  })
                });

                if (res.ok) {
                  confetti({ particleCount: 100, spread: 80 });
                  setReviewText('');
                  fetchBookings(); // refresh to remove card
                }
              } catch (err) {
                console.error(err);
              }
            }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', textAlign: 'center' }}>Rate your Driver</h4>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setStarCount(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    <Star 
                      size={28} 
                      fill={star <= starCount ? '#eab308' : 'none'} 
                      color={star <= starCount ? '#eab308' : 'var(--text-light)'} 
                    />
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Write a Review (Optional)</label>
                <textarea
                  placeholder="Share your experience on this trip..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '80px', padding: '10px', fontSize: '13px', borderRadius: '8px' }}
                />
              </div>

              <button
                type="submit"
                className="gradient-btn"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px', fontWeight: '700' }}
              >
                Submit Feedback
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Active Trip Tracking Panel */}
      {activeBooking && (
        <div style={{ marginBottom: '40px' }} className="animate-fade-in">
          <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--primary)' }}>Active Trip Tracking</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            gap: '24px'
          }} className="dashboard-grid">
            {/* Left: Premium Info Card with Ride details */}
            <div className="glass-card" style={{ padding: '16px', background: 'var(--bg-secondary)', height: '420px', border: '1px solid var(--border-color)' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%',
                color: '#000000',
                padding: '12px',
                boxSizing: 'border-box'
              }}>
                {/* Header: Status Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: (activeBooking.status === 'started' || activeBooking.status === 'in_progress') ? '#10b981' : '#f59e0b',
                      animation: 'pulse-soft 2s infinite'
                    }} />
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '800',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      color: (activeBooking.status === 'started' || activeBooking.status === 'in_progress') ? '#10b981' : '#f59e0b'
                    }}>
                      RIDE STATUS: {activeBooking.status === 'accepted' ? 'UPCOMING (SCHEDULED)' : activeBooking.status.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#000000', background: 'rgba(0,0,0,0.05)', padding: '4px 10px', borderRadius: '20px' }}>
                    Assigned
                  </span>
                </div>

                {/* Content: Route & Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', margin: '14px 0' }}>
                  {/* Route Details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0, 0, 0, 0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <MapPin size={16} style={{ color: 'var(--primary)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Pickup Location</span>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{activeBooking.pickupLocation || activeBooking.ride?.pickupLocation}</span>
                      </div>
                    </div>
                    
                    <div style={{ borderLeft: '2px dashed rgba(0,0,0,0.15)', height: '14px', marginLeft: '7px' }} />

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <MapPin size={16} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Drop Location</span>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{activeBooking.destination || activeBooking.ride?.destination}</span>
                      </div>
                    </div>
                  </div>

                  {/* Time & Fare Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ background: 'rgba(0, 0, 0, 0.02)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} /> Date & Time
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>
                        {activeBooking.ride?.departureTime ? new Date(activeBooking.ride.departureTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                      </span>
                    </div>

                    <div style={{ background: 'rgba(0, 0, 0, 0.02)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', textTransform: 'uppercase', fontWeight: '600' }}>Your Final Fare</span>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--success)' }}>
                        ₹{(activeBooking.fare || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>


                </div>

                {/* Driver Details */}
                {activeBooking.ride?.driver && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'rgba(0,0,0,0.02)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.05)',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '800',
                      flexShrink: 0
                    }}>
                      {(activeBooking.ride?.driver?.name || 'D').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: '9px', color: '#000000', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Assigned Driver</span>
                      <strong style={{ fontSize: '13px', color: '#000000' }}>{activeBooking.ride?.driver?.name}</strong>
                      <span style={{ fontSize: '11px', color: '#000000', marginLeft: '6px' }}>
                        ({activeBooking.ride?.vehicleType || 'Sedan'})
                      </span>
                    </div>
                  </div>
                )}

                {/* Alert Message */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: (activeBooking.status === 'started' || activeBooking.status === 'in_progress')
                    ? 'rgba(16, 185, 129, 0.08)'
                    : 'rgba(59, 130, 246, 0.08)',
                  border: (activeBooking.status === 'started' || activeBooking.status === 'in_progress')
                    ? '1px solid rgba(16, 185, 129, 0.2)'
                    : '1px solid rgba(59, 130, 246, 0.2)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  color: (activeBooking.status === 'started' || activeBooking.status === 'in_progress')
                    ? '#10b981'
                    : '#60a5fa',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>
                    {(activeBooking.status === 'started' || activeBooking.status === 'in_progress')
                      ? 'Trip is currently active and in progress. Safe travels!'
                      : 'Your booking is confirmed. Share the boarding OTP code with the driver to start the trip.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Driver details, OTP, SOS controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Driver specs Card */}
              <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {(activeBooking.ride?.driver?.name || 'D').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px' }}>{activeBooking.ride?.driver?.name}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Vehicle Class: <b>{activeBooking.ride?.vehicleType || 'Sedan'}</b> | Plate: <b>{activeBooking.ride?.driver?.driverDetails?.vehicleNo}</b>
                    </p>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><b>Route:</b> {activeBooking.pickupLocation || activeBooking.ride?.pickupLocation} ➔ {activeBooking.destination || activeBooking.ride?.destination}</div>
                  <div><b>Seats:</b> {activeBooking.seatsBooked} | <b>Total Fare:</b> ₹{(activeBooking.fare || 0).toFixed(2)}</div>
                  {activeBooking.ride?.price && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                      💵 <b>Fare Breakdown:</b> ({((activeBooking.fare / (activeBooking.ride.price * activeBooking.seatsBooked)) * 100).toFixed(0)}% of route distance) × ₹{activeBooking.ride.price} × {activeBooking.seatsBooked} {activeBooking.seatsBooked === 1 ? 'seat' : 'seats'}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-light)', display: 'block', fontWeight: '600' }}>START OTP CODE</span>
                    <strong style={{ fontSize: '16px', color: 'var(--primary)' }}>{activeBooking.otp}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-light)', display: 'block', fontWeight: '600' }}>DRIVER CONTACT</span>
                    <strong style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {activeBooking.ride?.driver?.phone || 'N/A'}
                    </strong>
                  </div>
                </div>

                {/* Safety & Action Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    onClick={() => handleShareTrip(activeBooking._id)}
                    style={{
                      padding: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-primary)'
                    }}
                  >
                    {sharedBookingId === activeBooking._id ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Share2 size={14} />}
                    <span>{sharedBookingId === activeBooking._id ? 'Copied Link' : 'Share Live Trip'}</span>
                  </button>

                  <button
                    onClick={triggerSOS}
                    style={{
                      padding: '10px', border: '1px solid var(--danger)', background: 'rgba(239, 68, 68, 0.08)',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--danger)'
                    }}
                  >
                    <ShieldAlert size={14} />
                    <span>Emergency SOS</span>
                  </button>
                </div>

                <div style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-light)' }}>
                  Give the start OTP code to the driver only when you are safely seated in the car.
                </div>
              </div>

              {/* Chat embed */}
              <ChatWindow rideId={activeBooking.ride?._id} currentUser={activeUser} token={token} />
            </div>
          </div>
        </div>
      )}

      {/* Bookings log lists */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }} className="dashboard-grid">
        {/* Left: Bookings list */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>My Active & Past Bookings</h3>

          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <p>You haven't booked any rides yet. Find and book a seat now!</p>
              {onSearchRides && (
                <button 
                  onClick={onSearchRides} 
                  className="gradient-btn" 
                  style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '8px' }}
                >
                  Search Available Rides
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {bookings.map((booking) => (
                <div 
                  key={booking._id} 
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    {/* Letter Avatar for Driver */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '800',
                      flexShrink: 0
                    }}>
                      {(booking.ride?.driver?.name || 'David Miller').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', display: 'block' }}>
                            {booking.pickupLocation || booking.ride?.pickupLocation} ➔ {booking.destination || booking.ride?.destination}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                            Date: {new Date(booking.ride?.departureTime).toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            backgroundColor: booking.status === 'requested' ? 'rgba(245, 158, 11, 0.1)' : (booking.status === 'accepted' ? 'rgba(37, 99, 235, 0.1)' : (booking.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)')),
                            color: booking.status === 'requested' ? 'var(--warning)' : (booking.status === 'accepted' ? 'var(--primary)' : (booking.status === 'completed' ? 'var(--success)' : 'var(--danger)'))
                          }}>
                            {booking.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontSize: '12px' }}>
                    <div>
                      Driver: <b>{booking.ride?.driver?.name || 'David Miller'}</b> ({booking.ride?.vehicleType || 'Sedan'})
                      <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                        Seats: <b>{booking.seatsBooked}</b> | Total Fare: <b>₹{(booking.fare || 0).toFixed(2)}</b>
                      </div>
                      {booking.ride?.price && (
                        <div style={{ marginTop: '2px', color: 'var(--text-light)', fontSize: '10px' }}>
                          Breakdown: ({((booking.fare / (booking.ride.price * booking.seatsBooked)) * 100).toFixed(0)}% of route distance) × ₹{booking.ride.price} × {booking.seatsBooked} {booking.seatsBooked === 1 ? 'seat' : 'seats'}
                        </div>
                      )}
                    </div>

                    <div>
                      {booking.status === 'requested' && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          style={{
                            border: 'none', background: 'none', color: 'var(--danger)',
                            fontWeight: '600', cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          Cancel Booking
                        </button>
                      )}

                      {booking.status === 'completed' && booking.ratingToDriver === 0 && (
                        <button
                          onClick={() => setRatingBooking(booking)}
                          className="gradient-btn"
                          style={{
                            padding: '6px 12px', fontSize: '11px', borderRadius: '4px', gap: '4px'
                          }}
                        >
                          <Star size={11} fill="currentColor" />
                          Rate Driver
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Saved Favorite locations */}
        <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', height: 'fit-content', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={18} style={{ color: 'var(--danger)' }} /> Saved Locations
          </h3>

          <form onSubmit={handleAddFavorite} style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Add favorite location..."
              value={newFav}
              onChange={(e) => setNewFav(e.target.value)}
              className="form-input"
              style={{ fontSize: '12px', padding: '8px 12px' }}
            />
            <button type="submit" className="gradient-btn" style={{ padding: '8px 12px', fontSize: '12px', borderRadius: '10px' }}>
              Add
            </button>
          </form>

          {favs.length === 0 ? (
            <p style={{ color: 'var(--text-light)', fontSize: '12px', textAlign: 'center' }}>No saved places yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {favs.map((fav, index) => (
                <li key={index} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} style={{ color: 'var(--primary)' }} />
                    <span>{fav}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveFavorite(index)}
                    style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '11px' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Car, MapPin, Clock, Phone, ShieldAlert, Share2, MessageCircle, Star, 
  Copy, Check, CheckCircle, AlertCircle, User, LogOut, 
  ShieldCheck, Edit3, ChevronRight, ArrowRight
} from 'lucide-react';
import ChatWindow from './ChatWindow';
import RideSearch from './RideSearch';
import confetti from 'canvas-confetti';
import { API_URL } from '../config';

export default function PassengerDashboard({ token, activeUser, onProfileUpdate, onSearchRides, onLogout, activeTab: propActiveTab, setActiveTab: propSetActiveTab, onBookRide }) {
  const [localSubTab, setLocalSubTab] = useState('my-rides');
  const activeSubTab = propActiveTab || localSubTab;
  const setActiveSubTab = propSetActiveTab || setLocalSubTab;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Rating states
  const [ratingBooking, setRatingBooking] = useState(null);
  const [starCount, setStarCount] = useState(5);
  const [reviewText, setReviewText] = useState('');

  // SOS status
  const [sosActive, setSosActive] = useState(false);
  // Trip sharing
  const [sharedBookingId, setSharedBookingId] = useState(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(activeUser.name || '');
  const [editPhone, setEditPhone] = useState(activeUser.phone || '');
  const [profileMsg, setProfileMsg] = useState('');

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
    fetchBookings(true);
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



  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, phone: editPhone })
      });

      if (res.ok) {
        const data = await res.json();
        setProfileMsg('Profile updated successfully!');
        if (onProfileUpdate) onProfileUpdate(data);
        setTimeout(() => {
          setIsEditingProfile(false);
          setProfileMsg('');
        }, 1500);
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

  const triggerSOS = (targetBooking) => {
    const bookingToUse = targetBooking || activeBooking;
    if (!bookingToUse || !bookingToUse.ride) {
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
              rideId: bookingToUse.ride._id || bookingToUse.ride,
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

  const now = new Date();

  // Helper to check if a booking is active/upcoming
  const isUpcoming = (b) => {
    if (b.status === 'completed' || b.status === 'cancelled') return false;
    if (b.ride?.departureTime && new Date(b.ride.departureTime) < now && b.status !== 'started') {
      return false; // Scheduled time has passed and not currently started
    }
    return true;
  };

  const currentRides = bookings.filter(isUpcoming);
  const historyRides = bookings.filter(b => !isUpcoming(b));
  const activeBooking = currentRides.find(b => b.status === 'accepted' || b.status === 'started');

  const renderRideCard = (booking, isHistory = false) => {
    const driver = booking.ride?.driver;
    const vehicleModel = driver?.driverDetails?.vehicleModel || booking.ride?.vehicleType || 'Sedan';
    const vehiclePlate = driver?.driverDetails?.vehicleNo || 'KA-19-RC-2026';
    const isOngoing = !isHistory && (booking.status === 'accepted' || booking.status === 'started');
    const isTimePassed = booking.ride?.departureTime && new Date(booking.ride.departureTime) < new Date() && booking.status !== 'started';

    const isCancelled = booking.status === 'cancelled' || booking.status === 'rejected';
    const isCompleted = booking.status === 'completed' || isTimePassed || isHistory;

    let statusLabel = booking.status ? booking.status.toUpperCase() : 'UNKNOWN';
    let statusBg = 'rgba(239, 68, 68, 0.12)';
    let statusColor = 'var(--danger)';

    if (isCancelled) {
      statusLabel = 'CANCELLED';
      statusBg = 'rgba(239, 68, 68, 0.15)';
      statusColor = 'var(--danger)';
    } else if (isCompleted) {
      statusLabel = 'COMPLETED';
      statusBg = 'rgba(16, 185, 129, 0.15)';
      statusColor = 'var(--success)';
    } else if (booking.status === 'started') {
      statusLabel = 'IN TRANSIT';
      statusBg = 'rgba(16, 185, 129, 0.15)';
      statusColor = 'var(--success)';
    } else if (booking.status === 'accepted') {
      statusLabel = 'CONFIRMED';
      statusBg = 'rgba(37, 99, 235, 0.15)';
      statusColor = 'var(--primary)';
    } else if (booking.status === 'requested') {
      statusLabel = 'REQUESTED';
      statusBg = 'rgba(245, 158, 11, 0.15)';
      statusColor = 'var(--warning)';
    }

    return (
      <div
        key={booking._id}
        className="glass-card"
        style={{
          padding: '14px 18px',
          background: 'var(--bg-secondary)',
          border: isOngoing ? '2px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: isOngoing ? 'var(--shadow-md)' : 'none',
          opacity: isHistory ? 0.95 : 1
        }}
      >
        {/* Top Row: Driver & Status Pill */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: '800',
              flexShrink: 0
            }}>
              {(driver?.name || 'D').charAt(0).toUpperCase()}
            </div>
            <div>
              <strong style={{ fontSize: '14px', display: 'block', lineHeight: '1.2' }}>{driver?.name || 'Driver'}</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                🚗 {vehicleModel} • <b style={{ color: 'var(--text-primary)' }}>{vehiclePlate}</b>
              </span>
            </div>
          </div>

          <span style={{
            padding: '4px 10px',
            borderRadius: '16px',
            fontSize: '10px',
            fontWeight: '800',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            backgroundColor: statusBg,
            color: statusColor,
            border: '1px solid currentColor'
          }}>
            {statusLabel}
          </span>
        </div>

        {/* Route Visual Map Graphic */}
        <div style={{
          background: 'var(--bg-primary)',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
              <div style={{ width: '2px', height: '18px', backgroundColor: 'var(--border-color)' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>
                <span style={{ fontSize: '9px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>Pickup</span>
                <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: '1.2' }}>{booking.pickupLocation || booking.ride?.pickupLocation}</div>
              </div>
              <div>
                <span style={{ fontSize: '9px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>Drop</span>
                <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: '1.2' }}>{booking.destination || booking.ride?.destination}</div>
              </div>
            </div>
          </div>

          {/* Travel Date & Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <Clock size={11} /> Scheduled Time
            </span>
            <strong style={{ fontSize: '12px' }}>
              {booking.ride?.departureTime ? new Date(booking.ride.departureTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </strong>
          </div>
        </div>

        {/* Live Tracking & Trip Info Bar (OTP, Call, Share, Emergency SOS) */}
        {isOngoing && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(14,165,233,0.06) 100%)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(37,99,235,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {/* Top Sub-Row: Boarding OTP & Status Pipeline */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {booking.otp ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Boarding OTP:
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '3px', color: 'var(--primary)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--primary)' }}>
                    {booking.otp}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Trip Confirmed & Active
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700' }}>
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} /> Confirmed
                </span>
                <span style={{ color: 'var(--text-light)' }}>➔</span>
                <span style={{ color: booking.status === 'started' ? 'var(--success)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Car size={12} /> {booking.status === 'started' ? 'In Transit' : 'En Route'}
                </span>
              </div>
            </div>

            {/* Bottom Actions Row: Call, Share, Emergency SOS */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {driver?.phone && (
                  <a
                    href={`tel:${driver.phone}`}
                    style={{
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--primary)',
                      background: 'rgba(37,99,235,0.08)', color: 'var(--primary)', cursor: 'pointer',
                      fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px',
                      textDecoration: 'none'
                    }}
                  >
                    <Phone size={12} />
                    <span>Call Driver</span>
                  </a>
                )}

                <button
                  onClick={() => handleShareTrip(booking._id)}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer',
                    fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  {sharedBookingId === booking._id ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Share2 size={12} />}
                  <span>{sharedBookingId === booking._id ? 'Link Copied' : 'Share Trip'}</span>
                </button>
              </div>

              <button
                onClick={() => triggerSOS(booking)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--danger)',
                  background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', cursor: 'pointer',
                  fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <ShieldAlert size={13} />
                <span>EMERGENCY SOS</span>
              </button>
            </div>
          </div>
        )}

        {/* Fare & Booking Specs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
            <div>
              <span>Seats: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{booking.seatsBooked} {booking.seatsBooked === 1 ? 'seat' : 'seats'}</strong>
            </div>
            <div>
              <span>Fare: </span>
              <strong className="gradient-text" style={{ fontSize: '14px', fontWeight: '800' }}>₹{(booking.fare || 0).toFixed(2)}</strong>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!isHistory && booking.status === 'requested' && !isTimePassed && (
              <button
                onClick={() => handleCancelBooking(booking._id)}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--danger)',
                  background: 'transparent', color: 'var(--danger)', cursor: 'pointer',
                  fontWeight: '600', fontSize: '11px'
                }}
              >
                Cancel Request
              </button>
            )}

            {!isHistory && isOngoing && (
              <button
                onClick={() => setActiveSubTab('chat')}
                style={{
                  padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer',
                  fontWeight: '600', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px'
                }}
              >
                <MessageCircle size={12} />
                <span>Chat Driver</span>
              </button>
            )}

            {booking.status === 'completed' && booking.ratingToDriver === 0 && (
              <button
                onClick={() => {
                  setRatingBooking(booking);
                  setActiveSubTab('profile');
                }}
                className="gradient-btn"
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Star size={12} fill="currentColor" />
                <span>Rate Driver</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '24px 0 50px 0' }}>
      
      {/* ========================================================================= */}
      {/* PAGE 0: FIND RIDE VIEW                                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'find' && (
        <div className="animate-fade-in">
          <RideSearch onBookRide={onBookRide} activeUser={activeUser} />
        </div>
      )}

      {/* SOS Active Banner if triggered */}
      {sosActive && (
        <div className="glass-card animate-pulse-soft" style={{
          padding: '12px 18px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid var(--danger)',
          color: 'var(--danger)',
          borderRadius: '10px',
          marginBottom: '20px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '13px'
        }}>
          <AlertCircle size={20} />
          <span>Active SOS Transmitted: Platform Safety Admin is monitoring your real-time coordinates.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 1: MY RIDES PAGE VIEW                                               */}
      {/* ========================================================================= */}
      {activeSubTab === 'my-rides' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1050px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '2px' }}>
                My <span className="gradient-text">Rides</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                Manage your active, upcoming, and completed journey details.
              </p>
            </div>
          </div>

          {/* Section 1: Active & Upcoming Rides */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Car size={16} style={{ color: 'var(--primary)' }} /> Active & Upcoming Rides
              {currentRides.length > 0 && (
                <span style={{ fontSize: '10px', background: 'rgba(37,99,235,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: '800' }}>
                  {currentRides.length}
                </span>
              )}
            </h3>

            {currentRides.length === 0 ? (
              <div className="glass-card" style={{ padding: '28px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <Car size={32} style={{ color: 'var(--primary)', opacity: 0.6, marginBottom: '8px' }} />
                <h4 style={{ fontSize: '15px', marginBottom: '4px' }}>No Active Rides</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '400px', margin: '0 auto 14px auto' }}>
                  You don't have any active or upcoming ride requests.
                </p>
                {onSearchRides && (
                  <button
                    onClick={onSearchRides}
                    className="gradient-btn"
                    style={{ padding: '8px 20px', fontSize: '12px', borderRadius: '8px' }}
                  >
                    Search Available Rides
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentRides.map((booking) => renderRideCard(booking, false))}
              </div>
            )}
          </div>

          {/* Section 2: Ride History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--text-secondary)' }} /> Ride History
              {historyRides.length > 0 && (
                <span style={{ fontSize: '10px', background: 'var(--bg-primary)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '10px', fontWeight: '700', border: '1px solid var(--border-color)' }}>
                  {historyRides.length}
                </span>
              )}
            </h3>

            {historyRides.length === 0 ? (
              <div className="glass-card" style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>
                  No completed or past trips in your history yet.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {historyRides.map((booking) => renderRideCard(booking, true))}
              </div>
            )}
          </div>

        </div>
      )}



      {/* ========================================================================= */}
      {/* PAGE 3: CHAT PAGE VIEW                                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'chat' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              Driver <span className="gradient-text">Chat</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Communicate directly with your assigned driver regarding pickup spots, baggage, or timing.
            </p>
          </div>

          {!activeBooking ? (
            <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <MessageCircle size={48} style={{ color: 'var(--primary)', opacity: 0.6, marginBottom: '16px' }} />
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Driver Chat Unavailable</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 24px auto' }}>
                You can chat with your driver once a ride booking request is active or accepted.
              </p>
              {onSearchRides && (
                <button
                  onClick={onSearchRides}
                  className="gradient-btn"
                  style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '13px' }}
                >
                  Find a Driver
                </button>
              )}
            </div>
          ) : (
            <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
              
              {/* Driver Header Summary */}
              <div className="glass-card" style={{
                padding: '14px 20px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '800'
                  }}>
                    {(activeBooking.ride?.driver?.name || 'D').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', margin: 0 }}>{activeBooking.ride?.driver?.name}</h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Route: <b>{activeBooking.pickupLocation} ➔ {activeBooking.destination}</b>
                    </span>
                  </div>
                </div>

                <a
                  href={`tel:${activeBooking.ride?.driver?.phone}`}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--primary)',
                    background: 'rgba(37,99,235,0.08)', color: 'var(--primary)', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px',
                    textDecoration: 'none'
                  }}
                >
                  <Phone size={14} />
                  <span>Call Driver</span>
                </a>
              </div>

              {/* Chat Window Component */}
              <ChatWindow rideId={activeBooking.ride?._id} currentUser={activeUser} token={token} />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 4: PROFILE PAGE VIEW                                                 */}
      {/* ========================================================================= */}
      {activeSubTab === 'profile' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '4px' }}>
              User <span className="gradient-text">Profile & Settings</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Manage your personal info, ride history, and account security.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* User Profile Info Card */}
            <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary) 0%, #0ea5e9 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '26px',
                    fontWeight: '800',
                    boxShadow: 'var(--shadow-md)'
                  }}>
                    {(activeUser.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>{activeUser.name}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 12px', borderRadius: '14px', background: 'rgba(37,99,235,0.12)', color: 'var(--primary)', fontSize: '11px', fontWeight: '700' }}>
                        PASSENGER ACCOUNT
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer',
                    fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Edit3 size={14} />
                  <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-primary)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="form-input"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  {profileMsg && <div style={{ color: 'var(--success)', fontSize: '12px', fontWeight: '600' }}>{profileMsg}</div>}
                  <button type="submit" className="gradient-btn" style={{ padding: '10px 20px', fontSize: '13px', borderRadius: '8px', alignSelf: 'flex-start' }}>
                    Save Profile Changes
                  </button>
                </form>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', background: 'var(--bg-primary)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.5px' }}>EMAIL ADDRESS</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{activeUser.email}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.5px' }}>PHONE NUMBER</span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{activeUser.phone || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: '700', marginBottom: '4px', letterSpacing: '0.5px' }}>ACCOUNT TYPE</span>
                    <strong style={{ fontSize: '14px', color: 'var(--primary)' }}>Passenger</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Ride History */}
            <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} style={{ color: 'var(--primary)' }} /> Ride History
                </h3>
                {historyRides.length > 0 && (
                  <span style={{ fontSize: '11px', background: 'var(--bg-primary)', color: 'var(--text-secondary)', padding: '3px 10px', borderRadius: '12px', fontWeight: '700', border: '1px solid var(--border-color)' }}>
                    {historyRides.length} {historyRides.length === 1 ? 'Trip' : 'Trips'}
                  </span>
                )}
              </div>

              {historyRides.length === 0 ? (
                <div style={{ padding: '30px 20px', textAlign: 'center', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                    No completed or past trips in your history yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {historyRides.map((b) => renderRideCard(b, true))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL OVERLAY */}
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

    </div>
  );
}

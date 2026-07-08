import React, { useState, useEffect } from 'react';
import { PlusCircle, Calendar, Users, MapPin, DollarSign, Briefcase, Star, Clock, AlertTriangle, ShieldCheck, Phone } from 'lucide-react';
import confetti from 'canvas-confetti';
import { API_URL } from '../config';
import ChatWindow from './ChatWindow';


const LOCAL_PLACES = {
  'Kasaragod': { lat: 12.4984, lng: 74.9896 },
  'Puttur': { lat: 12.7623, lng: 75.2003 },
  'Vitla': { lat: 12.7667, lng: 75.0833 },
  'Mangalore': { lat: 12.9141, lng: 74.8560 },
  'Badiadka': { lat: 12.5884, lng: 75.0698 },
  'Perla': { lat: 12.6426, lng: 75.1049 }
};

export default function DriverDashboard({ token, activeUser }) {
  // Offer Ride Form
  const [stops, setStops] = useState(['', '']);
  const [departureTime, setDepartureTime] = useState('');
  const [price, setPrice] = useState('');
  const [totalSeats, setTotalSeats] = useState(3);
  
  // States
  const [driverBookings, setDriverBookings] = useState([]);
  const [myRides, setMyRides] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [otpInputs, setOtpInputs] = useState({}); // bookingId -> otpCode
  const [driverSosActive, setDriverSosActive] = useState(false);

  // Helper to calculate Haversine distance
  const getDistanceBetween = (loc1, loc2) => {
    const coords1 = LOCAL_PLACES[loc1];
    const coords2 = LOCAL_PLACES[loc2];
    if (!coords1 || !coords2) return 0;

    const R = 6371;
    const dLat = (coords2.lat - coords1.lat) * Math.PI / 180;
    const dLng = (coords2.lng - coords1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coords1.lat * Math.PI / 180) * Math.cos(coords2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Auto-calculate fare based on actual stops route distance and fixed rate of ₹3/km
  useEffect(() => {
    let totalDist = 0;
    let isValid = true;
    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i];
      const s2 = stops[i+1];
      if (s1 && s2) {
        totalDist += getDistanceBetween(s1, s2);
      } else {
        isValid = false;
      }
    }
    if (isValid && stops.length >= 2) {
      setPrice((totalDist * 3.0).toFixed(2));
    } else {
      setPrice('');
    }
  }, [stops]);

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

  const fetchDriverData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, [token]);

  const handleOfferRide = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (stops.length < 2) {
      setError('Please add at least 2 stops for your route.');
      return;
    }

    for (const stop of stops) {
      if (!stop || !LOCAL_PLACES[stop]) {
        setError('Please select valid locations for all stops.');
        return;
      }
    }

    const uniqueStops = new Set(stops);
    if (uniqueStops.size !== stops.length) {
      setError('Route cannot contain duplicate stops.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stops,
          departureTime,
          price: parseFloat(price),
          totalSeats: parseInt(totalSeats)
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
      
      // Celebrate!
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.8 } });
      
      fetchDriverData();
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

  const activeBookings = driverBookings.filter(b => b.status === 'accepted' || b.status === 'started');
  const otherBookings = driverBookings.filter(b => b.status !== 'accepted' && b.status !== 'started');

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

  return (
    <div className="container animate-fade-in" style={{ padding: '40px 0 60px 0' }}>
      <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>
        Driver <span className="gradient-text">Console</span>
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        Offer empty seats on your journey, review passenger reservation requests, and manage your earnings.
      </p>

      {message && (
        <div className="glass-card animate-fade-in" style={{
          padding: '16px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          borderRadius: '10px',
          marginBottom: '24px',
          fontWeight: '600'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div className="glass-card animate-fade-in" style={{
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          borderRadius: '10px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* SOS banner if activated */}
      {driverSosActive && (
        <div className="glass-card animate-pulse-soft" style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid var(--danger)',
          color: 'var(--danger)',
          borderRadius: '12px',
          marginBottom: '24px',
          fontWeight: '700',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <AlertTriangle size={20} />
          <span>Active SOS Triggered. Safety admins have been notified of your location.</span>
        </div>
      )}

      {/* Driver Summary Counters */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <Briefcase size={24} style={{ margin: 'auto' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: '600' }}>TOTAL TRIPS</p>
            <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{myRides.length}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <DollarSign size={24} style={{ margin: 'auto' }} />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: '600' }}>MY EARNINGS</p>
            <h3 style={{ fontSize: '24px', fontWeight: '800' }}>₹{activeUser.driverDetails?.earnings?.toFixed(2) || '0.00'}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <Star size={24} style={{ margin: 'auto' }} fill="currentColor" />
          </div>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: '600' }}>RATING</p>
            <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{activeUser.rating ? activeUser.rating.toFixed(1) : '0.0'} ⭐</h3>
          </div>
        </div>
      </div>

      {/* Active Trip Tracking Panel */}
      {activeBookings.length > 0 && (
        <div style={{ marginBottom: '40px' }} className="animate-fade-in">
          <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--primary)' }}>Active Trip Tracking</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px'
          }} className="dashboard-grid">
            {/* Left: Current Ride Details and Stats */}
            <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h4 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', color: 'var(--primary)' }}>Current Ride Details</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Start Location</span>
                  <strong style={{ fontSize: '15px' }}>{activeBookings[0].ride?.pickupLocation}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Destination</span>
                  <strong style={{ fontSize: '15px' }}>{activeBookings[0].ride?.destination}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Departure Time</span>
                  <span style={{ fontSize: '14px' }}>
                    {new Date(activeBookings[0].ride?.departureTime).toLocaleDateString()} at{' '}
                    {new Date(activeBookings[0].ride?.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Available Seats</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success)' }}>
                    {activeBookings[0].ride?.availableSeats} / {activeBookings[0].ride?.totalSeats} seats left
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '10px', marginTop: '10px' }}>
                <h5 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', fontWeight: '700' }}>Active Passengers Summary</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activeBookings.map((b, i) => (
                    <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: i < activeBookings.length - 1 ? '1px solid var(--border-color)' : 'none', paddingBottom: '6px' }}>
                      <span>👤 {b.passenger?.name} ({b.pickupLocation} ➔ {b.destination})</span>
                      <strong style={{ color: 'var(--primary)' }}>₹{(b.fare || 0).toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div>🏁 <b>Total Route Distance:</b> {activeBookings[0].ride?.distance?.toFixed(1) || '37.4'} km</div>
                <div>💰 <b>Estimated Trip Cost:</b> ₹{(activeBookings[0].ride?.price || 0.00).toFixed(2)}</div>
                <div>🟢 <b>Accept/Reject Ride requests:</b> Active in Passenger requests review list below.</div>
              </div>

              <button
                type="button"
                onClick={handleDriverSOS}
                style={{
                  padding: '12px',
                  border: '1px solid var(--danger)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--danger)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'var(--transition)'
                }}
              >
                <AlertTriangle size={16} />
                <span>Emergency SOS</span>
              </button>
            </div>

            {/* Right: Passenger details, OTP verification/complete actions, and Chat */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-card animate-fade-in" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '18px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', color: 'var(--primary)', marginBottom: '4px' }}>
                  Trip Itinerary (Sorted by Stops)
                </h4>
                
                {/* List stops sequentially */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', paddingLeft: '24px', borderLeft: '2px dashed var(--border-color)', marginLeft: '12px' }}>
                  {activeBookings[0].ride?.stops?.map((stop, idx) => {
                    const boardingPassengers = activeBookings.filter(b => b.pickupLocation === stop && b.status === 'accepted');
                    const deboardingPassengers = activeBookings.filter(b => b.destination === stop && b.status === 'started');
                    
                    if (boardingPassengers.length === 0 && deboardingPassengers.length === 0) return null;

                    return (
                      <div key={stop} style={{ position: 'relative' }}>
                        {/* Stop bullet point */}
                        <div style={{
                          position: 'absolute',
                          left: '-31px',
                          top: '4px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: idx === 0 ? 'var(--primary)' : (idx === activeBookings[0].ride.stops.length - 1 ? 'var(--secondary)' : 'var(--accent)'),
                          border: '3px solid var(--bg-secondary)',
                          zIndex: 10
                        }} />
                        
                        <strong style={{ fontSize: '15px', display: 'block', color: 'var(--text-primary)', marginBottom: '10px' }}>
                          Stop: {stop}
                        </strong>

                        {/* Pickups */}
                        {boardingPassengers.map(b => (
                          <div key={b._id} style={{
                            background: 'var(--bg-primary)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            marginBottom: '10px',
                            fontSize: '13px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span>👤 Boarding: <b>{b.passenger?.name}</b> (to {b.destination})</span>
                              <strong style={{ color: 'var(--success)' }}>{b.seatsBooked} {b.seatsBooked === 1 ? 'Seat' : 'Seats'}</strong>
                            </div>
                            
                            {/* OTP verify */}
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <input
                                type="text"
                                maxLength="4"
                                placeholder="Board OTP"
                                value={otpInputs[b._id] || ''}
                                onChange={(e) => setOtpInputs({ ...otpInputs, [b._id]: e.target.value })}
                                className="form-input"
                                style={{ height: '32px', fontSize: '12px', flex: 1, padding: '4px 8px' }}
                              />
                              <button
                                onClick={() => handleUpdateBookingStatus(b._id, 'started', otpInputs[b._id])}
                                style={{
                                  padding: '6px 12px',
                                  border: 'none',
                                  backgroundColor: 'var(--success)',
                                  color: 'white',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}
                              >
                                Start Boarding
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Dropoffs */}
                        {deboardingPassengers.map(b => (
                          <div key={b._id} style={{
                            background: 'var(--bg-primary)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            marginBottom: '10px',
                            fontSize: '13px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span>👤 Deboarding: <b>{b.passenger?.name}</b> (from {b.pickupLocation})</span>
                              <strong style={{ color: 'var(--primary)' }}>₹{(b.fare || 0).toFixed(2)}</strong>
                            </div>
                            <button
                              onClick={() => handleUpdateBookingStatus(b._id, 'completed')}
                              style={{
                                width: '100%',
                                padding: '8px',
                                border: 'none',
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                            >
                              Complete Passenger Trip
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat Window with Passengers */}
              <ChatWindow rideId={activeBookings[0].ride?._id} currentUser={activeUser} token={token} />
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid" style={{ paddingTop: 0 }}>
        {/* Left side: Offer Ride form */}
        <div className="glass-card animate-fade-in" style={{ padding: '24px', background: 'var(--bg-secondary)', height: 'fit-content', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} style={{ color: 'var(--primary)' }} /> Offer a New Ride
          </h3>

          <form onSubmit={handleOfferRide} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stops.map((stop, index) => {
              const label = index === 0 ? "Pickup Stop (Start)" : (index === stops.length - 1 ? "Drop Stop (End)" : `Intermediate Stop #${index}`);
              return (
                <div key={index}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <span>{label}</span>
                    {stops.length > 2 && index !== 0 && index !== stops.length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...stops];
                          updated.splice(index, 1);
                          setStops(updated);
                        }}
                        style={{ border: 'none', background: 'none', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}
                      >
                        Remove Stop
                      </button>
                    )}
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <MapPin size={16} style={{ position: 'absolute', left: '12px', color: index === 0 ? 'var(--primary)' : (index === stops.length - 1 ? 'var(--secondary)' : 'var(--accent)'), zIndex: 10 }} />
                    <select
                      required
                      value={stop}
                      onChange={(e) => {
                        const updated = [...stops];
                        updated[index] = e.target.value;
                        setStops(updated);
                      }}
                      className="form-input"
                      style={{ paddingLeft: '38px' }}
                    >
                      <option value="">Select Stop Location</option>
                      {Object.keys(LOCAL_PLACES).map(place => (
                        <option key={place} value={place}>{place}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                const updated = [...stops];
                updated.splice(updated.length - 1, 0, '');
                setStops(updated);
              }}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <PlusCircle size={14} /> Add Intermediate Stop
            </button>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Date and Time</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Calendar size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }} />
                <input
                  type="datetime-local"
                  required
                  value={departureTime}
                  min={getTomorrowString()}
                  max={getFiveDaysMaxString()}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Total Trip Cost (for complete route)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '10px', color: 'var(--text-light)', fontSize: '12px', fontWeight: 'bold' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="E.g. 500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '28px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Seats Available</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Users size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-light)' }} />
                  <select
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(parseInt(e.target.value))}
                    className="form-input"
                    style={{ paddingLeft: '28px' }}
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>


            <button
              type="submit"
              className="gradient-btn"
              style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '8px' }}
            >
              Publish Offered Ride
            </button>
          </form>
        </div>

        {/* Right side: Manage Bookings & Trips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active / Requested passenger bookings */}
          <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Passenger Requests & Trips</h3>

            {otherBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-light)' }}>
                No active bookings or matching requested seats from passengers.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {otherBookings.map((booking) => (
                  <div 
                    key={booking._id}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Passenger & Ride header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                          {(booking.passenger?.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block' }}>PASSENGER</span>
                          <strong style={{ fontSize: '14px' }}>{booking.passenger?.name}</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                            ({booking.passenger?.rating?.toFixed(1)} ⭐)
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          backgroundColor: booking.status === 'requested' ? 'rgba(245, 158, 11, 0.1)' : (booking.status === 'accepted' ? 'rgba(37, 99, 235, 0.1)' : (booking.status === 'started' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)')),
                          color: booking.status === 'requested' ? 'var(--warning)' : (booking.status === 'accepted' ? 'var(--primary)' : (booking.status === 'started' ? 'var(--success)' : 'var(--text-secondary)'))
                        }}>
                          {booking.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Route brief */}
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>
                        <strong style={{ color: 'var(--text-secondary)' }}>Route: </strong>
                        {booking.pickupLocation || booking.ride?.pickupLocation} ➔ {booking.destination || booking.ride?.destination}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                        <div style={{ display: 'flex', gap: '14px', color: 'var(--text-light)', fontSize: '12px' }}>
                          <span>Seats: <b>{booking.seatsBooked}</b></span>
                          <span>Total Fare: <b>₹{(booking.fare || 0).toFixed(2)}</b></span>
                        </div>
                        {booking.ride?.price && (
                          <div style={{ color: 'var(--text-light)', fontSize: '10px' }}>
                            Breakdown: ({((booking.fare / (booking.ride.price * booking.seatsBooked)) * 100).toFixed(0)}% of route distance) × ₹{booking.ride.price} × {booking.seatsBooked} {booking.seatsBooked === 1 ? 'seat' : 'seats'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls based on status */}
                    {booking.status === 'requested' && (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleUpdateBookingStatus(booking._id, 'rejected')}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid var(--danger)',
                            color: 'var(--danger)',
                            background: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          Decline
                        </button>
                        
                        <button
                          onClick={() => handleUpdateBookingStatus(booking._id, 'accepted')}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          Accept Request
                        </button>
                      </div>
                    )}

                    {booking.status === 'accepted' && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="text"
                            maxLength="4"
                            placeholder="Enter Passenger OTP"
                            value={otpInputs[booking._id] || ''}
                            onChange={(e) => setOtpInputs({ ...otpInputs, [booking._id]: e.target.value })}
                            className="form-input"
                            style={{ width: '130px', height: '32px', fontSize: '12px', padding: '4px 8px' }}
                          />
                        </div>
                        <button
                          onClick={() => handleUpdateBookingStatus(booking._id, 'started', otpInputs[booking._id])}
                          style={{
                            padding: '6px 14px',
                            border: 'none',
                            backgroundColor: 'var(--success)',
                            color: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <ShieldCheck size={14} /> Start Ride
                        </button>
                      </div>
                    )}

                    {booking.status === 'started' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                        <button
                          onClick={() => handleUpdateBookingStatus(booking._id, 'completed')}
                          style={{
                            padding: '8px 16px',
                            border: 'none',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          Complete Passenger Trip
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List of my offered rides history */}
          <div className="glass-card" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>My Posted Journeys</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myRides.map((ride) => (
                <div key={ride._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                  <div>
                    <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{ride.pickupLocation} ➔ {ride.destination}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                      {new Date(ride.departureTime).toLocaleString()} | Seats: {ride.availableSeats}/{ride.totalSeats}
                    </span>
                  </div>
                  <div>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      backgroundColor: ride.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(37,99,235,0.1)',
                      color: ride.status === 'completed' ? 'var(--success)' : 'var(--primary)'
                    }}>
                      {ride.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

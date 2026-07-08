import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, SlidersHorizontal, ShieldCheck, Car, Star, DollarSign } from 'lucide-react';
import { API_URL } from '../config';

const LOCAL_PLACES = {
  'Kasaragod': { lat: 12.4984, lng: 74.9896 },
  'Puttur': { lat: 12.7623, lng: 75.2003 },
  'Vitla': { lat: 12.7667, lng: 75.0833 },
  'Mangalore': { lat: 12.9141, lng: 74.8560 },
  'Badiadka': { lat: 12.5884, lng: 75.0698 },
  'Perla': { lat: 12.6426, lng: 75.1049 }
};

export default function RideSearch({ onBookRide, activeUser }) {
  const getTomorrowDateOnlyString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getFiveDaysMaxDateOnlyString = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 5);
    return maxDate.toISOString().split('T')[0];
  };

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState(1);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [vehicleType, setVehicleType] = useState('Any');
  const [genderPreference, setGenderPreference] = useState('Any');
  
  // Results
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRides = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_URL}/api/rides?pickup=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(destination)}&seats=${seats}`;
      if (date) url += `&date=${date}`;
      if (maxPrice) url += `&maxPrice=${maxPrice}`;
      if (vehicleType !== 'Any') url += `&vehicleType=${vehicleType}`;
      if (genderPreference !== 'Any') url += `&genderPreference=${genderPreference}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch rides');
      const data = await res.json();
      setRides(data);
    } catch (err) {
      setError(err.message || 'Something went wrong fetching rides.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchRides();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRides();
  };

  return (
    <div style={{ padding: '20px 0 60px 0' }} id="find">
      <div className="container">
        <h2 style={{ fontSize: '32px', marginBottom: '8px', textAlign: 'center' }}>
          Find Your <span className="gradient-text">Perfect Ride</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '30px' }}>
          Compare prices, vehicle types, and driver ratings to choose the best option.
        </p>

        {/* Search Bar Form */}
        <form onSubmit={handleSearch} className="glass-card" style={{
          padding: '24px',
          borderRadius: '16px',
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {/* Pickup */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', color: 'var(--primary)', zIndex: 10 }} />
              <select
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
              >
                <option value="">Pickup Location</option>
                {Object.keys(LOCAL_PLACES).map(place => (
                  <option key={place} value={place}>{place}</option>
                ))}
              </select>
            </div>

            {/* Destination */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <MapPin size={18} style={{ position: 'absolute', left: '12px', color: 'var(--secondary)', zIndex: 10 }} />
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
              >
                <option value="">Destination</option>
                {Object.keys(LOCAL_PLACES).map(place => (
                  <option key={place} value={place}>{place}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} />
              <input
                type="date"
                value={date}
                min={getTomorrowDateOnlyString()}
                max={getFiveDaysMaxDateOnlyString()}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px' }}
              />
            </div>

            {/* Seats */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Users size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} />
              <select
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value))}
                className="form-input"
                style={{ paddingLeft: '40px' }}
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'Seat' : 'Seats'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px'
          }}>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px 16px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'var(--transition)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <SlidersHorizontal size={16} />
              <span>Filters {showFilters ? '(Hide)' : ''}</span>
            </button>

            <button
              type="submit"
              className="gradient-btn"
              style={{ padding: '12px 28px', fontSize: '15px', gap: '8px' }}
            >
              <Search size={16} />
              Search Rides
            </button>
          </div>

          {/* Collapsible Filters Panel */}
          {showFilters && (
            <div className="animate-fade-in" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              padding: '16px',
              borderRadius: '8px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)'
            }}>
              {/* Max Price */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Max Price (₹)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '10px', color: 'var(--text-light)', fontSize: '12px', fontWeight: 'bold' }}>₹</span>
                  <input
                    type="number"
                    placeholder="E.g. 100"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '30px' }}
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Vehicle Class</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="form-input"
                >
                  <option value="Any">Any Vehicle</option>
                  <option value="Sedan">Sedan</option>
                  <option value="Hatchback">Hatchback</option>
                  <option value="SUV">SUV</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>

              {/* Gender Preference */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Gender Preference</label>
                <select
                  value={genderPreference}
                  onChange={(e) => setGenderPreference(e.target.value)}
                  className="form-input"
                >
                  <option value="Any">Any Gender</option>
                  <option value="Male Only">Male Only</option>
                  <option value="Female Only">Female Only</option>
                </select>
              </div>
            </div>
          )}
        </form>

        {/* Results Section */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{
              border: '4px solid var(--border-color)',
              borderTop: '4px solid var(--primary)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite'
            }} className="spinner" />
          </div>
        ) : error ? (
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        ) : rides.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--bg-secondary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Car size={48} style={{ color: 'var(--text-light)', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>No Available Rides Found</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
              We couldn't find any rides matching your search. Try adjusting locations, dates, or filter options.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {rides.map((ride) => (
              <div 
                key={ride._id}
                className="glass-card animate-fade-in"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '24px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Header: Driver Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifySpace: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                      {(ride.driver?.name || 'D').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px' }}>{ride.driver?.name}</span>
                        {ride.driver?.driverDetails?.isVerified && (
                          <ShieldCheck size={16} style={{ color: 'var(--success)' }} title="Verified Driver" />
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <Star size={12} fill="currentColor" style={{ color: '#eab308' }} />
                        <span>{(ride.driver?.rating || 0).toFixed(1)} ({ride.driver?.ratingCount || 0} reviews)</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}>
                      ₹{ride.price.toFixed(2)}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>per seat</span>
                  </div>
                </div>
                {/* Ride route sequential timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: '700', textTransform: 'uppercase' }}>Route Stops Timeline</span>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    paddingLeft: '20px',
                    borderLeft: '2px dashed var(--border-color)',
                    marginLeft: '6px'
                  }}>
                    {ride.stops?.map((stop, idx) => {
                      const isPassengerPickup = stop === pickup;
                      const isPassengerDrop = stop === destination;
                      const isEndpoints = idx === 0 || idx === ride.stops.length - 1;

                      let dotColor = 'var(--text-light)';
                      if (isPassengerPickup) dotColor = 'var(--primary)';
                      else if (isPassengerDrop) dotColor = 'var(--secondary)';
                      else if (isEndpoints) dotColor = 'var(--text-primary)';

                      return (
                        <div key={stop} style={{ position: 'relative' }}>
                          <div style={{
                            position: 'absolute',
                            left: '-26px',
                            top: '4px',
                            width: (isPassengerPickup || isPassengerDrop) ? '12px' : '8px',
                            height: (isPassengerPickup || isPassengerDrop) ? '12px' : '8px',
                            borderRadius: '50%',
                            backgroundColor: dotColor,
                            border: '2px solid var(--bg-secondary)',
                            transform: (isPassengerPickup || isPassengerDrop) ? 'translate(-2px, -2px)' : 'none',
                            zIndex: 10
                          }} />
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: (isPassengerPickup || isPassengerDrop) ? '700' : (isEndpoints ? '600' : 'normal'),
                              color: (isPassengerPickup || isPassengerDrop) ? 'var(--primary)' : 'var(--text-primary)'
                            }}>
                              {stop}
                            </span>
                            {isPassengerPickup && (
                              <span style={{ fontSize: '10px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                Your Pickup
                              </span>
                            )}
                            {isPassengerDrop && (
                              <span style={{ fontSize: '10px', backgroundColor: 'rgba(14,165,233,0.1)', color: 'var(--secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                Your Drop-off
                              </span>
                            )}
                            {idx === 0 && !isPassengerPickup && (
                              <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>(Start)</span>
                            )}
                            {idx === ride.stops.length - 1 && !isPassengerDrop && (
                              <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>(End)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Date / Time */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: 'var(--bg-primary)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>Departure: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {new Date(ride.departureTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(ride.departureTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </div>
                </div>

                {/* Footer specs */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Car size={14} />
                    <span>{ride.vehicleType}</span>
                  </div>

                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: ride.availableSeats > 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: ride.availableSeats > 1 ? 'var(--success)' : 'var(--warning)',
                      fontWeight: '600'
                    }}>
                      {ride.availableSeats} of {ride.totalSeats} seats left
                    </span>
                  </div>
                </div>

                {/* Booking Button */}
                {activeUser && activeUser.id === ride.driver?._id ? (
                  <button 
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-light)',
                      fontWeight: '600',
                      cursor: 'not-allowed'
                    }}
                  >
                    Your Offered Ride
                  </button>
                ) : (
                  <button
                    onClick={() => onBookRide(ride, pickup, destination)}
                    className="gradient-btn"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Book Seat
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

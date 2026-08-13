import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Compass, Check, X, Search, Map as MapIcon } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const CITIES_DATABASE = [
  { name: 'Kasaragod', state: 'Kerala', lat: 12.4984, lng: 74.9896 },
  { name: 'Mangalore', state: 'Karnataka', lat: 12.9141, lng: 74.8560 },
  { name: 'Puttur', state: 'Karnataka', lat: 12.7623, lng: 75.2003 },
  { name: 'Vitla', state: 'Karnataka', lat: 12.7667, lng: 75.0833 },
  { name: 'Badiadka', state: 'Kerala', lat: 12.5884, lng: 75.0698 },
  { name: 'Perla', state: 'Kerala', lat: 12.6426, lng: 75.1049 },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Mysore', state: 'Karnataka', lat: 12.2958, lng: 76.6394 },
  { name: 'Udupi', state: 'Karnataka', lat: 13.3409, lng: 74.7421 },
  { name: 'Kannur', state: 'Kerala', lat: 11.8745, lng: 75.3704 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
  { name: 'Calicut', state: 'Kerala', lat: 11.2588, lng: 75.7804 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.1240 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090 }
];

export function findCityCoords(cityName) {
  if (!cityName) return null;
  const lower = cityName.trim().toLowerCase();
  const match = CITIES_DATABASE.find(c => c.name.toLowerCase() === lower || lower.includes(c.name.toLowerCase()));
  if (match) return { lat: match.lat, lng: match.lng };
  return null;
}

export default function CityMapSelector({
  pickup,
  setPickup,
  destination,
  setDestination,
  placeholderPickup = "Leaving from (e.g. Kasaragod, Mangalore)",
  placeholderDestination = "Going to (e.g. Puttur, Bangalore)",
  showMapByDefault = true
}) {
  const [pickupQuery, setPickupQuery] = useState(pickup || '');
  const [destinationQuery, setDestinationQuery] = useState(destination || '');
  
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);

  const [showMap, setShowMap] = useState(showMapByDefault);
  const mapRef = useRef(null);
  const leafletInstance = useRef(null);
  const markersRef = useRef({ pickup: null, drop: null, route: null });

  // Sync internal query states with props if external props change
  useEffect(() => {
    setPickupQuery(pickup || '');
  }, [pickup]);

  useEffect(() => {
    setDestinationQuery(destination || '');
  }, [destination]);

  // Pickup input change handler
  const handlePickupChange = (e) => {
    const val = e.target.value;
    setPickupQuery(val);
    setPickup(val);

    if (val.trim().length > 0) {
      const matches = CITIES_DATABASE.filter(c => 
        c.name.toLowerCase().includes(val.toLowerCase()) || 
        c.state.toLowerCase().includes(val.toLowerCase())
      );
      setPickupSuggestions(matches);
      setShowPickupDropdown(true);
    } else {
      setPickupSuggestions([]);
      setShowPickupDropdown(false);
    }
  };

  // Destination input change handler
  const handleDestinationChange = (e) => {
    const val = e.target.value;
    setDestinationQuery(val);
    setDestination(val);

    if (val.trim().length > 0) {
      const matches = CITIES_DATABASE.filter(c => 
        c.name.toLowerCase().includes(val.toLowerCase()) || 
        c.state.toLowerCase().includes(val.toLowerCase())
      );
      setDestinationSuggestions(matches);
      setShowDestinationDropdown(true);
    } else {
      setDestinationSuggestions([]);
      setShowDestinationDropdown(false);
    }
  };

  // Select pickup city suggestion
  const selectPickup = (city) => {
    setPickupQuery(city.name);
    setPickup(city.name);
    setShowPickupDropdown(false);
  };

  // Select destination city suggestion
  const selectDestination = (city) => {
    setDestinationQuery(city.name);
    setDestination(city.name);
    setShowDestinationDropdown(false);
  };

  // Initialize and Update Leaflet Map
  useEffect(() => {
    if (!showMap || !mapRef.current) return;

    if (!leafletInstance.current) {
      // Create map instance
      const map = L.map(mapRef.current, {
        center: [12.6, 75.0],
        zoom: 9,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      leafletInstance.current = map;
    }

    const map = leafletInstance.current;
    const pCoords = findCityCoords(pickupQuery);
    const dCoords = findCityCoords(destinationQuery);

    // Clear previous markers & route
    if (markersRef.current.pickup) map.removeLayer(markersRef.current.pickup);
    if (markersRef.current.drop) map.removeLayer(markersRef.current.drop);
    if (markersRef.current.route) map.removeLayer(markersRef.current.route);

    const bounds = [];

    // Add Pickup Marker (Green A)
    if (pCoords) {
      const pIcon = L.divIcon({
        className: 'custom-pin-a',
        html: `<div style="background:#10b981;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:14px;box-shadow:0 0 12px rgba(16,185,129,0.7);border:2px solid #ffffff;">A</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      markersRef.current.pickup = L.marker([pCoords.lat, pCoords.lng], { icon: pIcon }).addTo(map)
        .bindPopup(`<b>Pickup: ${pickupQuery}</b>`);
      bounds.push([pCoords.lat, pCoords.lng]);
    }

    // Add Drop Marker (Red B)
    if (dCoords) {
      const dIcon = L.divIcon({
        className: 'custom-pin-b',
        html: `<div style="background:#ef4444;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:800;font-size:14px;box-shadow:0 0 12px rgba(239,68,68,0.7);border:2px solid #ffffff;">B</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      markersRef.current.drop = L.marker([dCoords.lat, dCoords.lng], { icon: dIcon }).addTo(map)
        .bindPopup(`<b>Destination: ${destinationQuery}</b>`);
      bounds.push([dCoords.lat, dCoords.lng]);
    }

    // Draw route polyline if both coordinates exist
    if (pCoords && dCoords) {
      const polyline = L.polyline([
        [pCoords.lat, pCoords.lng],
        [dCoords.lat, dCoords.lng]
      ], { color: '#2563eb', weight: 4, opacity: 0.8, dashArray: '8, 8' }).addTo(map);
      markersRef.current.route = polyline;

      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (pCoords) {
      map.setView([pCoords.lat, pCoords.lng], 11);
    } else if (dCoords) {
      map.setView([dCoords.lat, dCoords.lng], 11);
    }

  }, [pickupQuery, destinationQuery, showMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      
      {/* Pickup & Destination Inputs Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        position: 'relative'
      }}>
        
        {/* Pickup Input with Autocomplete */}
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
            Pickup Origin City
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MapPin size={18} style={{ position: 'absolute', left: '12px', color: '#10b981', zIndex: 10 }} />
            <input
              type="text"
              placeholder={placeholderPickup}
              value={pickupQuery}
              onChange={handlePickupChange}
              onFocus={() => {
                if (pickupQuery.trim()) setShowPickupDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowPickupDropdown(false), 200)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
              required
            />
            {pickupQuery && (
              <button
                type="button"
                onClick={() => { setPickupQuery(''); setPickup(''); }}
                style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {showPickupDropdown && pickupSuggestions.length > 0 && (
            <div className="glass-card animate-fade-in" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              marginTop: '4px',
              maxHeight: '220px',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-md)',
              padding: '6px'
            }}>
              {pickupSuggestions.map((c) => (
                <div
                  key={c.name}
                  onMouseDown={() => selectPickup(c)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    transition: 'var(--transition)'
                  }}
                  className="dropdown-item-hover"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} style={{ color: '#10b981' }} />
                    <strong>{c.name}</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                    {c.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Destination Input with Autocomplete */}
        <div style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
            Drop Destination City
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <MapPin size={18} style={{ position: 'absolute', left: '12px', color: '#ef4444', zIndex: 10 }} />
            <input
              type="text"
              placeholder={placeholderDestination}
              value={destinationQuery}
              onChange={handleDestinationChange}
              onFocus={() => {
                if (destinationQuery.trim()) setShowDestinationDropdown(true);
              }}
              onBlur={() => setTimeout(() => setShowDestinationDropdown(false), 200)}
              className="form-input"
              style={{ paddingLeft: '40px' }}
              required
            />
            {destinationQuery && (
              <button
                type="button"
                onClick={() => { setDestinationQuery(''); setDestination(''); }}
                style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {showDestinationDropdown && destinationSuggestions.length > 0 && (
            <div className="glass-card animate-fade-in" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              marginTop: '4px',
              maxHeight: '220px',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-md)',
              padding: '6px'
            }}>
              {destinationSuggestions.map((c) => (
                <div
                  key={c.name}
                  onMouseDown={() => selectDestination(c)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    transition: 'var(--transition)'
                  }}
                  className="dropdown-item-hover"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} style={{ color: '#ef4444' }} />
                    <strong>{c.name}</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-light)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                    {c.state}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Popular City Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
        <span style={{ color: 'var(--text-light)', fontWeight: '600' }}>Quick Select:</span>
        {['Kasaragod', 'Mangalore', 'Puttur', 'Vitla', 'Bangalore', 'Goa', 'Mumbai'].map(city => (
          <button
            key={city}
            type="button"
            onClick={() => {
              if (!pickupQuery) {
                setPickupQuery(city);
                setPickup(city);
              } else {
                setDestinationQuery(city);
                setDestination(city);
              }
            }}
            style={{
              padding: '4px 10px',
              borderRadius: '14px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600'
            }}
          >
            {city}
          </button>
        ))}
      </div>

      {/* Map Toggle & Interactive Route Map */}
      <div style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            style={{
              background: 'none', border: 'none', color: 'var(--primary)',
              cursor: 'pointer', fontSize: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '6px', padding: 0
            }}
          >
            <MapIcon size={14} />
            <span>{showMap ? 'Hide Route Map' : 'Show Route Map 🗺️'}</span>
          </button>

          {pickupQuery && destinationQuery && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              📍 {pickupQuery} ➔ {destinationQuery}
            </span>
          )}
        </div>

        {showMap && (
          <div style={{
            position: 'relative',
            height: '240px',
            width: '100%',
            borderRadius: '14px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          </div>
        )}
      </div>

    </div>
  );
}

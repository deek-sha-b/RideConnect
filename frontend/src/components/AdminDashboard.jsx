import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserCheck, Trash2, ShieldAlert, BarChart3, Users, DollarSign, Award, Check, X, FileText, CheckSquare } from 'lucide-react';
import { API_URL } from '../config';

export default function AdminDashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('verification');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [viewingLicenseUrl, setViewingLicenseUrl] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Drivers verification list
      const driversRes = await fetch(`${API_URL}/api/admin/drivers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (driversRes.ok) {
        const driversData = await driversRes.json();
        // Show pending drivers or verified
        setPendingDrivers(driversData);
      }

      // 3. Fetch complaints
      const complaintsRes = await fetch(`${API_URL}/api/admin/complaints`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (complaintsRes.ok) {
        const complaintsData = await complaintsRes.json();
        setComplaints(complaintsData);
      }

      // 4. Fetch SOS alerts
      const sosRes = await fetch(`${API_URL}/api/admin/sos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sosRes.ok) {
        const sosData = await sosRes.json();
        setSosAlerts(sosData);
      }
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleVerifyDriver = async (driverId, approve) => {
    setActionMessage('');
    try {
      const res = await fetch(`${API_URL}/api/admin/drivers/${driverId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: approve ? 'approved' : 'rejected' })
      });

      if (res.ok) {
        const data = await res.json();
        setActionMessage(data.message);
        fetchAdminData(); // Refresh list & counters
      } else {
        console.error('Error verifying driver');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleResolveComplaint = (id) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'Resolved' } : c));
  };

  const handleResolveSOS = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/sos/${id}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage(data.message);
        fetchAdminData();
      } else {
        console.error('Error resolving SOS alert');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
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
        Admin <span className="gradient-text">Approval Dashboard</span>
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
        Oversee system safety, approve licenses and vehicles, track complaints, and monitor key platform statistics.
      </p>

      {/* Action success alert */}
      {actionMessage && (
        <div className="glass-card animate-fade-in" style={{
          padding: '16px',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid var(--success)',
          color: 'var(--success)',
          borderRadius: '10px',
          marginBottom: '24px',
          fontWeight: '600'
        }}>
          {actionMessage}
        </div>
      )}

      {/* Analytics Counter Grid */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'var(--primary)' }}>
              <Users size={24} style={{ margin: 'auto' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: '600' }}>TOTAL USERS</p>
              <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{stats.metrics?.totalUsers || 0}</h3>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'var(--secondary)' }}>
              <BarChart3 size={24} style={{ margin: 'auto' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: '600' }}>TOTAL RIDES</p>
              <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{stats.metrics?.totalRides || 0}</h3>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'var(--success)' }}>
              <ShieldCheck size={24} style={{ margin: 'auto' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: '600' }}>TOTAL BOOKINGS</p>
              <h3 style={{ fontSize: '24px', fontWeight: '800' }}>{stats.metrics?.totalBookings || 0}</h3>
            </div>
          </div>

        </div>
      )}

      {/* Main admin panels */}
      <div className="dashboard-grid" style={{ paddingTop: 0 }}>
        {/* Admin Navigation Menu */}
        <div className="glass-card" style={{ padding: '20px', background: 'var(--bg-secondary)', height: 'fit-content', border: '1px solid var(--border-color)' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--text-light)', marginBottom: '16px', fontWeight: '600', textTransform: 'uppercase' }}>Navigation Menu</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => setActiveSubTab('verification')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                border: 'none',
                background: activeSubTab === 'verification' ? 'var(--primary-light)' : 'none',
                color: activeSubTab === 'verification' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: '600',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)'
              }}
            >
              <UserCheck size={18} />
              Driver Approval ({pendingDrivers.filter(d => d.driverDetails?.verificationStatus === 'pending').length})
            </button>

            <button
              onClick={() => setActiveSubTab('analytics')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                border: 'none',
                background: activeSubTab === 'analytics' ? 'var(--primary-light)' : 'none',
                color: activeSubTab === 'analytics' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: '600',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)'
              }}
            >
              <BarChart3 size={18} />
              Performance Stats
            </button>

            <button
              onClick={() => setActiveSubTab('complaints')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                border: 'none',
                background: activeSubTab === 'complaints' ? 'var(--primary-light)' : 'none',
                color: activeSubTab === 'complaints' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: '600',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)'
              }}
            >
              <FileText size={18} />
              Incident Reports ({complaints.filter(c => c.status === 'Pending').length})
            </button>

            <button
              onClick={() => setActiveSubTab('sos')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                border: 'none',
                background: activeSubTab === 'sos' ? 'var(--primary-light)' : 'none',
                color: activeSubTab === 'sos' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: '600',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'var(--transition)',
                position: 'relative'
              }}
            >
              <ShieldAlert size={18} style={{ color: 'var(--danger)' }} className={sosAlerts.some(s => s.status === 'Active') ? 'animate-pulse' : ''} />
              <span>SOS Alerts</span>
              {sosAlerts.filter(s => s.status === 'Active').length > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--danger)',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  animation: 'pulse 1.5s infinite'
                }}>
                  {sosAlerts.filter(s => s.status === 'Active').length} ACTIVE
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Admin Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Driver Approval Tab */}
          {activeSubTab === 'verification' && (
            <div className="glass-card animate-fade-in" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>Pending Document Review</h3>
              
              {pendingDrivers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
                  No pending registrations or uploaded documents to verify.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {pendingDrivers.map((driver) => (
                    <div 
                      key={driver._id}
                      style={{
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px'
                      }}
                    >
                      {/* User Top Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
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
                            {(driver.name || 'D').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 style={{ fontSize: '15px' }}>{driver.name}</h4>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{driver.email} | {driver.phone}</p>
                          </div>
                        </div>
                        
                        <div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: driver.driverDetails?.verificationStatus === 'pending' ? 'rgba(245,158,11,0.1)' : (driver.driverDetails?.verificationStatus === 'approved' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'),
                            color: driver.driverDetails?.verificationStatus === 'pending' ? 'var(--warning)' : (driver.driverDetails?.verificationStatus === 'approved' ? 'var(--success)' : 'var(--danger)')
                          }}>
                            {driver.driverDetails?.verificationStatus?.toUpperCase() || 'PENDING'}
                          </span>
                        </div>
                      </div>

                      {/* Documents detail row */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '12px',
                        fontSize: '13px',
                        background: 'var(--bg-secondary)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '11px', color: 'var(--text-light)' }}>Driving License Number</strong>
                          <span style={{ fontSize: '13px' }}>{driver.driverDetails?.licenseNo}</span>
                          {driver.driverDetails?.licenseUrl && (
                            <div style={{ display: 'inline-flex', gap: '12px', marginLeft: '12px' }}>
                              <button 
                                onClick={() => setViewingLicenseUrl(`${API_URL}${driver.driverDetails.licenseUrl}`)}
                                style={{
                                  fontSize: '12px', color: 'var(--primary)',
                                  background: 'none', border: 'none', textDecoration: 'underline',
                                  fontWeight: '600', cursor: 'pointer', padding: 0
                                }}
                              >
                                View Document
                              </button>
                              <span style={{ color: 'var(--text-light)' }}>|</span>
                              <a 
                                href={`${API_URL}${driver.driverDetails.licenseUrl}`} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'underline', fontWeight: '600' }}
                              >
                                Open in New Tab
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Image verification layout */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <FileText size={14} />
                        <span>Uploaded scan: <b>driving_license.pdf</b></span>
                      </div>

                      {/* Approve / Reject buttons */}
                      {driver.driverDetails?.verificationStatus === 'pending' && (
                        <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-end' }}>
                          <button
                            onClick={() => handleVerifyDriver(driver._id, false)}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: 'var(--danger)',
                              border: '1px solid var(--danger)',
                              cursor: 'pointer',
                              fontWeight: '600',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <X size={14} /> Reject
                          </button>
                          
                          <button
                            onClick={() => handleVerifyDriver(driver._id, true)}
                            className="gradient-btn"
                            style={{
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontSize: '13px',
                              gap: '6px'
                            }}
                          >
                            <Check size={14} /> Approve
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Performance Stats Tab */}
          {activeSubTab === 'analytics' && stats && (
            <div className="glass-card animate-fade-in" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '6px' }}>Weekly Platform Analytics</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Visual overview of completed rides and booking volume.</p>

              {/* SVG Chart Rendering */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <svg viewBox="0 0 500 240" style={{ width: '100%', maxWidth: '500px', height: 'auto', background: 'var(--bg-primary)', borderRadius: '12px', padding: '16px' }}>
                  {/* Grid Lines */}
                  <line x1="40" y1="40" x2="480" y2="40" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="40" y1="100" x2="480" y2="100" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="40" y1="160" x2="480" y2="160" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                  
                  {/* Axes */}
                  <line x1="40" y1="40" x2="40" y2="190" stroke="var(--text-light)" strokeWidth="1" />
                  <line x1="40" y1="190" x2="480" y2="190" stroke="var(--text-light)" strokeWidth="1" />
                  
                  {/* Y-Axis labels */}
                  <text x="15" y="45" fill="var(--text-light)" fontSize="10" fontWeight="bold">80</text>
                  <text x="15" y="105" fill="var(--text-light)" fontSize="10" fontWeight="bold">40</text>
                  <text x="15" y="165" fill="var(--text-light)" fontSize="10" fontWeight="bold">10</text>
                  <text x="15" y="195" fill="var(--text-light)" fontSize="10" fontWeight="bold">0</text>

                  {/* Draw Chart Bars */}
                  {stats.weeklyAnalytics?.map((item, index) => {
                    const xCoord = 60 + index * 60;
                    // Max height for 80 units is 150px
                    const barHeight = (item.bookings / 80) * 150;
                    const yCoord = 190 - barHeight;

                    return (
                      <g key={item.day}>
                        {/* Bar */}
                        <rect 
                          x={xCoord - 12} 
                          y={yCoord} 
                          width="24" 
                          height={barHeight} 
                          rx="4" 
                          fill="url(#blue-gradient)" 
                        />
                        {/* Text values */}
                        <text x={xCoord} y={yCoord - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="bold">
                          {item.bookings}
                        </text>
                        {/* Day names */}
                        <text x={xCoord} y="210" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="bold">
                          {item.day}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Gradients definitions */}
                  <defs>
                    <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#2563eb', borderRadius: '3px' }} />
                  <span>Passenger Booking Counts</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Complaints & SOS Tab */}
          {activeSubTab === 'complaints' && (
            <div className="glass-card animate-fade-in" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>User Incident Reports</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {complaints.map((ticket) => (
                  <div 
                    key={ticket.id}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          backgroundColor: ticket.status === 'Pending' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                          color: ticket.status === 'Pending' ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {ticket.status}
                        </span>
                        <strong style={{ fontSize: '14px' }}>{ticket.type}</strong>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>Reported by {ticket.user}</span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                      {ticket.description}
                    </p>

                    {ticket.status === 'Pending' && (
                      <button
                        onClick={() => handleResolveComplaint(ticket.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--success)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        <CheckSquare size={14} /> Resolve Ticket
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. SOS Alerts Tab */}
          {activeSubTab === 'sos' && (
            <div className="glass-card animate-fade-in" style={{ padding: '24px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={22} /> Active & Past SOS Alerts
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Monitor active emergencies, review user details, open Google Maps locations, and resolve situations.
              </p>

              {sosAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>
                  No SOS alerts recorded on the platform.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sosAlerts.map((alert) => (
                    <div 
                      key={alert._id}
                      style={{
                        padding: '18px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: alert.status === 'Active' ? 'rgba(239, 68, 68, 0.03)' : 'var(--bg-primary)',
                        borderLeft: alert.status === 'Active' ? '4px solid var(--danger)' : '4px solid var(--text-light)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            backgroundColor: alert.status === 'Active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: alert.status === 'Active' ? 'var(--danger)' : 'var(--text-secondary)',
                            marginRight: '8px'
                          }}>
                            {alert.status.toUpperCase()}
                          </span>
                          <strong style={{ fontSize: '15px' }}>{alert.userName} ({alert.userRole.toUpperCase()})</strong>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>
                          {new Date(alert.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        <div>📞 <b>Phone Number:</b> {alert.phone}</div>
                        <div>🚗 <b>Ride ID:</b> {alert.ride}</div>
                        <div>📍 <b>GPS Coordinates:</b> Lat {alert.latitude}, Lng {alert.longitude}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <a 
                          href={alert.googleMapsLink} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textDecoration: 'none'
                          }}
                        >
                          🌐 View on Google Maps
                        </a>

                        {alert.status === 'Active' && (
                          <button
                            onClick={() => handleResolveSOS(alert._id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              border: '1px solid var(--success)',
                              background: 'rgba(16, 185, 129, 0.08)',
                              color: 'var(--success)',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            <CheckSquare size={14} /> Resolve Emergency
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* License Document Viewer Modal */}
      {viewingLicenseUrl && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(11, 15, 25, 0.6)', backdropFilter: 'blur(4px)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card animate-fade-in" style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '650px',
            position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', margin: 0 }}>Review Driving License Copy</h3>
              <button 
                onClick={() => setViewingLicenseUrl(null)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer',
                  fontSize: '20px', fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {viewingLicenseUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewingLicenseUrl}
                  title="Driving License Copy"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <img
                  src={viewingLicenseUrl}
                  alt="Driving License Copy"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setViewingLicenseUrl(null)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import {
  Sun, Moon, Menu, X, User, LogOut, Shield, Car, Briefcase,
  PlusCircle, Users, Navigation, MessageCircle, DollarSign,
  Settings, Search, CreditCard, MapPin
} from 'lucide-react';

export default function Navbar({
  user,
  onLogout,
  onOpenAuth,
  theme,
  setTheme,
  activeRoleTab,
  onRoleTabChange,
  activePublicTab,
  onPublicTabChange,
  badgeCounts = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Build role-specific navigation items
  const driverNavItems = [
    { id: 'overview', label: 'Overview', icon: Briefcase },
    { id: 'trip-tracking', label: 'Live Tracking', icon: Navigation, isLive: badgeCounts.hasActiveTrip },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const passengerNavItems = [
    { id: 'find', label: 'Find Ride', icon: Search },
    { id: 'my-rides', label: 'My Rides', icon: Car, count: badgeCounts.passengerBookingsCount },
    { id: 'chat', label: 'Messages', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const adminNavItems = [
    { id: 'admin', label: 'Admin Dashboard', icon: Shield }
  ];

  const publicNavItems = [
    { id: 'find', label: 'Home', icon: Search },
    { id: 'about', label: 'About', icon: User },
    { id: 'contact', label: 'Contact', icon: MessageCircle },
  ];

  // Determine current active nav list based on login status and role
  const isDriver = user && user.role === 'driver';
  const isPassenger = user && user.role === 'passenger';
  const isAdmin = user && user.role === 'admin';

  const currentNavItems = !user
    ? publicNavItems
    : isDriver
      ? driverNavItems
      : isPassenger
        ? passengerNavItems
        : adminNavItems;

  const currentActiveTab = !user
    ? activePublicTab
    : activeRoleTab;

  const handleTabClick = (tabId) => {
    if (!user) {
      if (onPublicTabChange) onPublicTabChange(tabId);
    } else {
      if (onRoleTabChange) onRoleTabChange(tabId);
    }
    setIsOpen(false);
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      margin: '0',
      padding: '10px 0',
      background: 'var(--bg-navbar)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      transition: 'var(--transition)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        {/* Brand Logo & Role Badge */}
        <div
          onClick={() => {
            if (!user) handleTabClick('find');
            else if (isDriver) handleTabClick('overview');
            else if (isPassenger) handleTabClick('my-rides');
            else if (isAdmin) handleTabClick('admin');
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <Car size={28} className="gradient-text" style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{
            fontWeight: '800',
            fontSize: '24px',
            fontFamily: 'var(--font-heading)'
          }}>
            RideConnect
          </span>

          {user && (
            <span style={{
              background: 'var(--gradient-blue)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '800',
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase'
            }}>
              {user.role}
            </span>
          )}
        </div>

        {/* Navigation Bar Links (Hidden on small screens, desktop layout) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }} className="desktop-nav">
          <ul style={{ display: 'flex', listStyle: 'none', gap: '10px', margin: 0, padding: 0 }}>
            {currentNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentActiveTab === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleTabClick(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isActive ? 'var(--primary)' : 'transparent',
                      background: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? 'var(--bg-secondary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? '700' : '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    {Icon && <Icon size={15} />}
                    <span>{item.label}</span>

                    {/* Count Badge */}
                    {item.count != null && item.count > 0 && (
                      <span style={{
                        background: isActive ? 'var(--bg-secondary)' : 'var(--border-color)',
                        color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 6px',
                        borderRadius: '10px'
                      }}>
                        {item.count}
                      </span>
                    )}

                    {/* Live Dot Indicator */}
                    {item.isLive && (
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#16a34a',
                        display: 'inline-block'
                      }} className="animate-pulse-soft" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* User Auth / Profile Menu */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{user.name ? user.name.split(' ')[0] : 'User'}</span>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  width: '220px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'var(--shadow-md)',
                  borderRadius: '12px',
                  zIndex: 1100
                }}>
                  <div style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', margin: 0 }}>{user.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      if (isDriver) handleTabClick('settings');
                      else if (isPassenger) handleTabClick('profile');
                      else if (isAdmin) handleTabClick('admin');
                      setShowProfileMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: '600'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = 'var(--primary-light)';
                      e.target.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = 'var(--text-secondary)';
                    }}
                  >
                    <User size={15} />
                    Account Profile
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      setShowProfileMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'none',
                      color: 'var(--danger)',
                      fontSize: '13px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: '700'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.08)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '30px' }}>
              <button
                onClick={() => onOpenAuth('login')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => e.target.style.borderColor = 'var(--primary)'}
                onMouseLeave={(e) => e.target.style.borderColor = 'var(--border-color)'}
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                style={{
                  background: 'var(--primary)',
                  color: 'var(--bg-secondary)',
                  border: '1px solid var(--primary)',
                  padding: '7px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                Register
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'none'
            }}
            className="mobile-nav-toggle"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {isOpen && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentActiveTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'var(--bg-secondary)' : 'var(--text-primary)',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                {Icon && <Icon size={18} />}
                <span>{item.label}</span>
              </button>
            );
          })}

          <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

          {user ? (
            <button
              onClick={() => {
                onLogout();
                setIsOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(220, 38, 38, 0.1)',
                color: 'var(--danger)',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  onOpenAuth('login');
                  setIsOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: '600'
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  onOpenAuth('register');
                  setIsOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary)',
                  color: 'var(--bg-secondary)',
                  fontWeight: '700'
                }}
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}


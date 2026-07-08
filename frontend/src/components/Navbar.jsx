import React, { useState } from 'react';
import { Sun, Moon, Menu, X, User, LogOut, Shield, Car, Briefcase } from 'lucide-react';

export default function Navbar({ 
  user, 
  onLogout, 
  onOpenAuth, 
  theme, 
  setTheme, 
  activeTab, 
  setActiveTab 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const navItems = [{ label: 'Home', tab: 'home' }];
  if (user) {
    if (user.role === 'passenger') {
      navItems.push({ label: 'Dashboard', tab: 'passenger-dashboard' });
    } else if (user.role === 'driver') {
      navItems.push({ label: 'Dashboard', tab: 'driver-dashboard' });
    } else if (user.role === 'admin') {
      navItems.push({ label: 'Admin Dashboard', tab: 'admin' });
    }
  }
  navItems.push({ label: 'About', tab: 'about' });
  navItems.push({ label: 'Contact', tab: 'contact' });

  return (
    <nav className="glass-card" style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      borderRadius: '0 0 16px 16px',
      margin: '0',
      padding: '12px 0',
      background: 'var(--bg-navbar)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-color)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative'
      }}>
        {/* Logo */}
        <div 
          onClick={() => setActiveTab('home')} 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '24px',
            fontFamily: 'var(--font-heading)'
          }}
        >
          <Car size={28} className="gradient-text" style={{ color: 'var(--primary)' }} />
          <span className="gradient-text">RideConnect</span>
        </div>

        {/* Desktop Navigation Links */}
        <div style={{ display: 'none', display: 'flex', alignItems: 'center', gap: '30px' }} className="desktop-nav">
          <ul style={{ display: 'flex', listStyle: 'none', gap: '24px', margin: 0, padding: 0 }}>
            {navItems.map((item) => (
              <li key={item.tab}>
                <a
                  href={`#${item.tab}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(item.tab);
                  }}
                  style={{
                    textDecoration: 'none',
                    color: activeTab === item.tab ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === item.tab ? '600' : '500',
                    fontSize: '15px',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.target.style.color = 'var(--primary)'}
                  onMouseLeave={(e) => e.target.style.color = activeTab === item.tab ? 'var(--primary)' : 'var(--text-secondary)'}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-color)' }} />

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '50%',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* User Auth Sections */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="gradient-btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  gap: '8px',
                  borderRadius: '10px'
                }}
              >
                <User size={16} />
                <span>{user.name.split(' ')[0]}</span>
              </button>

              {showProfileMenu && (
                <div className="glass-card" style={{
                  position: 'absolute',
                  right: 0,
                  top: '45px',
                  width: '200px',
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
                  <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                    <p style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{user.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
                  </div>
                  
                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        setActiveTab('admin');
                        setShowProfileMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <Shield size={14} />
                      Admin Dashboard
                    </button>
                  )}

                  {user.role === 'driver' && (
                    <button
                      onClick={() => {
                        setActiveTab('driver-dashboard');
                        setShowProfileMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <Briefcase size={14} />
                      Driver Dashboard
                    </button>
                  )}

                  {user.role === 'passenger' && (
                    <button
                      onClick={() => {
                        setActiveTab('passenger-dashboard');
                        setShowProfileMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px',
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-light)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <User size={14} />
                      Passenger Dashboard
                    </button>
                  )}

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
                      padding: '8px',
                      border: 'none',
                      background: 'none',
                      color: 'var(--danger)',
                      fontSize: '13px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: '600'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.08)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => onOpenAuth('login')}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--primary)',
                  color: 'var(--primary)',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-light)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Login
              </button>
              <button 
                onClick={() => onOpenAuth('register')}
                className="gradient-btn"
                style={{
                  padding: '8px 18px',
                  fontSize: '14px',
                  borderRadius: '10px'
                }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu burger */}
        <div style={{ display: 'none' }} className="mobile-nav-toggle">
          {/* We will handle CSS rules in styling to show/hide burger menu and handle simple menu */}
        </div>
      </div>
    </nav>
  );
}

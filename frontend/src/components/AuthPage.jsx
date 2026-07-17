import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { API_URL } from '../config';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebaseConfig';

export default function AuthPage({ initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'register'
  const [role, setRole] = useState('passenger'); // 'passenger' or 'driver'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseFile, setLicenseFile] = useState(null);
  
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync mode with prop changes (e.g. from navbar clicks)
  useEffect(() => {
    setMode(initialMode);
    setError('');
    setFieldErrors({});
    setSuccessMessage('');
  }, [initialMode]);

  const validateForm = () => {
    const errors = {};
    const tName = name.trim();
    const tEmail = email.trim();
    const tPhone = phone.trim();
    const tPassword = password.trim();

    if (mode === 'register') {
      // Name validation: required, 2-50 chars, letters and spaces only
      if (!tName) {
        errors.name = 'Full name is required.';
      } else if (tName.length < 2 || tName.length > 50) {
        errors.name = 'Name must be between 2 and 50 characters.';
      } else if (!/^[A-Za-z\s]+$/.test(tName)) {
        errors.name = 'Name must contain only letters and spaces.';
      }

      // Phone validation: required, exactly 10 digits, numbers only
      if (!tPhone) {
        errors.phone = 'Phone number is required.';
      } else if (!/^\d{10}$/.test(tPhone)) {
        errors.phone = 'Phone number must be exactly 10 digits (numbers only).';
      }

      // Driver-specific details validation
      if (role === 'driver') {
        if (!licenseNo.trim()) {
          errors.licenseNo = 'Driving license number is required for drivers.';
        }
        if (!licenseFile) {
          errors.licenseFile = 'Driving license scan/copy upload is required for drivers.';
        }
      }
    }

    // Email validation: required, valid email format
    if (!tEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Password validation: required. Registration additionally enforces complexity rules.
    if (!tPassword) {
      errors.password = 'Password is required.';
    } else if (mode === 'register') {
      if (tPassword.length < 8) {
        errors.password = 'Password must be at least 8 characters long.';
      } else if (!/[A-Z]/.test(tPassword)) {
        errors.password = 'Password must contain at least one uppercase letter.';
      } else if (!/[a-z]/.test(tPassword)) {
        errors.password = 'Password must contain at least one lowercase letter.';
      } else if (!/\d/.test(tPassword)) {
        errors.password = 'Password must contain at least one number.';
      } else if (!/[@$!%*?&_#^()+=`{}|:;"'<>,.?/\-]/.test(tPassword)) {
        errors.password = 'Password must contain at least one special character (e.g. @$!%*?&).';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const url = mode === 'login' 
      ? `${API_URL}/api/auth/login`
      : `${API_URL}/api/auth/register`;

    let body;
    let headers = {};

    const tName = name.trim();
    const tEmail = email.trim();
    const tPassword = password.trim();
    const tPhone = phone.trim();
    const tLicenseNo = licenseNo.trim();

    if (mode === 'login') {
      body = JSON.stringify({ email: tEmail, password: tPassword });
      headers['Content-Type'] = 'application/json';
    } else {
      if (role === 'driver') {
        const formData = new FormData();
        formData.append('name', tName);
        formData.append('email', tEmail);
        formData.append('password', tPassword);
        formData.append('phone', tPhone);
        formData.append('role', role);
        formData.append('licenseNo', tLicenseNo);
        if (licenseFile) {
          formData.append('license', licenseFile);
        }
        body = formData;
      } else {
        body = JSON.stringify({ 
          name: tName, 
          email: tEmail, 
          password: tPassword, 
          phone: tPhone, 
          role 
        });
        headers['Content-Type'] = 'application/json';
      }
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body
      });

      const data = await res.json();
      if (!res.ok) {
        // If the email is already in use, display the error directly on the email input
        if (res.status === 400 && data.message && data.message.toLowerCase().includes('email')) {
          setFieldErrors({ email: data.message });
          throw new Error('Please correct the errors below.');
        }
        throw new Error(data.message || 'Authentication failed. Please check inputs.');
      }

      if (mode === 'login') {
        onAuthSuccess(data.user, data.token);
      } else {
        // Registration success flow: Redirect to login and clear inputs
        setSuccessMessage('Registration successful! Please sign in using your credentials.');
        setMode('login');
        
        // Reset registration specific fields
        setName('');
        setPhone('');
        setLicenseNo('');
        setLicenseFile(null);
        // Retain the email for convenience
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: idToken })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Google Authentication failed.');
      }
      
      onAuthSuccess(data.user, data.token);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to authenticate with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '40px 20px',
      position: 'relative',
      zIndex: 1
    }}>
      <div className="glass-card animate-fade-in" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        padding: '36px',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: 'var(--shadow-lg)'
      }}>
        
        {/* Auth Toggle Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '16px', 
          borderBottom: '1px solid var(--border-color)', 
          marginBottom: '24px' 
        }}>
          <button
            type="button"
            onClick={() => { 
              setMode('login'); 
              setError(''); 
              setFieldErrors({});
              setSuccessMessage('');
            }}
            style={{
              paddingBottom: '12px', 
              background: 'none', 
              border: 'none',
              color: mode === 'login' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: '700', 
              fontSize: '18px', 
              cursor: 'pointer',
              borderBottom: mode === 'login' ? '3px solid var(--primary)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { 
              setMode('register'); 
              setError(''); 
              setFieldErrors({});
              setSuccessMessage('');
            }}
            style={{
              paddingBottom: '12px', 
              background: 'none', 
              border: 'none',
              color: mode === 'register' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: '700', 
              fontSize: '18px', 
              cursor: 'pointer',
              borderBottom: mode === 'register' ? '3px solid var(--primary)' : 'none',
              transition: 'all 0.3s ease'
            }}
          >
            Create Account
          </button>
        </div>

        {/* Global/API Success message */}
        {successMessage && (
          <div style={{
            padding: '12px 16px', 
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid var(--success)', 
            color: 'var(--success)',
            fontSize: '13px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Global/API Error message */}
        {error && (
          <div style={{
            padding: '12px 16px', 
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--danger)', 
            color: 'var(--danger)',
            fontSize: '13px', 
            borderRadius: '8px', 
            marginBottom: '20px', 
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} noValidate>
          {mode === 'register' && (
            <>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>Full Name</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }} />
                  <input
                    type="text"
                    required
                    placeholder="E.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    style={{ 
                      paddingLeft: '38px',
                      borderColor: fieldErrors.name ? 'var(--danger)' : 'var(--border-color)'
                    }}
                  />
                </div>
                {fieldErrors.name && (
                  <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>
                    {fieldErrors.name}
                  </span>
                )}
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>Phone Number</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }} />
                  <input
                    type="tel"
                    required
                    placeholder="10-digit number (e.g. 9876543210)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                    style={{ 
                      paddingLeft: '38px',
                      borderColor: fieldErrors.phone ? 'var(--danger)' : 'var(--border-color)'
                    }}
                  />
                </div>
                {fieldErrors.phone && (
                  <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>
                    {fieldErrors.phone}
                  </span>
                )}
              </div>

              {/* Passenger/Driver choice selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>Account Type</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setRole('passenger')}
                    style={{
                      flex: 1, 
                      padding: '10px', 
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: role === 'passenger' ? 'var(--primary)' : 'var(--border-color)',
                      backgroundColor: role === 'passenger' ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      color: role === 'passenger' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: '600', 
                      fontSize: '13px', 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Passenger
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setRole('driver')}
                    style={{
                      flex: 1, 
                      padding: '10px', 
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: role === 'driver' ? 'var(--primary)' : 'var(--border-color)',
                      backgroundColor: role === 'driver' ? 'var(--primary-light)' : 'var(--bg-secondary)',
                      color: role === 'driver' ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: '600', 
                      fontSize: '13px', 
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Driver Profile
                  </button>
                </div>
              </div>

              {/* Driving License Details */}
              {role === 'driver' && (
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px', 
                  background: 'var(--bg-primary)', 
                  padding: '16px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)', 
                  marginTop: '4px' 
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '700', 
                    color: 'var(--primary)', 
                    borderBottom: '1px solid var(--border-color)', 
                    paddingBottom: '6px' 
                  }}>
                    Driving License Details
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>License Number</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g. DL-1234567"
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      className="form-input"
                      style={{ 
                        borderColor: fieldErrors.licenseNo ? 'var(--danger)' : 'var(--border-color)'
                      }}
                    />
                    {fieldErrors.licenseNo && (
                      <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                        {fieldErrors.licenseNo}
                      </span>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-secondary)' }}>Driving License Scan/Copy</label>
                    <input
                      type="file"
                      required
                      accept="image/*,application/pdf"
                      onChange={(e) => setLicenseFile(e.target.files[0])}
                      style={{ fontSize: '12px', padding: '4px 0', width: '100%' }}
                    />
                    {fieldErrors.licenseFile && (
                      <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                        {fieldErrors.licenseFile}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }} />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ 
                  paddingLeft: '38px',
                  borderColor: fieldErrors.email ? 'var(--danger)' : 'var(--border-color)'
                }}
              />
            </div>
            {fieldErrors.email && (
              <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>
                {fieldErrors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-primary)' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-light)' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ 
                  paddingLeft: '38px',
                  borderColor: fieldErrors.password ? 'var(--danger)' : 'var(--border-color)'
                }}
              />
            </div>
            {fieldErrors.password && (
              <span style={{ display: 'block', color: 'var(--danger)', fontSize: '11px', marginTop: '4px', fontWeight: '500', lineHeight: '1.4' }}>
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="gradient-btn"
            style={{ 
              width: '100%', 
              padding: '14px', 
              fontSize: '15px', 
              marginTop: '10px',
              borderRadius: '10px'
            }}
          >
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Register Account')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ padding: '0 12px', fontSize: '12px', color: 'var(--text-light)', fontWeight: '600', textTransform: 'uppercase' }}>Or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '15px',
            borderRadius: '10px',
            backgroundColor: 'white',
            color: '#333',
            border: '1px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" style={{ width: '20px', height: '20px' }} />
          Continue with Google
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { API_URL } from '../config';

export default function VerificationForm({ token, onVerificationSubmitted, currentStatus, driverDetails }) {
  const [licenseNo, setLicenseNo] = useState('');
  const [idNo, setIdNo] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState('Sedan');
  const [insuranceNo, setInsuranceNo] = useState('');
  const [gender, setGender] = useState('Male');
  
  // Files states
  const [licenseFile, setLicenseFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [vehicleFile, setVehicleFile] = useState(null);
  const [insuranceFile, setInsuranceFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('licenseNo', licenseNo);
      if (licenseFile) formData.append('license', licenseFile);

      const res = await fetch(`${API_URL}/api/driver/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to submit verification details.');
      }

      const data = await res.json();
      setMessage(data.message || 'Driving license submitted successfully. Waiting for admin approval.');
      if (onVerificationSubmitted) {
        onVerificationSubmitted(data.user);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  if (currentStatus === 'pending') {
    return (
      <div className="glass-card animate-fade-in" style={{
        padding: '30px',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        maxWidth: '600px',
        margin: '40px auto'
      }}>
        <ShieldAlert size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '22px', marginBottom: '12px' }}>Verification Under Review</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
          Thank you for submitting your driving license. Our administrator team is verifying your details. This process typically takes less than 24 hours.
        </p>

        {driverDetails && (
          <div style={{
            background: 'var(--bg-primary)',
            padding: '16px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'left',
            fontSize: '14px',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ fontSize: '13px', color: 'var(--primary)', marginBottom: '8px', fontWeight: '700' }}>Your Submitted License Info:</h4>
            <div style={{ marginBottom: '6px' }}><b>License Number:</b> {driverDetails.licenseNo}</div>
            {driverDetails.licenseUrl && (
              <div>
                <b>Document Scan:</b>{' '}
                <a 
                  href={`${API_URL}${driverDetails.licenseUrl}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: '600' }}
                >
                  View Uploaded Driving License
                </a>
              </div>
            )}
          </div>
        )}

        <span style={{
          padding: '6px 16px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--warning)',
          borderRadius: '50px',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          Status: Pending Review
        </span>
      </div>
    );
  }

  if (currentStatus === 'approved') {
    return (
      <div className="glass-card animate-fade-in" style={{
        padding: '30px',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        maxWidth: '600px',
        margin: '40px auto'
      }}>
        <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '22px', marginBottom: '12px' }}>Verification Approved!</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
          Congratulations! Your driver account has been fully verified. You can now access your Driver Dashboard to post rides and manage passenger bookings.
        </p>

        {driverDetails && (
          <div style={{
            background: 'var(--bg-primary)',
            padding: '16px',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'left',
            fontSize: '14px',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ fontSize: '13px', color: 'var(--primary)', marginBottom: '8px', fontWeight: '700' }}>Your Verified License Info:</h4>
            <div style={{ marginBottom: '6px' }}><b>License Number:</b> {driverDetails.licenseNo}</div>
            {driverDetails.licenseUrl && (
              <div>
                <b>Document Scan:</b>{' '}
                <a 
                  href={`${API_URL}${driverDetails.licenseUrl}`} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: '600' }}
                >
                  View Uploaded Driving License
                </a>
              </div>
            )}
          </div>
        )}

        <span style={{
          padding: '6px 16px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          color: 'var(--success)',
          borderRadius: '50px',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          Status: Verified Driver
        </span>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 0 60px 0' }}>
      <div className="glass-card" style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: '30px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px'
      }}>
        <h2 style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center' }}>
          Become a <span className="gradient-text">Verified Driver</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '30px', fontSize: '14px' }}>
          Complete driver registration by submitting your driving license.
        </p>

        {message && (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid var(--success)',
            color: 'var(--success)',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            borderRadius: '10px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', color: 'var(--primary)' }}>Driving License Details</h3>
          
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Driving License Number</label>
            <input
              type="text"
              required
              placeholder="E.g. DL-1234567"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
              className="form-input"
            />
          </div>

          <div style={{ border: '1px dashed var(--border-color)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={16} style={{ color: 'var(--primary)' }} /> Driving License Copy
            </span>
            <input 
              type="file" 
              required
              accept="image/*,application/pdf" 
              onChange={(e) => setLicenseFile(e.target.files[0])} 
              style={{ fontSize: '13px', padding: '6px 0' }} 
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="gradient-btn"
            style={{ width: '100%', padding: '14px', marginTop: '16px', fontSize: '16px', gap: '8px' }}
          >
            <Upload size={18} />
            {submitting ? 'Submitting details...' : 'Submit Driving License'}
          </button>
        </form>
      </div>
    </div>
  );
}

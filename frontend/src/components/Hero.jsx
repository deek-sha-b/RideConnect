import React from 'react';
import { Search, PlusCircle, Shield, Award, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero({ onFindRide, onOfferRide }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 25 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '90vh',
      padding: '80px 0',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      boxSizing: 'border-box'
    }}>
      {/* Background glow effects */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, rgba(37,99,235,0) 70%)',
        filter: 'blur(40px)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '15%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, rgba(14,165,233,0) 70%)',
        filter: 'blur(50px)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />

      {/* Main Content */}
      <motion.div 
        className="container" 
        style={{ maxWidth: '960px', zIndex: 1 }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          variants={itemVariants}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '6px 16px',
            borderRadius: '50px',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: '24px'
          }}
        >
          <Shield size={14} />
          <span>Verified Drivers & Safe Journeys</span>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          style={{
            fontSize: '56px',
            fontWeight: '800',
            lineHeight: '1.15',
            marginBottom: '24px',
            fontFamily: 'var(--font-heading)'
          }}
        >
          Share Rides, <span className="gradient-text">Save Money</span>, <br />
          Travel Smarter
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            margin: '0 auto 40px auto',
            lineHeight: '1.6',
            fontWeight: '400'
          }}
        >
          Book or offer rides instantly with verified drivers, real-time navigation, and secure travel. Reduce emissions and travel costs together.
        </motion.p>

        {/* Call to Actions */}
        <motion.div 
          variants={itemVariants}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            marginBottom: '80px'
          }}
        >
          <button 
            onClick={onFindRide}
            className="gradient-btn"
            style={{
              padding: '16px 32px',
              fontSize: '16px',
              gap: '10px',
              width: '220px',
              justifyContent: 'center'
            }}
          >
            <Search size={20} />
            Find a Ride
          </button>
          
          <button 
            onClick={onOfferRide}
            style={{
              padding: '16px 32px',
              fontSize: '16px',
              gap: '10px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '220px',
              boxShadow: 'var(--shadow-sm)',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.color = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <PlusCircle size={20} />
            Offer a Ride
          </button>
        </motion.div>

        {/* Responsive Grid of Metric Cards */}
        <motion.div 
          variants={itemVariants}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            maxWidth: '900px',
            margin: '0 auto',
            padding: '10px'
          }}
          className="metrics-row"
        >
          {/* 100% Verified Card */}
          <motion.div 
            className="glass-card"
            variants={cardVariants}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              padding: '28px 24px',
              borderRadius: '16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              textAlign: 'center',
              transition: 'var(--transition)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px'
            }}>
              <Award size={24} style={{ color: 'var(--primary)' }} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>100% Verified</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Government IDs & Driving License checking</p>
          </motion.div>

          {/* Members Card */}
          <motion.div 
            className="glass-card"
            variants={cardVariants}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              padding: '28px 24px',
              borderRadius: '16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              textAlign: 'center',
              transition: 'var(--transition)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(14,165,233,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px'
            }}>
              <Users size={24} style={{ color: 'var(--secondary)' }} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>10k+ Members</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Active drivers and passengers sharing rides</p>
          </motion.div>

          {/* SOS Safety Card */}
          <motion.div 
            className="glass-card"
            variants={cardVariants}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              padding: '28px 24px',
              borderRadius: '16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              textAlign: 'center',
              transition: 'var(--transition)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245,158,11,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px'
            }}>
              <Shield size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>SOS Safety</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>Live GPS location share & emergency help</p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

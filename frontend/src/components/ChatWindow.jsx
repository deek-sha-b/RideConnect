import React, { useState, useEffect, useRef } from 'react';
import { Send, User, MessageCircle } from 'lucide-react';
import { API_URL } from '../config';

export default function ChatWindow({ rideId, currentUser, token, passengerName, rideRoute, tripStatus }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const fetchMessages = async () => {
    if (!rideId) return;
    try {
      const res = await fetch(`${API_URL}/api/chat/${rideId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  };

  // Poll for messages every 3 seconds
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [rideId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !rideId) return;

    try {
      const res = await fetch(`${API_URL}/api/chat/${rideId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => [...prev, msg]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className="glass-card" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '380px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageCircle size={18} style={{ color: 'var(--primary)' }} />
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>
              {passengerName ? `Chat with ${passengerName}` : 'In-App Ride Chat'}
            </h4>
            {rideRoute && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Route: {rideRoute} {rideId ? `(ID: ...${String(rideId).slice(-6)})` : ''}
              </span>
            )}
          </div>
        </div>
        {tripStatus && (
          <span style={{
            fontSize: '10px',
            fontWeight: '800',
            padding: '3px 8px',
            borderRadius: '10px',
            background: (tripStatus === 'completed' || tripStatus === 'cancelled') ? 'rgba(100,116,139,0.15)' : 'rgba(16,185,129,0.15)',
            color: (tripStatus === 'completed' || tripStatus === 'cancelled') ? 'var(--text-secondary)' : 'var(--success)'
          }}>
            {tripStatus.toUpperCase()}
          </span>
        )}
      </div>

      {/* Message List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-light)',
            fontSize: '13px'
          }}>
            <MessageCircle size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <span>No messages yet. Send a note to say hello!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender?._id === currentUser.id || msg.sender === currentUser.id;
            const isSystemAnswer = msg.content.startsWith('[Driver Answer]:');
            const content = isSystemAnswer ? msg.content.replace('[Driver Answer]: ', '') : msg.content;
            const senderName = isSystemAnswer ? 'Driver' : (msg.sender?.name || 'Me');

             return (
              <div
                key={msg._id}
                style={{
                  alignSelf: (isMe && !isSystemAnswer) ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  flexDirection: (isMe && !isSystemAnswer) ? 'row-reverse' : 'row'
                }}
              >
                {/* Dynamic Sender Letter Avatar */}
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
                  {senderName.charAt(0).toUpperCase()}
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--text-light)',
                    alignSelf: (isMe && !isSystemAnswer) ? 'flex-end' : 'flex-start'
                  }}>
                    {senderName}
                  </div>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    backgroundColor: (isMe && !isSystemAnswer) ? 'var(--primary)' : 'var(--bg-primary)',
                    color: (isMe && !isSystemAnswer) ? '#ffffff' : 'var(--text-primary)',
                    border: (isMe && !isSystemAnswer) ? 'none' : '1px solid var(--border-color)',
                    borderBottomRightRadius: (isMe && !isSystemAnswer) ? '2px' : '12px',
                    borderBottomLeftRadius: (isMe && !isSystemAnswer) ? '12px' : '2px'
                  }}>
                    {content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSendMessage} style={{
        padding: '12px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '8px',
        background: 'var(--bg-primary)'
      }}>
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="form-input"
          style={{ flex: 1, height: '40px', borderRadius: '8px' }}
        />
        <button
          type="submit"
          className="gradient-btn"
          style={{ width: '40px', height: '40px', padding: 0, borderRadius: '8px' }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

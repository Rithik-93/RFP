'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Hi! I\'m your AI RFP assistant. I can help you create RFPs, manage vendors, and track proposals. Just tell me what you need!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Create new conversation with first message
      const response = await axios.post('http://localhost:3001/api/conversations', {
        message: userMessage.content
      });

      // Redirect to conversation page
      window.location.href = `/c/${response.data.conversationId}`;
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, something went wrong. Please try again.'
      }]);
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 30px',
        background: 'rgba(255,255,255,0.95)',
        borderBottom: '1px solid #e5e7eb',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1f2937' }}>
          🤖 AI RFP Assistant
        </h1>
        <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>
          Just chat naturally - I'll handle the rest
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '70%',
              padding: '15px 20px',
              borderRadius: '18px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255,255,255,0.95)',
              color: msg.role === 'user' ? '#fff' : '#1f2937',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              backdropFilter: 'blur(10px)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '15px 20px',
              borderRadius: '18px',
              background: 'rgba(255,255,255,0.95)',
              color: '#6b7280',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
              <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>
                ✨ Thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '20px 30px',
        background: 'rgba(255,255,255,0.95)',
        borderTop: '1px solid #e5e7eb',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message... (e.g., 'Create RFP for cloud hosting, budget $50k')"
            disabled={loading}
            style={{
              flex: 1,
              padding: '15px 20px',
              borderRadius: '25px',
              border: '2px solid #e5e7eb',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border 0.2s',
              background: '#fff'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: '15px 35px',
              borderRadius: '25px',
              border: 'none',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { config } from '@/lib/config';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}


interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        loadConversation();
        loadConversations();
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversations = async () => {
        try {
            const response = await axios.get(`${config.apiUrl}/api/conversations`);
            setConversations(response.data);
        } catch (error) {
            console.error('Load conversations error:', error);
        }
    };

    const loadConversation = async () => {
        try {
            const response = await axios.get(`${config.apiUrl}/api/conversations/${id}`);
            setMessages(response.data.messages);
        } catch (error) {
            console.error('Load conversation error:', error);
            router.push('/');
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage, createdAt: new Date().toISOString() }]);
        setLoading(true);

        try {
            const response = await axios.post(`${config.apiUrl}/api/conversations/${id}/messages`, {
                message: userMessage
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply, createdAt: new Date().toISOString() }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, something went wrong.',
                createdAt: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    const createNewChat = async () => {
        try {
            const response = await axios.post(`${config.apiUrl}/api/conversations`, {
                message: 'Hello'
            });
            router.push(`/c/${response.data.conversationId}`);
        } catch (error) {
            console.error('Create chat error:', error);
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF UI Display", "Helvetica Neue", Arial, sans-serif'
        }}>
            {/* Left Sidebar - Dark iOS Style */}
            <div style={{
                width: '300px',
                background: 'rgba(30, 30, 36, 0.85)',
                backdropFilter: 'blur(20px) saturate(180%)',
                borderRight: '0.5px solid rgba(235, 215, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh'
            }}>
                {/* Sidebar Header */}
                <div style={{
                    padding: '24px 20px 16px',
                    borderBottom: '0.5px solid rgba(235, 215, 255, 0.08)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                    }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #c58aff 0%, #972fff 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px'
                        }}>
                            Messages
                        </h2>
                    </div>
                    <button
                        onClick={createNewChat}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            borderRadius: '14px',
                            border: 'none',
                            background: '#972fff',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            boxShadow: '0 4px 16px rgba(151, 47, 255, 0.4)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(151, 47, 255, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(151, 47, 255, 0.4)';
                        }}
                    >
                        New Chat
                    </button>
                </div>

                {/* Chat List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px 12px'
                }}>
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => router.push(`/c/${conv.id}`)}
                            style={{
                                padding: '14px 16px',
                                margin: '4px 0',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                background: conv.id === id
                                    ? 'linear-gradient(135deg, rgba(151, 47, 255, 0.2) 0%, rgba(197, 138, 255, 0.2) 100%)'
                                    : 'transparent',
                                transition: 'all 0.2s ease',
                                border: conv.id === id ? '1.5px solid rgba(151, 47, 255, 0.4)' : '1.5px solid transparent'
                            }}
                            onMouseEnter={(e) => {
                                if (conv.id !== id) {
                                    e.currentTarget.style.background = 'rgba(151, 47, 255, 0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (conv.id !== id) {
                                    e.currentTarget.style.background = 'transparent';
                                }
                            }}
                        >
                            <div style={{
                                fontSize: '0.95rem',
                                color: '#ebd7ff',
                                fontWeight: conv.id === id ? '600' : '500',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginBottom: '4px'
                            }}>
                                {conv.title || 'New Conversation'}
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                color: 'rgba(235, 215, 255, 0.5)',
                                fontWeight: '400'
                            }}>
                                {new Date(conv.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Chat Area - Dark iOS Style */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh'
            }}>
                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            animation: 'slideIn 0.3s ease'
                        }}>
                            <div style={{
                                maxWidth: '65%',
                                padding: '14px 18px',
                                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                background: msg.role === 'user'
                                    ? '#972fff'
                                    : 'rgba(30, 30, 36, 0.6)',
                                color: msg.role === 'user' ? '#fff' : '#ebd7ff',
                                boxShadow: msg.role === 'user'
                                    ? '0 4px 16px rgba(151, 47, 255, 0.4)'
                                    : '0 2px 12px rgba(0, 0, 0, 0.3)',
                                backdropFilter: 'blur(20px)',
                                border: msg.role === 'assistant' ? '1px solid rgba(235, 215, 255, 0.1)' : 'none',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '0.95rem',
                                lineHeight: '1.5',
                                fontWeight: '400'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{
                                padding: '14px 18px',
                                borderRadius: '20px 20px 20px 4px',
                                background: 'rgba(30, 30, 36, 0.6)',
                                color: '#c58aff',
                                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(235, 215, 255, 0.1)',
                                fontSize: '0.95rem'
                            }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>●</span>
                                    <span style={{ animation: 'pulse 1.5s ease-in-out 0.2s infinite' }}>●</span>
                                    <span style={{ animation: 'pulse 1.5s ease-in-out 0.4s infinite' }}>●</span>
                                </span>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Dark iOS Style */}
                <div style={{
                    padding: '16px 24px 24px',
                    background: 'rgba(30, 30, 36, 0.8)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    borderTop: '0.5px solid rgba(235, 215, 255, 0.1)'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        maxWidth: '1000px',
                        margin: '0 auto',
                        alignItems: 'flex-end'
                    }}>
                        <div style={{
                            flex: 1,
                            position: 'relative'
                        }}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Type a message..."
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '14px 20px',
                                    borderRadius: '22px',
                                    border: '1px solid rgba(235, 215, 255, 0.15)',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    background: 'rgba(30, 30, 36, 0.6)',
                                    color: '#ebd7ff',
                                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'inherit'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(151, 47, 255, 0.3)';
                                    e.currentTarget.style.borderColor = 'rgba(151, 47, 255, 0.5)';
                                    e.currentTarget.style.background = 'rgba(30, 30, 36, 0.8)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.3)';
                                    e.currentTarget.style.borderColor = 'rgba(235, 215, 255, 0.15)';
                                    e.currentTarget.style.background = 'rgba(30, 30, 36, 0.6)';
                                }}
                            />
                        </div>
                        <button
                            onClick={sendMessage}
                            disabled={loading || !input.trim()}
                            style={{
                                padding: '0',
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                border: 'none',
                                background: (loading || !input.trim())
                                    ? 'rgba(235, 215, 255, 0.2)'
                                    : '#972fff',
                                color: '#fff',
                                fontSize: '1.2rem',
                                cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 16px rgba(151, 47, 255, 0.4)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && input.trim()) {
                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(151, 47, 255, 0.6)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(151, 47, 255, 0.4)';
                            }}
                        >
                            ↑
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes pulse {
                    0%, 100% {
                        opacity: 0.4;
                    }
                    50% {
                        opacity: 1;
                    }
                }
                
                input::placeholder {
                    color: rgba(235, 215, 255, 0.4);
                }
            `}</style>
        </div>
    );
}

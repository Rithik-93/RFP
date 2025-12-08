'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { config } from '@/lib/config';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface Conversation {
    id: string;
    title: string;
    updatedAt: string;
}

interface RFP {
    id: string;
    title: string;
    description: string;
    budget: number;
    currency: string;
    status: 'DRAFT' | 'SENT' | 'ACTIVE' | 'CLOSED';
    deliveryDeadline: string;
    stats: {
        vendorsSent: number;
        vendorsResponded: number;
        proposalsReceived: number;
    };
}

export default function DashboardPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '👋 Hi! I\'m your AI RFP assistant. Create RFPs, manage vendors, track proposals!' }
    ]);
    const [input, setInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [rfps, setRfps] = useState<RFP[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        loadConversations();
        loadRFPs();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversations = async () => {
        try {
            const response = await axios.get(`${config.apiUrl}/api/conversations`);
            setConversations(response.data);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    };

    const loadRFPs = async () => {
        try {
            const response = await axios.get(`${config.apiUrl}/api/rfps`);
            setRfps(response.data);
        } catch (error) {
            console.error('Failed to load RFPs:', error);
        }
    };

    const loadConversation = async (convId: string) => {
        try {
            const response = await axios.get(`${config.apiUrl}/api/conversations/${convId}`);
            setMessages(response.data.messages);
            setActiveConvId(convId);
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const createNewChat = async () => {
        try {
            const response = await axios.post(`${config.apiUrl}/api/conversations`, {
                message: 'Hello'
            });
            const newConvId = response.data.conversationId;
            setActiveConvId(newConvId);
            loadConversations();
            setMessages([{ role: 'assistant', content: '👋 Hi! What can I help you with?' }]);
        } catch (error) {
            console.error('Create chat error:', error);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || chatLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatLoading(true);

        try {
            if (!activeConvId) {
                // Create new conversation
                const convResponse = await axios.post(`${config.apiUrl}/api/conversations`, {
                    message: userMessage
                });
                const newConvId = convResponse.data.conversationId;
                setActiveConvId(newConvId);
                loadConversations();

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: convResponse.data.reply
                }]);
            } else {
                // Send to existing conversation
                const response = await axios.post(`${config.apiUrl}/api/conversations/${activeConvId}/messages`, {
                    message: userMessage
                });

                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: response.data.reply
                }]);
            }

            // Reload RFPs in case new ones were created
            loadRFPs();
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Sorry, something went wrong.'
            }]);
        } finally {
            setChatLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return '#6b7280';
            case 'SENT': return '#3b82f6';
            case 'ACTIVE': return '#10b981';
            case 'CLOSED': return '#ef4444';
            default: return '#6b7280';
        }
    };

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            background: 'linear-gradient(to bottom, #000000 0%, #0a0a0a 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF UI Display", "Helvetica Neue", Arial, sans-serif'
        }}>
            {/* LEFT: Conversation List */}
            <div style={{
                width: '280px',
                background: 'rgba(30, 30, 36, 0.85)',
                backdropFilter: 'blur(20px)',
                borderRight: '0.5px solid rgba(235, 215, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    padding: '20px 16px 12px',
                    borderBottom: '0.5px solid rgba(235, 215, 255, 0.08)'
                }}>
                    <h2 style={{
                        margin: '0 0 12px 0',
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #c58aff 0%, #972fff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Chats
                    </h2>
                    <button
                        onClick={createNewChat}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            background: '#972fff',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            boxShadow: '0 4px 12px rgba(151, 47, 255, 0.3)'
                        }}
                    >
                        New Chat
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            style={{
                                padding: '12px',
                                margin: '4px 0',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: conv.id === activeConvId ? 'rgba(151, 47, 255, 0.2)' : 'transparent',
                                border: conv.id === activeConvId ? '1.5px solid rgba(151, 47, 255, 0.4)' : '1.5px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                fontSize: '0.9rem',
                                color: '#ebd7ff',
                                fontWeight: conv.id === activeConvId ? '600' : '500',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {conv.title || 'New Chat'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(235, 215, 255, 0.5)', marginTop: '4px' }}>
                                {new Date(conv.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTER: Chat Messages (BIGGEST) */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'transparent'
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
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{
                                maxWidth: '70%',
                                padding: '14px 18px',
                                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                background: msg.role === 'user' ? '#972fff' : 'rgba(30, 30, 36, 0.6)',
                                color: msg.role === 'user' ? '#fff' : '#ebd7ff',
                                boxShadow: msg.role === 'user' ? '0 4px 16px rgba(151, 47, 255, 0.4)' : '0 2px 12px rgba(0, 0, 0, 0.3)',
                                backdropFilter: 'blur(20px)',
                                border: msg.role === 'assistant' ? '1px solid rgba(235, 215, 255, 0.1)' : 'none',
                                fontSize: '0.95rem',
                                lineHeight: '1.5'
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {chatLoading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{
                                padding: '14px 18px',
                                borderRadius: '20px',
                                background: 'rgba(30, 30, 36, 0.6)',
                                border: '1px solid rgba(235, 215, 255, 0.1)',
                                color: '#c58aff'
                            }}>
                                <span style={{ display: 'inline-flex', gap: '5px' }}>
                                    <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>●</span>
                                    <span style={{ animation: 'pulse 1.5s ease-in-out 0.2s infinite' }}>●</span>
                                    <span style={{ animation: 'pulse 1.5s ease-in-out 0.4s infinite' }}>●</span>
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    padding: '16px 24px 24px',
                    background: 'rgba(30, 30, 36, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderTop: '0.5px solid rgba(235, 215, 255, 0.1)'
                }}>
                    <div style={{ display: 'flex', gap: '12px', maxWidth: '900px', margin: '0 auto' }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type a message..."
                            disabled={chatLoading}
                            style={{
                                flex: 1,
                                padding: '14px 20px',
                                borderRadius: '22px',
                                border: '1px solid rgba(235, 215, 255, 0.15)',
                                background: 'rgba(30, 30, 36, 0.6)',
                                color: '#ebd7ff',
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={chatLoading || !input.trim()}
                            style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                border: 'none',
                                background: (chatLoading || !input.trim()) ? 'rgba(235, 215, 255, 0.2)' : '#972fff',
                                color: '#fff',
                                fontSize: '1.2rem',
                                cursor: (chatLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ↑
                        </button>
                    </div>
                </div>
            </div>

            {/* RIGHT: RFP Dashboard */}
            <div style={{
                width: '320px',
                background: 'rgba(30, 30, 36, 0.85)',
                backdropFilter: 'blur(20px)',
                borderLeft: '0.5px solid rgba(235, 215, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
            }}>
                <div style={{
                    padding: '20px 16px 12px',
                    borderBottom: '0.5px solid rgba(235, 215, 255, 0.08)'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #c58aff 0%, #972fff 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        RFPs
                    </h2>
                </div>

                <div style={{ padding: '12px' }}>
                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <div style={{
                            flex: 1,
                            background: 'rgba(151, 47, 255, 0.1)',
                            border: '1px solid rgba(151, 47, 255, 0.2)',
                            borderRadius: '10px',
                            padding: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#972fff' }}>{rfps.length}</div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(235, 215, 255, 0.6)' }}>Total</div>
                        </div>
                        <div style={{
                            flex: 1,
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '10px',
                            padding: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
                                {rfps.reduce((acc, r) => acc + r.stats.proposalsReceived, 0)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(235, 215, 255, 0.6)' }}>Proposals</div>
                        </div>
                    </div>

                    {/* RFP List */}
                    {rfps.map((rfp) => (
                        <div
                            key={rfp.id}
                            onClick={() => router.push(`/rfp/${rfp.id}`)}
                            style={{
                                background: 'rgba(30, 30, 36, 0.6)',
                                border: '1px solid rgba(235, 215, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '12px',
                                marginBottom: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(151, 47, 255, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(235, 215, 255, 0.1)';
                            }}
                        >
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: '#ebd7ff',
                                marginBottom: '6px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {rfp.title}
                            </div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: 'rgba(235, 215, 255, 0.6)',
                                marginBottom: '8px'
                            }}>
                                {rfp.currency} {rfp.budget.toLocaleString()}
                            </div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.7rem',
                                color: 'rgba(235, 215, 255, 0.5)'
                            }}>
                                <span>Vendors: {rfp.stats.vendorsResponded}/{rfp.stats.vendorsSent}</span>
                                <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '8px',
                                    background: `${getStatusColor(rfp.status)}20`,
                                    color: getStatusColor(rfp.status)
                                }}>
                                    {rfp.status}
                                </span>
                            </div>
                        </div>
                    ))}

                    {rfps.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '30px 10px',
                            color: 'rgba(235, 215, 255, 0.4)',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📋</div>
                            No RFPs yet
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; }
                    50% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

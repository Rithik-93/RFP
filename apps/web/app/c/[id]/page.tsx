'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        loadConversation();
    }, [id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversation = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/api/conversations/${id}`);
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
            const response = await axios.post(`http://localhost:3001/api/conversations/${id}/messages`, {
                message: userMessage
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply, createdAt: new Date().toISOString() }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Sorry, something went wrong.',
                createdAt: new Date().toISOString()
            }]);
        } finally {
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
                            color: '#6b7280'
                        }}>
                            ✨ Thinking...
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: '20px 30px',
                background: 'rgba(255,255,255,0.95)',
                borderTop: '1px solid #e5e7eb'
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
                        placeholder="Type your message..."
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '15px 20px',
                            borderRadius: '25px',
                            border: '2px solid #e5e7eb',
                            fontSize: '1rem',
                            outline: 'none',
                            background: '#fff'
                        }}
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
                            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                        }}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}

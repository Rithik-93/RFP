'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRFP } from '@/lib/api';

export default function CreateRFPPage() {
    const router = useRouter();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await createRFP(message, 'user@example.com');

            if (result.success) {
                router.push(`/rfps/${result.rfp.id}`);
            } else {
                setError(result.error || 'Failed to create RFP');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Create New RFP</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>
                Describe what you want to buy in plain English. AI will create a structured RFP for you.
            </p>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                        Describe your procurement needs:
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Example: I need to procure 20 laptops with 16GB RAM and 15 monitors (27-inch) for our new office. Budget is $50,000. Need delivery within 30 days. Payment terms should be net 30, and we need at least 1 year warranty."
                        rows={8}
                        style={{
                            width: '100%',
                            padding: '15px',
                            fontSize: '1rem',
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            fontFamily: 'inherit',
                        }}
                        required
                    />
                </div>

                {error && (
                    <div style={{
                        padding: '15px',
                        backgroundColor: '#fee',
                        border: '1px solid #fcc',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        color: '#c00'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        type="submit"
                        disabled={loading || !message.trim()}
                        style={{
                            padding: '12px 30px',
                            fontSize: '1rem',
                            backgroundColor: loading ? '#ccc' : '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        {loading ? 'Creating...' : 'Create RFP with AI'}
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/')}
                        style={{
                            padding: '12px 30px',
                            fontSize: '1rem',
                            backgroundColor: 'white',
                            color: '#333',
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </form>

            <div style={{
                marginTop: '40px',
                padding: '20px',
                backgroundColor: '#f0f8ff',
                borderRadius: '8px',
                border: '1px solid #b3d9ff'
            }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>💡 Tips:</h3>
                <ul style={{ lineHeight: '1.8', color: '#444' }}>
                    <li>Mention specific items and quantities</li>
                    <li>Include budget and currency</li>
                    <li>Specify delivery timeline</li>
                    <li>Add payment terms and warranty requirements</li>
                    <li>The more details you provide, the better the RFP!</li>
                </ul>
            </div>
        </div>
    );
}

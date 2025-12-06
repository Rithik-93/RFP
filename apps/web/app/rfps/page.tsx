'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getRFPs } from '@/lib/api';

export default function RFPsPage() {
    const [rfps, setRfps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRFPs();
    }, []);

    const loadRFPs = async () => {
        try {
            const data = await getRFPs();
            setRfps(data);
        } catch (error) {
            console.error('Failed to load RFPs:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2rem' }}>All RFPs</h1>
                <Link href="/create">
                    <button style={{
                        padding: '10px 20px',
                        backgroundColor: '#0070f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                    }}>
                        + Create New RFP
                    </button>
                </Link>
            </div>

            {rfps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                    <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>No RFPs yet</p>
                    <Link href="/create">
                        <button style={{
                            padding: '12px 24px',
                            backgroundColor: '#0070f3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                        }}>
                            Create Your First RFP
                        </button>
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '20px' }}>
                    {rfps.map((rfp) => (
                        <Link key={rfp.id} href={`/rfps/${rfp.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '25px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s',
                            }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0070f3'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.4rem', marginBottom: '10px', color: '#000' }}>
                                            {rfp.title}
                                        </h2>
                                        <p style={{ color: '#666', marginBottom: '15px' }}>
                                            {rfp.description.substring(0, 150)}...
                                        </p>
                                        <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#888' }}>
                                            <span>💰 {rfp.currency} {rfp.budget.toString()}</span>
                                            <span>📅 {new Date(rfp.deliveryDeadline).toLocaleDateString()}</span>
                                            <span style={{
                                                padding: '4px 12px',
                                                backgroundColor: rfp.status === 'DRAFT' ? '#fef3c7' : rfp.status === 'SENT' ? '#dbeafe' : '#d1fae5',
                                                borderRadius: '12px',
                                                fontWeight: 'bold',
                                            }}>
                                                {rfp.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

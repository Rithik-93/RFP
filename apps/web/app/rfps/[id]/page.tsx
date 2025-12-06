'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRFP, getVendors, sendRFP, getRecommendation } from '@/lib/api';

export default function RFPDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [rfp, setRfp] = useState<any>(null);
    const [vendors, setVendors] = useState<any[]>([]);
    const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
    const [recommendation, setRecommendation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadData();
    }, [params.id]);

    const loadData = async () => {
        try {
            const [rfpData, vendorsData] = await Promise.all([
                getRFP(params.id as string),
                getVendors(),
            ]);
            setRfp(rfpData);
            setVendors(vendorsData);

            // Load recommendation if proposals exist
            if (rfpData.proposals && rfpData.proposals.length > 0) {
                try {
                    const rec = await getRecommendation(params.id as string);
                    if (rec.success) {
                        setRecommendation(rec.data);
                    }
                } catch (err) {
                    console.log('No recommendation yet');
                }
            }
        } catch (error) {
            console.error('Failed to load:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRFP = async () => {
        if (selectedVendors.length === 0) {
            alert('Please select at least one vendor');
            return;
        }

        setSending(true);
        try {
            await sendRFP(params.id as string, selectedVendors);
            alert('RFP sent successfully!');
            loadData(); // Reload to see updated status
        } catch (error) {
            alert('Failed to send RFP');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    if (!rfp) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>RFP not found</div>;
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <button
                onClick={() => router.push('/rfps')}
                style={{
                    padding: '8px 16px',
                    marginBottom: '20px',
                    backgroundColor: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                ← Back to RFPs
            </button>

            <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>{rfp.title}</h1>
            <p style={{ color: '#666', marginBottom: '30px' }}>{rfp.description}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {/* Left Column - RFP Details */}
                <div>
                    <div style={{
                        padding: '20px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '10px',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{ marginBottom: '15px' }}>📋 RFP Details</h3>
                        <div style={{ lineHeight: '2' }}>
                            <p><strong>Budget:</strong> {rfp.currency} {rfp.budget.toString()}</p>
                            <p><strong>Delivery Deadline:</strong> {new Date(rfp.deliveryDeadline).toLocaleDateString()}</p>
                            <p><strong>Payment Terms:</strong> {rfp.paymentTerms || 'N/A'}</p>
                            <p><strong>Status:</strong> <span style={{
                                padding: '4px 12px',
                                backgroundColor: rfp.status === 'DRAFT' ? '#fef3c7' : '#dbeafe',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                            }}>{rfp.status}</span></p>
                        </div>
                    </div>

                    <div style={{
                        padding: '20px',
                        backgroundColor: '#f9f9f9',
                        borderRadius: '10px'
                    }}>
                        <h3 style={{ marginBottom: '15px' }}>📦 Requirements</h3>
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            backgroundColor: 'white',
                            padding: '15px',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                        }}>
                            {JSON.stringify(rfp.requirements, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Right Column - Vendors & Proposals */}
                <div>
                    {rfp.status === 'DRAFT' && (
                        <div style={{
                            padding: '20px',
                            backgroundColor: '#f0f8ff',
                            borderRadius: '10px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px' }}>📧 Send to Vendors</h3>
                            <div style={{ marginBottom: '15px' }}>
                                {vendors.map((vendor) => (
                                    <label key={vendor.id} style={{ display: 'block', marginBottom: '10px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedVendors.includes(vendor.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedVendors([...selectedVendors, vendor.id]);
                                                } else {
                                                    setSelectedVendors(selectedVendors.filter(id => id !== vendor.id));
                                                }
                                            }}
                                            style={{ marginRight: '10px' }}
                                        />
                                        {vendor.name} ({vendor.company})
                                    </label>
                                ))}
                            </div>
                            <button
                                onClick={handleSendRFP}
                                disabled={sending || selectedVendors.length === 0}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: sending ? '#ccc' : '#0070f3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: sending ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                }}
                            >
                                {sending ? 'Sending...' : `Send to ${selectedVendors.length} vendor(s)`}
                            </button>
                        </div>
                    )}

                    {rfp.proposals && rfp.proposals.length > 0 && (
                        <div style={{
                            padding: '20px',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '10px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ marginBottom: '15px' }}>📊 Proposals ({rfp.proposals.length})</h3>
                            {rfp.proposals.map((proposal: any) => (
                                <div key={proposal.id} style={{
                                    padding: '15px',
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    marginBottom: '10px',
                                    border: '1px solid #d1fae5'
                                }}>
                                    <h4 style={{ marginBottom: '10px' }}>{proposal.vendor.name}</h4>
                                    <p><strong>Price:</strong> {proposal.pricing?.total || 'N/A'}</p>
                                    <p><strong>AI Score:</strong> {proposal.aiScore || 'N/A'}/100</p>
                                    <details style={{ marginTop: '10px' }}>
                                        <summary style={{ cursor: 'pointer', color: '#0070f3' }}>View Details</summary>
                                        <pre style={{
                                            marginTop: '10px',
                                            fontSize: '0.85rem',
                                            backgroundColor: '#f9f9f9',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            overflow: 'auto'
                                        }}>
                                            {JSON.stringify(proposal.parsedData, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            ))}
                        </div>
                    )}

                    {recommendation && (
                        <div style={{
                            padding: '20px',
                            backgroundColor: '#fef3c7',
                            borderRadius: '10px',
                            border: '2px solid #fbbf24'
                        }}>
                            <h3 style={{ marginBottom: '15px' }}>🤖 AI Recommendation</h3>
                            <p style={{ marginBottom: '10px' }}><strong>Recommended Vendor:</strong> {recommendation.recommendedVendor}</p>
                            <p style={{ marginBottom: '10px' }}><strong>Score:</strong> {recommendation.score}/100</p>
                            <p style={{ marginBottom: '10px' }}><strong>Reasoning:</strong> {recommendation.reasoning}</p>
                            <p><strong>Risk Level:</strong> <span style={{
                                padding: '4px 12px',
                                backgroundColor: recommendation.riskAssessment === 'LOW' ? '#d1fae5' : recommendation.riskAssessment === 'MEDIUM' ? '#fef3c7' : '#fee2e2',
                                borderRadius: '12px',
                                fontWeight: 'bold'
                            }}>{recommendation.riskAssessment}</span></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

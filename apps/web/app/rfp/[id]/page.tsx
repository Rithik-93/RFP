'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { config } from '@/lib/config';
import { ArrowLeft, DollarSign, TrendingUp, Sparkles, Clock } from 'lucide-react';

interface Proposal {
    id: string;
    vendor: { name: string; email: string };
    pricing: any;
    parsedData: any;
    status: string;
    createdAt: string;
}

interface RFP {
    id: string;
    title: string;
    description: string;
    requirements: any;
    budget: number;
    currency: string;
    status: string;
    deliveryDeadline: string;
    vendors: Array<{
        id: string;
        status: string;
        vendor: { name: string; email: string };
    }>;
    proposals: Proposal[];
}

export default function RFPDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [rfp, setRfp] = useState<RFP | null>(null);
    const [evaluation, setEvaluation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const res = await axios.get(`${config.apiUrl}/api/rfps/${id}`);
            setRfp(res.data);

            if (res.data.proposals?.length > 0) {
                const evalRes = await axios.post(`${config.apiUrl}/api/chat`, {
                    message: `evaluate proposals for RFP ${id}`
                });
                if (evalRes.data?.type === 'response') {
                    try {
                        const parsed = JSON.parse(evalRes.data.message);
                        setEvaluation(parsed);
                    } catch (e) {
                        setEvaluation(null);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProposalAction = async (proposalId: string, status: string) => {
        try {
            await axios.post(`${config.apiUrl}/api/chat`, {
                message: `update proposal ${proposalId} status to ${status}`
            });
            loadData();
        } catch (error) {
            console.error('Action failed:', error);
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'SENT' || status === 'RESPONDED') return '#10b981';
        if (status === 'DRAFT' || status === 'PENDING') return '#f59e0b';
        return '#a855f7';
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                <div style={{ color: '#d8b4fe', fontSize: '1.25rem' }}>Loading...</div>
            </div>
        );
    }

    if (!rfp) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                <div style={{ color: '#d8b4fe', fontSize: '1.25rem' }}>RFP not found</div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(to bottom, #000000 0%, rgba(88, 28, 135, 0.2) 50%, #000000 100%)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF UI Display", "Helvetica Neue", Arial, sans-serif',
            paddingBottom: '60px'
        }}>
            <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>

                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'rgba(168, 85, 247, 0.1)',
                        color: '#d8b4fe',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        marginBottom: '32px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.2)';
                        e.currentTarget.style.color = '#e9d5ff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)';
                        e.currentTarget.style.color = '#d8b4fe';
                    }}
                >
                    <ArrowLeft style={{ marginRight: '8px', width: '18px', height: '18px' }} />
                    Back to Dashboard
                </button>

                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                        <h1 style={{
                            margin: 0,
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            background: 'linear-gradient(135deg, #c084fc 0%, #e9d5ff 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            flex: 1
                        }}>
                            {rfp.title}
                        </h1>
                        <span style={{
                            padding: '6px 16px',
                            borderRadius: '12px',
                            background: `${getStatusColor(rfp.status)}20`,
                            color: getStatusColor(rfp.status),
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            border: `1px solid ${getStatusColor(rfp.status)}40`
                        }}>
                            {rfp.status}
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '1.1rem', color: '#e9d5ff', lineHeight: '1.6', opacity: 0.9 }}>
                        {rfp.description}
                    </p>
                </div>

                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '40px' }}>
                    {/* Budget */}
                    <div style={{
                        background: 'rgba(30, 30, 36, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '16px',
                        padding: '20px',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)' }}>
                                <DollarSign style={{ width: '24px', height: '24px', color: '#a855f7' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(233, 213, 255, 0.6)', marginBottom: '4px' }}>Budget</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#e9d5ff' }}>
                                    {rfp.currency} {rfp.budget.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Responses */}
                    <div style={{
                        background: 'rgba(30, 30, 36, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '16px',
                        padding: '20px',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)' }}>
                                <TrendingUp style={{ width: '24px', height: '24px', color: '#10b981' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(233, 213, 255, 0.6)', marginBottom: '4px' }}>Responses</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#e9d5ff' }}>
                                    {rfp.vendors.filter(v => v.status === 'RESPONDED').length}/{rfp.vendors.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Proposals */}
                    <div style={{
                        background: 'rgba(30, 30, 36, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(234, 179, 8, 0.2)',
                        borderRadius: '16px',
                        padding: '20px',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.4)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(234, 179, 8, 0.2)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.1)' }}>
                                <Sparkles style={{ width: '24px', height: '24px', color: '#eab308' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(233, 213, 255, 0.6)', marginBottom: '4px' }}>Proposals</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#e9d5ff' }}>
                                    {rfp.proposals.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deadline */}
                    <div style={{
                        background: 'rgba(30, 30, 36, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '16px',
                        padding: '20px',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)' }}>
                                <Clock style={{ width: '24px', height: '24px', color: '#3b82f6' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(233, 213, 255, 0.6)', marginBottom: '4px' }}>Deadline</div>
                                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#e9d5ff' }}>
                                    {new Date(rfp.deliveryDeadline).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Recommendation */}
                {evaluation && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(30, 30, 36, 0.6) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '40px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Sparkles style={{ width: '24px', height: '24px', color: '#a855f7' }} />
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#e9d5ff' }}>
                                AI Recommendation
                            </h2>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(233, 213, 255, 0.6)', marginBottom: '6px' }}>Recommended Vendor</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#e9d5ff' }}>{evaluation.recommendedVendor}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.8rem', color: 'rgba(233, 213, 255, 0.6)', marginBottom: '6px' }}>Confidence Score</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#10b981' }}>{evaluation.score}/100</div>
                            </div>
                        </div>
                        <p style={{ margin: 0, fontSize: '1rem', color: 'rgba(233, 213, 255, 0.85)', lineHeight: '1.6' }}>
                            {evaluation.reasoning}
                        </p>
                        {evaluation.riskAssessment && (
                            <div style={{
                                marginTop: '16px',
                                display: 'inline-block',
                                padding: '6px 14px',
                                borderRadius: '10px',
                                background: evaluation.riskAssessment === 'LOW' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                                color: evaluation.riskAssessment === 'LOW' ? '#10b981' : '#eab308',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                border: `1px solid ${evaluation.riskAssessment === 'LOW' ? '#10b98140' : '#eab30840'}`
                            }}>
                                Risk: {evaluation.riskAssessment}
                            </div>
                        )}
                    </div>
                )}

                {/* Proposals */}
                {rfp.proposals.length > 0 && (
                    <div>
                        <h2 style={{ margin: '0 0 24px 0', fontSize: '2rem', fontWeight: '600', color: '#d8b4fe' }}>Proposals</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {rfp.proposals.map((proposal) => {
                                const pricing = proposal.pricing as any;
                                const parsed = proposal.parsedData as any;
                                const statusColor = proposal.status === 'ACCEPTED' ? '#10b981' : proposal.status === 'REJECTED' ? '#ef4444' : '#6b7280';

                                return (
                                    <div key={proposal.id} style={{
                                        background: 'rgba(30, 30, 36, 0.6)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid rgba(168, 85, 247, 0.2)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        transition: 'all 0.2s'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.5)'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.2)'}
                                    >
                                        <div style={{ marginBottom: '16px' }}>
                                            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '600', color: '#e9d5ff' }}>
                                                {proposal.vendor.name}
                                            </h3>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '8px',
                                                background: `${statusColor}20`,
                                                color: statusColor,
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                border: `1px solid ${statusColor}40`
                                            }}>
                                                {proposal.status}
                                            </span>
                                        </div>

                                        {pricing?.total && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(233, 213, 255, 0.6)', marginBottom: '4px' }}>Total Price</div>
                                                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
                                                    {pricing.currency || rfp.currency} {pricing.total.toLocaleString()}
                                                </div>
                                            </div>
                                        )}

                                        {parsed?.timeline && (
                                            <div style={{ marginBottom: '12px' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(233, 213, 255, 0.6)', marginBottom: '4px' }}>Timeline</div>
                                                <div style={{ fontSize: '0.9rem', color: '#e9d5ff' }}>
                                                    {typeof parsed.timeline === 'object' ? parsed.timeline.delivery || JSON.stringify(parsed.timeline) : parsed.timeline}
                                                </div>
                                            </div>
                                        )}

                                        {parsed?.summary && (
                                            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'rgba(233, 213, 255, 0.7)', lineHeight: '1.5' }}>
                                                {parsed.summary}
                                            </p>
                                        )}

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {proposal.status !== 'ACCEPTED' && (
                                                <button
                                                    onClick={() => handleProposalAction(proposal.id, 'ACCEPTED')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 16px',
                                                        borderRadius: '10px',
                                                        border: 'none',
                                                        background: '#10b981',
                                                        color: '#fff',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                                                >
                                                    Accept
                                                </button>
                                            )}
                                            {proposal.status !== 'REJECTED' && (
                                                <button
                                                    onClick={() => handleProposalAction(proposal.id, 'REJECTED')}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px 16px',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(239, 68, 68, 0.5)',
                                                        background: 'transparent',
                                                        color: '#ef4444',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                        e.currentTarget.style.borderColor = '#ef4444';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* No Proposals */}
                {rfp.proposals.length === 0 && (
                    <div style={{
                        background: 'rgba(30, 30, 36, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '16px',
                        padding: '60px 24px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📄</div>
                        <div style={{ fontSize: '1.25rem', color: 'rgba(233, 213, 255, 0.6)' }}>No proposals received yet</div>
                    </div>
                )}
            </div>
        </div>
    );
}

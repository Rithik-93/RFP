'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@rfp/ui/card';
import { Badge } from '@rfp/ui/badge';
import { Button } from '@rfp/ui/button';
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-purple-300">Loading...</div>
            </div>
        );
    }

    if (!rfp) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-purple-300">RFP not found</div>
            </div>
        );
    }

    const statusVariant = (status: string) => {
        if (status === 'SENT' || status === 'RESPONDED') return 'success';
        if (status === 'DRAFT' || status === 'PENDING') return 'warning';
        return 'default';
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-black via-purple-950/20 to-black p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-purple-300 to-purple-200 bg-clip-text text-transparent">
                            {rfp.title}
                        </h1>
                        <Badge variant={statusVariant(rfp.status)}>{rfp.status}</Badge>
                    </div>
                    <p className="text-lg text-purple-200/70">{rfp.description}</p>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <DollarSign className="h-8 w-8 text-purple-400" />
                                <div>
                                    <div className="text-sm text-purple-300/60">Budget</div>
                                    <div className="text-2xl font-bold text-purple-300">
                                        {rfp.currency} {rfp.budget.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-8 w-8 text-green-400" />
                                <div>
                                    <div className="text-sm text-purple-300/60">Responses</div>
                                    <div className="text-2xl font-bold text-purple-300">
                                        {rfp.vendors.filter(v => v.status === 'RESPONDED').length}/{rfp.vendors.length}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Sparkles className="h-8 w-8 text-yellow-400" />
                                <div>
                                    <div className="text-sm text-purple-300/60">Proposals</div>
                                    <div className="text-2xl font-bold text-purple-300">{rfp.proposals.length}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <Clock className="h-8 w-8 text-blue-400" />
                                <div>
                                    <div className="text-sm text-purple-300/60">Deadline</div>
                                    <div className="text-sm font-semibold text-purple-300">
                                        {new Date(rfp.deliveryDeadline).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {evaluation && (
                    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-6 w-6" />
                                AI Recommendation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-purple-300/60">Recommended Vendor</div>
                                    <div className="text-2xl font-bold text-purple-200">{evaluation.recommendedVendor}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-purple-300/60">Confidence Score</div>
                                    <div className="text-3xl font-bold text-green-400">{evaluation.score}/100</div>
                                </div>
                            </div>
                            <p className="text-purple-200/80">{evaluation.reasoning}</p>
                            {evaluation.riskAssessment && (
                                <Badge variant={evaluation.riskAssessment === 'LOW' ? 'success' : 'warning'}>
                                    Risk: {evaluation.riskAssessment}
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                )}

                {rfp.proposals.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold text-purple-300">Proposals</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rfp.proposals.map((proposal) => {
                                const pricing = proposal.pricing as any;
                                const parsed = proposal.parsedData as any;
                                return (
                                    <Card key={proposal.id} className="hover:border-purple-500/50 transition-all">
                                        <CardHeader>
                                            <CardTitle className="text-xl">{proposal.vendor.name}</CardTitle>
                                            <Badge variant={statusVariant(proposal.status)}>{proposal.status}</Badge>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {pricing?.total && (
                                                <div>
                                                    <div className="text-sm text-purple-300/60">Total Price</div>
                                                    <div className="text-3xl font-bold text-green-400">
                                                        {pricing.currency || rfp.currency} {pricing.total.toLocaleString()}
                                                    </div>
                                                </div>
                                            )}
                                            {parsed?.timeline && (
                                                <div>
                                                    <div className="text-sm text-purple-300/60">Timeline</div>
                                                    <div className="text-purple-200">{parsed.timeline}</div>
                                                </div>
                                            )}
                                            {parsed?.summary && (
                                                <p className="text-sm text-purple-200/70">{parsed.summary}</p>
                                            )}
                                            <div className="flex gap-2">
                                                {proposal.status !== 'ACCEPTED' && (
                                                    <Button
                                                        size="sm"
                                                        variant="default"
                                                        onClick={() => handleProposalAction(proposal.id, 'ACCEPTED')}
                                                    >
                                                        Accept
                                                    </Button>
                                                )}
                                                {proposal.status !== 'REJECTED' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleProposalAction(proposal.id, 'REJECTED')}
                                                    >
                                                        Reject
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {rfp.proposals.length === 0 && (
                    <Card className="text-center py-12">
                        <CardContent>
                            <div className="text-6xl mb-4">📄</div>
                            <div className="text-xl text-purple-300/60">No proposals received yet</div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

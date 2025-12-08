import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function createRFP(message: string, createdBy: string) {
    const res = await axios.post(`${API_URL}/api/rfps`, { message, createdBy });
    return res.data;
}

export async function getRFPs() {
    const res = await axios.get(`${API_URL}/api/rfps`);
    return res.data;
}

export async function getRFP(id: string) {
    const res = await axios.get(`${API_URL}/api/rfps/${id}`);
    return res.data;
}

export async function sendRFP(id: string, vendorIds: string[]) {
    const res = await axios.post(`${API_URL}/api/rfps/${id}/send`, { vendorIds });
    return res.data;
}

export async function getVendors() {
    const res = await axios.get(`${API_URL}/api/vendors`);
    return res.data;
}

export async function createVendor(data: any) {
    const res = await axios.post(`${API_URL}/api/vendors`, data);
    return res.data;
}

export async function submitProposal(data: any) {
    const res = await axios.post(`${API_URL}/api/proposals`, data);
    return res.data;
}

export async function getRecommendation(rfpId: string) {
    const res = await axios.get(`${API_URL}/api/rfps/${rfpId}/recommendation`);
    return res.data;
}

export async function getEvaluation(rfpId: string) {
    const res = await axios.post(`${API_URL}/api/chat`, {
        message: `evaluate proposals for RFP ${rfpId}`,
    });
    return res.data;
}

export async function updateProposalStatus(proposalId: string, status: string) {
    const res = await axios.patch(`${API_URL}/api/proposals/${proposalId}/status`, { status });
    return res.data;
}

export async function updateRFPStatus(rfpId: string, status: string) {
    const res = await axios.patch(`${API_URL}/api/rfps/${rfpId}/status`, { status });
    return res.data;
}

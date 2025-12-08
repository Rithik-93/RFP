import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

import { prisma } from '@rfp/database';
import axios from 'axios';

const app = express();
const PORT = process.env.GATEWAY_PORT;

const ENGINE_URL = process.env.ENGINE_URL;

if (!process.env.GATEWAY_PORT || !ENGINE_URL) {
    throw new Error('Missing environment variables');
}

app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'gateway' });
});

app.post('/api/conversations', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'message required' });
        }

        const conversation = await prisma.conversation.create({
            data: {
                title: message.substring(0, 50)
            }
        });

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: message
            }
        });

        const aiResponse = await axios.post(`${ENGINE_URL}/api/chat`, {
            message,
            history: []
        });

        const aiResult = await aiResponse.data;

        if (!aiResult.message || aiResult.type !== 'response') {
            console.error('AI service returned invalid response:', aiResult);
            return res.status(500).json({ error: 'AI service failed to generate a response' });
        }

        await prisma.message.create({
            data: {
                conversationId: conversation.id,
                role: 'assistant',
                content: aiResult.message
            }
        });

        res.json({
            conversationId: conversation.id,
            reply: aiResult.message
        });
    } catch (error: any) {
        console.error('Create conversation error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/conversations/:id/messages', async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        if (!message || !req.params.id) {
            return res.status(400).json({ error: 'message and conversationId required' });
        }

        // Load conversation history
        const messages = await prisma.message.findMany({
            where: { conversationId: req.params.id },
            orderBy: { createdAt: 'asc' }
        });

        // Create user message
        await prisma.message.create({
            data: {
                conversationId: req.params.id,
                role: 'user',
                content: message
            }
        });

        // Build history for AI
        const history = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        // Call AI with full history
        const aiResponse = await axios.post(`${ENGINE_URL}/api/chat`, {
            message,
            history
        });

        const aiResult = await aiResponse.data;

        if (!aiResult.message || aiResult.type !== 'response') {
            console.error('AI service returned invalid response:', aiResult);
            return res.status(500).json({ error: 'AI service failed to generate a response' });
        }

        // Save AI response
        await prisma.message.create({
            data: {
                conversationId: req.params.id,
                role: 'assistant',
                content: aiResult.message
            }
        });

        res.json({ reply: aiResult.message });
    } catch (error: any) {
        console.error('Add message error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/conversations', async (req: Request, res: Response) => {
    try {
        const conversations = await prisma.conversation.findMany({
            orderBy: { updatedAt: 'desc' },
            take: 50
        });
        res.json(conversations);
    } catch (error: any) {
        console.error('Get conversations error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/conversations/:id', async (req: Request, res: Response) => {
    if (!req.params.id) {
        return res.status(400).json({ error: 'conversationId required' });
    }
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id: req.params.id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(conversation);
    } catch (error: any) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all RFPs with statistics
app.get('/api/rfps', async (req: Request, res: Response) => {
    try {
        const rfps = await prisma.rFP.findMany({
            include: {
                vendors: {
                    include: {
                        vendor: true,
                        replies: true
                    }
                },
                proposals: {
                    include: {
                        vendor: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        const rfpsWithStats = rfps.map(rfp => ({
            id: rfp.id,
            title: rfp.title,
            description: rfp.description,
            budget: rfp.budget,
            currency: rfp.currency,
            status: rfp.status,
            deliveryDeadline: rfp.deliveryDeadline,
            createdAt: rfp.createdAt,
            updatedAt: rfp.updatedAt,
            stats: {
                vendorsSent: rfp.vendors.length,
                vendorsResponded: rfp.vendors.filter((v: any) => v.status === 'RESPONDED').length,
                proposalsReceived: rfp.proposals.length,
                repliesTotal: rfp.vendors.reduce((acc: number, v: any) => acc + v.replies.length, 0)
            }
        }));

        res.json(rfpsWithStats);
    } catch (error: any) {
        console.error('Get RFPs error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rfps', async (req: Request, res: Response) => {
    try {
        const { message, createdBy } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'message required' });
        }

        // Call AI service to parse RFP
        const aiResponse = await axios.post(`${ENGINE_URL}/api/parse-rfp`, {
            message
        });

        const aiResult = await aiResponse.data;

        if (!aiResult.success) {
            return res.status(400).json({ error: 'Failed to parse RFP', details: aiResult.error });
        }

        const parsed = aiResult.data;

        // Create RFP in database
        const rfp = await prisma.rFP.create({
            data: {
                title: parsed.title,
                description: parsed.description,
                requirements: parsed.requirements || [],
                budget: parsed.budget,
                currency: parsed.currency || 'USD',
                deliveryDeadline: new Date(parsed.deliveryDeadline),
                createdBy: createdBy || undefined,
                status: 'DRAFT',
            },
        });

        res.json({ success: true, rfp });
    } catch (error: any) {
        console.error('Create RFP error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single RFP with proposals
app.get('/api/rfps/:id', async (req: Request, res: Response) => {

    const id = req.params.id;
    if (!id) {
        return res.status(400).json({ error: 'id required' });
    }
    try {
        const rfp = await prisma.rFP.findUnique({
            where: { id },
            include: {
                proposals: {
                    include: {
                        vendor: true,
                    },
                },
                vendors: {
                    include: {
                        vendor: true,
                    },
                },
            },
        });

        if (!rfp) {
            return res.status(404).json({ error: 'RFP not found' });
        }

        res.json(rfp);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/rfps/:id/send', async (req: Request, res: Response) => {
    try {
        const { vendorEmails } = req.body;
        if (!vendorEmails || !Array.isArray(vendorEmails) || !req.params.id) {
            return res.status(400).json({ error: 'vendorEmails and RFP id required' });
        }
        const rfp = await prisma.rFP.findUnique({ where: { id: req.params.id } });
        if (!rfp) {
            return res.status(404).json({ error: 'RFP not found' });
        }

        // Engine handles email sending via AI function calls
        const response = await axios.post(`${ENGINE_URL}/api/send-rfp`, {
            rfpId: rfp.id,
            vendorEmails
        });

        res.json(response.data);
    } catch (error: any) {
        console.error('Send RFP error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== VENDOR ENDPOINTS ==========

// Create vendor
app.post('/api/vendors', async (req: Request, res: Response) => {
    try {
        const { name, email, phone, address } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'name and email required' });
        }

        const vendor = await prisma.vendor.create({
            data: {
                name,
                email,
                phone: phone || undefined,
                address: address || undefined,
            },
        });

        res.json({ success: true, vendor });
    } catch (error: any) {
        console.error('Create vendor error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all vendors
app.get('/api/vendors', async (req: Request, res: Response) => {
    try {
        const vendors = await prisma.vendor.findMany({
            orderBy: { name: 'asc' },
        });
        res.json(vendors);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


// ========== PROPOSAL ENDPOINTS ==========

app.post('/api/chat', async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;
        const response = await axios.post(`${ENGINE_URL}/api/chat`, {
            message,
            history: history || []
        });
        res.json(response.data);
    } catch (error: any) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/proposals/:id/status', async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        if (!status || !req.params.id) {
            return res.status(400).json({ error: 'status and id required' });
        }
        const proposal = await prisma.proposal.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ success: true, proposal });
    } catch (error: any) {
        console.error('Update proposal status error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/rfps/:id/status', async (req: Request, res: Response) => {
    try {
        const { status } = req.body;
        if (!status || !req.params.id) {
            return res.status(400).json({ error: 'status and id required' });
        }
        const rfp = await prisma.rFP.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ success: true, rfp });
    } catch (error: any) {
        console.error('Update RFP status error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Gateway running port ${PORT}`);
});
